import { ChunksUploader, EthernaSdkError, StampCalculator } from "@/classes"

import type { BeeClient, RequestUploadOptions } from "@/clients"
import type { BatchId, Reference } from "@/types/swarm"

export interface BaseProcessorUploadOptions extends Omit<RequestUploadOptions, "batchId"> {
  beeClient: BeeClient
  batchId: BatchId
  deferred?: boolean
  concurrentChunks?: number
}

export interface ProcessorOutput {
  path: string
  contentAddress: Reference
}

export class BaseProcessor {
  protected input: File | ArrayBuffer | Uint8Array
  protected uploadOptions?: BaseProcessorUploadOptions
  public uploader?: ChunksUploader
  public isProcessed = false
  public isFullyUploaded = false
  public stampCalculator = new StampCalculator()

  constructor(input: File | ArrayBuffer | Uint8Array) {
    this.input = input
  }

  public process(options?: unknown): Promise<ProcessorOutput[]> {
    return Promise.resolve([])
  }

  public async upload(options: BaseProcessorUploadOptions): Promise<void> {
    this.uploadOptions = options
    this.uploader = new ChunksUploader({
      beeClient: options.beeClient,
      concurrentChunks: options.concurrentChunks,
    })

    const batchId =
      options.batchId ??
      (await this.uploadOptions.beeClient.stamps.fetchBestBatchId({
        collisions: this.stampCalculator.bucketCollisions,
      }))

    if (!batchId) {
      throw new EthernaSdkError("MISSING_BATCH_ID", "No batchId found")
    }

    this.uploadOptions.batchId = batchId
  }

  public async resume(): Promise<void> {
    if (!this.uploadOptions || !this.uploader) {
      throw new EthernaSdkError("BAD_REQUEST", ".resume() must be called after .upload()")
    }

    if (!this.uploadOptions.batchId) {
      throw new EthernaSdkError("MISSING_BATCH_ID", "Cannot resume upload without a batchId")
    }

    this.uploader.resume({
      batchId: this.uploadOptions.batchId,
    })

    await this.uploader.drain()
  }
}
