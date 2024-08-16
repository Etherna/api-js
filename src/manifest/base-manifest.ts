import { makeChunkedFile } from "@fairdatasociety/bmt-js"

import { ChunksUploader, EthernaSdkError, MantarayNode, Queue, StampCalculator } from "@/classes"
import {
  EmptyReference,
  MANIFEST_DETAILS_PATH,
  MANIFEST_PREVIEW_PATH,
  MantarayEntryMetadataContentTypeKey,
  MantarayEntryMetadataFilenameKey,
  MantarayRootPath,
  MantarayWebsiteIndexDocumentSuffixKey,
  STAMPS_DEPTH_MIN,
  ZeroHashReference,
} from "@/consts"
import {
  bytesReferenceToReference,
  encodePath,
  isZeroBytesReference,
  jsonToReference,
  referenceToBytesReference,
} from "@/utils"

import type { BucketCollisions } from "@/classes"
import type { BeeClient, RequestDownloadOptions, RequestUploadOptions } from "@/clients"
import type { BaseProcessor } from "@/processors"
import type { ImageProcessor } from "@/processors/image-processor"
import type { VideoProcessor } from "@/processors/video-processor"
import type { BatchId, BytesReference, Reference } from "@/types/swarm"

export interface BaseManifestOptions {
  beeClient: BeeClient
}

export interface BaseManifestDownloadOptions extends RequestDownloadOptions {
  signal?: AbortSignal
}

export interface BaseMantarayManifestDownloadOptions extends BaseManifestDownloadOptions {
  mode: "preview" | "details" | "full"
}

export interface BaseManifestUploadOptions extends Omit<RequestUploadOptions, "batchId"> {
  batchId?: BatchId
  batchLabelQuery?: string
}

export class BaseManifest {
  protected _reference = EmptyReference
  protected _batchId?: BatchId
  protected _isDirty = false

  protected beeClient: BeeClient
  protected batchIdCollision?: BucketCollisions
  protected manifestBucketCalculator = new StampCalculator()

  constructor(init: unknown, options: BaseManifestOptions) {
    this.beeClient = options.beeClient
  }

  public get reference() {
    return this._reference
  }

  public get batchId() {
    return this._batchId
  }

  public get isDirty() {
    return this._isDirty
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public download(options?: BaseManifestDownloadOptions): Promise<unknown> {
    return Promise.resolve()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public upload(options?: BaseManifestUploadOptions): Promise<unknown> {
    return Promise.resolve()
  }

  /**
   * Set batchId or find the best batchId for the upload then laods the buckets
   * collsions map and verifies that the batchId is usable
   * for the upload.
   *
   * @param batchId The batch id to use for the upload (leave blank to find the best batch id)
   * @param batchLabelQuery The label query to use for finding the best batch id
   */
  public async prepareForUpload(batchId?: BatchId, batchLabelQuery?: string): Promise<void> {
    if (batchId !== this.batchId) {
      this._batchId = batchId
      this.batchIdCollision = undefined
    }

    if (this.batchId && !this.batchIdCollision) {
      const buckets = await this.beeClient.stamps.downloadBuckets(this.batchId)
      const batchStampCalculator = new StampCalculator(buckets.buckets)

      const calculator = StampCalculator.merge(batchStampCalculator, this.manifestBucketCalculator)

      if (calculator.minDepth > buckets.depth) {
        throw new EthernaSdkError(
          "BUCKET_FILLED",
          "Postage batch can't be used. All buckets are filled.",
        )
      }

      this.batchIdCollision = batchStampCalculator.bucketCollisions
    }

    if (!this.batchId) {
      await this.loadBestBatchId({ batchLabelQuery })
    }
  }

  protected async loadBestBatchId(
    options?: Omit<BaseManifestUploadOptions, "batchId">,
  ): Promise<BatchId> {
    const batchId = await this.beeClient.stamps.fetchBestBatchId({
      minDepth: STAMPS_DEPTH_MIN,
      collisions: this.manifestBucketCalculator.bucketCollisions,
      headers: options?.headers,
      labelQuery: options?.batchLabelQuery,
      signal: options?.signal,
      timeout: options?.timeout,
    })

    if (!batchId) {
      throw new EthernaSdkError("MISSING_BATCH_ID", "No usable postage batch found")
    }

    this._batchId = batchId
    this.batchIdCollision = batchId.collisions

    return batchId
  }
}

export class BaseMantarayManifest extends BaseManifest {
  protected _node: MantarayNode
  protected _rootManifest = EmptyReference
  protected _preview: Record<string, unknown> = {}
  protected _details: Record<string, unknown> = {}
  protected _hasLoadedPreview = false
  protected _hasLoadedDetails = false
  protected queue = new Queue({ drainMode: "manual" })

  constructor(init: unknown, options: BaseManifestOptions) {
    super(init, options)

    this._node = new MantarayNode()
  }

  public get serialized(): unknown {
    return Object.freeze({
      reference: this.reference,
      preview: this._preview,
      details: this._details,
    })
  }

  public get node() {
    return this._node
  }

  public get rootManifest() {
    return this._rootManifest
  }

  public get hasLoadedPreview() {
    return this._hasLoadedPreview
  }

  public get hasLoadedDetails() {
    return this._hasLoadedDetails
  }

  public override download(_options: BaseMantarayManifestDownloadOptions): Promise<unknown> {
    return Promise.resolve()
  }

  public async loadNode(): Promise<void> {
    if (isZeroBytesReference(this.reference)) {
      throw new EthernaSdkError(
        "MISSING_REFERENCE",
        "Manifest reference is empty. Run 'download()' first.",
      )
    }

    await this.node.load(
      (reference) => this.beeClient.bytes.download(bytesReferenceToReference(reference)),
      referenceToBytesReference(this.reference),
    )
  }

  protected proxyHandler() {
    return {
      get: (target: Record<string, unknown>, p: string | symbol, receiver: unknown) => {
        const value = Reflect.get(target, p, receiver)
        if (value && typeof value === "object") {
          return new Proxy(value, this.proxyHandler())
        } else {
          return value
        }
      },
      set: (target, p, newValue, receiver) => {
        this._isDirty = true
        return Reflect.set(target, p, newValue, receiver)
      },
    } satisfies ProxyHandler<Record<string, unknown>>
  }

  protected setPreviewProxy(preview: typeof this._preview) {
    this._preview = new Proxy(preview, this.proxyHandler())
  }

  protected setDetailsProxy(details: typeof this._details) {
    this._details = new Proxy(details, this.proxyHandler())
  }

  protected addFile(
    entry: Reference,
    path: string,
    meta: { filename: string; contentType?: string },
  ) {
    this.node.addFork(encodePath(path), referenceToBytesReference(entry), {
      [MantarayEntryMetadataFilenameKey]: meta.filename,
      [MantarayEntryMetadataContentTypeKey]: meta.contentType ?? "application/octet-stream",
    })
  }

  protected removeFile(path: string) {
    this.node.removePath(encodePath(path))
  }

  protected updateNodeDefaultEntries() {
    this.node.addFork(encodePath(MantarayRootPath), ZeroHashReference, {
      [MantarayWebsiteIndexDocumentSuffixKey]: MANIFEST_PREVIEW_PATH,
    })
    this.node.addFork(encodePath(MANIFEST_PREVIEW_PATH), jsonToReference(this._preview), {
      [MantarayEntryMetadataContentTypeKey]: "application/json",
      [MantarayEntryMetadataFilenameKey]: `${MANIFEST_PREVIEW_PATH}.json`,
    })
    this.node.addFork(encodePath(MANIFEST_DETAILS_PATH), jsonToReference(this._details), {
      [MantarayEntryMetadataContentTypeKey]: "application/json",
      [MantarayEntryMetadataFilenameKey]: `${MANIFEST_DETAILS_PATH}.json`,
    })
  }

  protected enqueueData(data: Uint8Array, options?: BaseManifestUploadOptions) {
    const chunkedFile = makeChunkedFile(data)

    // add collisions to the stamp calculator
    chunkedFile
      .bmt()
      .flat()
      .forEach((chunk) =>
        this.manifestBucketCalculator.add(bytesReferenceToReference(chunk.address())),
      )

    this.queue.enqueue(async () => {
      if (!this.batchId) {
        throw new EthernaSdkError(
          "MISSING_BATCH_ID",
          "No usable postage batch found. Run prepareForUpload() first.",
        )
      }
      const chunksUploader = new ChunksUploader({
        beeClient: this.beeClient,
      })
      chunksUploader.append(chunkedFile)
      chunksUploader.resume({
        batchId: this.batchId,
        signal: options?.signal,
        timeout: options?.timeout,
      })
      await chunksUploader.drain()
    })
    return chunkedFile.address() as BytesReference
  }

  protected importImageProcessor(imageProcessor: ImageProcessor) {
    if (!imageProcessor.image) {
      throw new EthernaSdkError("BAD_REQUEST", "Image not processed. Run 'process' method first")
    }

    this.enqueueProcessor(imageProcessor)

    imageProcessor.processorOutputs.forEach((output) => {
      this.addFile(output.entryAddress, output.path, output.metadata)
    })
  }

  protected importVideoProcessor(videoProcessor: VideoProcessor) {
    if (!videoProcessor.video) {
      throw new EthernaSdkError("BAD_REQUEST", "Video not processed. Run 'process' method first")
    }

    this.enqueueProcessor(videoProcessor)

    videoProcessor.processorOutputs.forEach((output) => {
      this.addFile(output.entryAddress, output.path, output.metadata)
    })
  }

  protected enqueueProcessor(processor: BaseProcessor, options?: BaseManifestUploadOptions) {
    // merge collisions
    this.manifestBucketCalculator.merge(processor.stampCalculator)

    if (!processor.isFullyUploaded) {
      this.queue.enqueue(async () => {
        if (!this.batchId) {
          throw new EthernaSdkError(
            "MISSING_BATCH_ID",
            "No usable postage batch found. Run prepareForUpload() first.",
          )
        }

        await processor.upload({
          beeClient: this.beeClient,
          batchId: this.batchId,
          ...options,
        })
      })
    }
  }
}
