import { makeChunkedFile } from "@fairdatasociety/bmt-js"
import { immerable } from "immer"

import Queue from "../../handlers/Queue"
import { MantarayFork, MantarayNode } from "../../handlers/mantaray"
import { beeReference, beeSafeReference, ethSafeAddress } from "../../schemas/base"
import { imageType } from "../../schemas/image"
import { MantarayNodeSchema } from "../../schemas/mantaray"
import {
  VideoBuilderSchema,
  VideoDetailsRawSchema,
  VideoPreviewRawSchema,
} from "../../schemas/video"
import { VideoDeserializer, VideoSerializer } from "../../serializers"
import { isValidReference } from "../../utils"
import {
  jsonToReference,
  encodePath,
  EntryMetadataContentTypeKey,
  EntryMetadataFilenameKey,
  getReferenceFromData,
  RootPath,
  WebsiteIndexDocumentSuffixKey,
  ZeroHashReference,
  referenceToBytesReference,
  bytesReferenceToReference,
  getBzzNodeInfo,
  isZeroBytesReference,
} from "../../utils/mantaray"
import { getVideoMeta } from "../../utils/media"

import type {
  ImageType,
  VideoDetails,
  VideoPreview,
  VideoQuality,
  MantarayNode as MantarayNodeType,
} from "../.."
import type { BatchId, BeeClient, Reference } from "../../clients"
import type { ImageRawSource } from "../../schemas/image"
import type {
  VideoDetailsRaw,
  VideoPreviewRaw,
  VideoSourceRaw,
  Video,
  SerializedVideoBuilder,
} from "../../schemas/video"

interface VideoBuilderRequestOptions {
  beeClient: BeeClient
  batchId?: BatchId
  signal?: AbortSignal
}

export const VIDEO_PREVIEW_META_PATH = "preview"
export const VIDEO_DETAILS_META_PATH = "details"

export default class VideoBuilder {
  reference: Reference
  previewMeta: VideoPreviewRaw
  detailsMeta: VideoDetailsRaw
  node: MantarayNode

  private queue: Queue

  constructor() {
    this.previewMeta = {
      title: "",
      duration: 0,
      thumbnail: null,
      ownerAddress: "0x0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    this.detailsMeta = {
      description: "",
      aspectRatio: null,
      sources: [],
      batchId: null,
    }
    this.queue = new Queue()
    this.node = new MantarayNode()
    this.reference = bytesReferenceToReference(ZeroHashReference)

    this.updateNode()
  }

  static Immerable: typeof VideoBuilder

  static unimmerable(instance: VideoBuilder): VideoBuilder {
    const newInstance = new VideoBuilder()
    newInstance.deserialize(instance.serialize())
    return newInstance
  }

  // methods

  initialize(ownerAddress: string, previewMeta?: VideoPreview, detailsMeta?: VideoDetails) {
    this.reference = (previewMeta?.reference as Reference) || this.reference
    this.previewMeta = previewMeta ? VideoPreviewRawSchema.parse(previewMeta) : this.previewMeta
    this.detailsMeta = detailsMeta ? VideoDetailsRawSchema.parse(detailsMeta) : this.detailsMeta
    this.previewMeta.ownerAddress = ownerAddress
    this.updateNode()
  }

  async loadNode(opts: VideoBuilderRequestOptions): Promise<void> {
    if (!isZeroBytesReference(this.reference)) {
      await this.node.load(async reference => {
        const data = await opts.beeClient.bytes.download(bytesReferenceToReference(reference), {
          signal: opts.signal,
        })
        return data
      }, referenceToBytesReference(this.reference))
    }

    if (opts.signal?.aborted) return

    const videoReferences = this.detailsMeta.sources
      .map(s => (s.type === "mp4" ? s.reference : null))
      .filter(ref => ref && isValidReference(ref)) as Reference[]
    const thumbReferences = (this.previewMeta.thumbnail?.sources ?? [])
      .map(source => source.reference)
      .filter(ref => ref && isValidReference(ref)) as Reference[]

    const references = [...videoReferences, ...thumbReferences]

    const bytesReferences = await Promise.all(
      references.map(ref => getBzzNodeInfo(ref, opts.beeClient, opts.signal))
    )

    if (opts.signal?.aborted) return

    if (this.previewMeta.thumbnail) {
      this.previewMeta.thumbnail.sources = this.previewMeta.thumbnail.sources.map(source => {
        if (source.path) return source

        const reference = references.findIndex(ref => ref === source.reference)
        const contentType = bytesReferences[reference]?.contentType
        const typeParse = imageType.safeParse(contentType?.split("/")[1])
        const type = typeParse.success ? typeParse.data : "jpeg"
        const bytesReference = bytesReferences[reference]?.entry

        if (!bytesReference) {
          throw new Error(`Could not find raw reference for image source: '${source.reference}'`)
        }

        const newSource = this.addThumbSource(
          source.width,
          type,
          bytesReferenceToReference(bytesReference)
        )
        return newSource
      })
    }
    this.detailsMeta.sources = this.detailsMeta.sources.map(source => {
      if (source.path || source.type !== "mp4") return source

      const reference = references.findIndex(ref => ref === source.reference)
      const bytesReference = bytesReferences[reference]?.entry

      if (!bytesReference) {
        throw new Error(`Could not find raw reference for video source: '${source.reference}'`)
      }

      const newSource = this.addVideoSource(
        source.quality,
        source.size,
        bytesReferenceToReference(bytesReference)
      )
      return newSource
    })
  }

  async saveNode(opts: VideoBuilderRequestOptions): Promise<Reference> {
    const batchId = (this.detailsMeta.batchId ?? opts.batchId) as BatchId | undefined

    if (!batchId) throw new Error("BatchId is missing")

    // update timestamps
    this.previewMeta.createdAt = this.previewMeta.createdAt || Date.now()
    this.previewMeta.updatedAt = Date.now()

    // 1. deserialize with dummy params
    // 2. re-serialize in a raw format
    // validation: raw -> parsed -> raw
    this.previewMeta = JSON.parse(
      new VideoSerializer().serializePreview(
        new VideoDeserializer("http://doesntmatter.com").deserializePreview(
          JSON.stringify(this.previewMeta),
          { reference: "0".repeat(64) }
        )
      )
    )
    this.detailsMeta = JSON.parse(
      new VideoSerializer().serializeDetails(
        new VideoDeserializer("http://doesntmatter.com").deserializeDetails(
          JSON.stringify(this.detailsMeta),
          { reference: "0".repeat(64) }
        )
      )
    )

    this.updateNode()

    this.enqueueData(
      new TextEncoder().encode(JSON.stringify(this.previewMeta)),
      opts.beeClient,
      batchId
    )
    this.enqueueData(
      new TextEncoder().encode(JSON.stringify(this.detailsMeta)),
      opts.beeClient,
      batchId
    )

    const reference = await this.node.save(async data => {
      return this.enqueueData(data, opts.beeClient, batchId, opts.signal)
    })
    await this.queue.drain()

    this.reference = bytesReferenceToReference(reference)

    return this.reference
  }

  async addMp4Source(data: Uint8Array) {
    const meta = await getVideoMeta(data)
    const quality: VideoQuality = `${meta.height}p`
    const exists = this.detailsMeta.sources.some(s => s.type === "mp4" && s.quality === quality)

    if (exists) {
      throw new Error(`Video source with quality '${quality}' already exists`)
    }

    if (!this.previewMeta.duration) {
      this.previewMeta.duration = meta.duration
    }
    if (!this.detailsMeta.aspectRatio) {
      this.detailsMeta.aspectRatio = meta.width / meta.height
    }

    const source = this.addVideoSource(quality, data.length, getReferenceFromData(data))
    this.detailsMeta.sources.push(source)
  }

  async addThumbnailSource(data: Uint8Array, width: number, type: ImageType) {
    if (!this.previewMeta.thumbnail) {
      throw new Error("Thumbnail is missing")
    }

    const source = this.addThumbSource(width, type, getReferenceFromData(data))
    this.previewMeta.thumbnail.sources.push(source)
  }

  removeMp4Source(quality: VideoQuality) {
    const path = this.getVideoPath(quality)
    this.node.removePath(encodePath(path))
    this.detailsMeta.sources = this.detailsMeta.sources.filter(
      s => s.type === "mp4" && s.quality !== quality
    )
    this.updateNode()
  }

  removeThumbnail() {
    for (const source of this.previewMeta.thumbnail?.sources ?? []) {
      const path = this.getThumbPath(source.width, source.type)
      this.node.removePath(encodePath(path))
    }
    this.previewMeta.thumbnail = null
    this.updateNode()
  }

  getVideo(beeUrl: string): Video {
    const preview = new VideoDeserializer(beeUrl).deserializePreview(
      JSON.stringify({
        ...this.previewMeta,
        ownerAddress: ethSafeAddress.parse(this.previewMeta.ownerAddress),
      }),
      {
        reference: this.reference,
      }
    )
    const details = new VideoDeserializer(beeUrl).deserializeDetails(
      JSON.stringify({
        ...this.detailsMeta,
        batchId: beeSafeReference.parse(this.detailsMeta.batchId),
        sources:
          this.detailsMeta.sources.length > 0
            ? this.detailsMeta.sources
            : [
                {
                  type: "mp4",
                  quality: "0p",
                  size: 0,
                  reference: "0".repeat(64),
                },
              ],
      }),
      {
        reference: this.reference,
      }
    )

    return {
      reference: this.reference,
      preview,
      details,
    }
  }

  serialize(): SerializedVideoBuilder {
    return {
      reference: this.reference,
      previewMeta: this.previewMeta,
      detailsMeta: this.detailsMeta,
      node: MantarayNodeSchema.parse(this.node.readable),
    }
  }

  deserialize(value: any) {
    const model = VideoBuilderSchema.parse(value)

    this.reference = beeReference.parse(model.reference) as Reference
    this.previewMeta = VideoPreviewRawSchema.parse(model.previewMeta)
    this.detailsMeta = VideoDetailsRawSchema.parse(model.detailsMeta)

    const recursiveLoadNode = (node: MantarayNodeType): MantarayNode => {
      const mantarayNode = new MantarayNode()

      if (node.type) {
        mantarayNode.setType = node.type
      }
      if (node.entry) {
        mantarayNode.setEntry = referenceToBytesReference(node.entry as Reference)
      }
      if (node.contentAddress) {
        mantarayNode.setContentAddress = referenceToBytesReference(node.contentAddress as Reference)
      }
      if (node.metadata) {
        mantarayNode.setMetadata = node.metadata
      }
      if (Object.keys(node.forks).length > 0) {
        mantarayNode.forks = Object.entries(node.forks).reduce((acc, [path, value]) => {
          const fork = new MantarayFork(encodePath(value.prefix), recursiveLoadNode(value.node))
          return {
            ...acc,
            [encodePath(path)[0]!]: fork,
          }
        }, {} as Record<number, MantarayFork>)
      }

      return mantarayNode
    }

    const node = MantarayNodeSchema.parse(model.node)
    this.node = recursiveLoadNode(node)

    return JSON.stringify({
      reference: this.reference,
      previewMeta: this.previewMeta,
      detailsMeta: this.detailsMeta,
      node: this.node.readable,
    })
  }

  // private

  private enqueueData(
    data: Uint8Array,
    beeClient: BeeClient,
    batchId: BatchId,
    signal?: AbortSignal
  ) {
    const chunkedFile = makeChunkedFile(data)
    this.queue.enqueue(async () => {
      await beeClient.bytes.upload(data, { batchId, signal })
    })
    return chunkedFile.address()
  }

  private addVideoSource(quality: VideoQuality, size: number, entry: Reference): VideoSourceRaw {
    const path = this.getVideoPath(quality)

    this.node.addFork(encodePath(path), referenceToBytesReference(entry), {
      [EntryMetadataContentTypeKey]: "video/mp4",
      [EntryMetadataFilenameKey]: `source-${quality}.mp4`,
    })
    this.updateNode()

    return {
      type: "mp4",
      quality,
      size,
      path,
    }
  }

  private addThumbSource(width: number, type: ImageType, entry: Reference): ImageRawSource {
    const path = this.getThumbPath(width, type)

    this.node.addFork(encodePath(path), referenceToBytesReference(entry), {
      [EntryMetadataContentTypeKey]: `image/${type}`,
      [EntryMetadataFilenameKey]: `thumb-${width}.${type}`,
    })
    this.updateNode()

    return {
      type,
      width,
      path,
    }
  }

  private getThumbPath(width: number, type: ImageType) {
    return `thumb/${width}-${type}`
  }

  private getVideoPath(quality: VideoQuality) {
    return `sources/${quality}`
  }

  private updateNode() {
    this.node.addFork(encodePath(RootPath), ZeroHashReference, {
      [WebsiteIndexDocumentSuffixKey]: VIDEO_PREVIEW_META_PATH,
    })
    this.node.addFork(encodePath(VIDEO_PREVIEW_META_PATH), jsonToReference(this.previewMeta), {
      [EntryMetadataContentTypeKey]: "application/json",
      [EntryMetadataFilenameKey]: `${VIDEO_PREVIEW_META_PATH}.json`,
    })
    this.node.addFork(encodePath(VIDEO_DETAILS_META_PATH), jsonToReference(this.detailsMeta), {
      [EntryMetadataContentTypeKey]: "application/json",
      [EntryMetadataFilenameKey]: `${VIDEO_DETAILS_META_PATH}.json`,
    })
  }
}

class ImmerableVideoBuilder extends VideoBuilder {
  [immerable] = true
}

VideoBuilder.Immerable = ImmerableVideoBuilder
