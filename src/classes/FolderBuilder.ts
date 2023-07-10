import { AxiosError } from "axios"

import { MantarayNode } from "../handlers"
import { encodePath } from "../utils"
import {
  bytesReferenceToReference,
  EntryMetadataContentTypeKey,
  EntryMetadataFilenameKey,
  getReferenceFromData,
  referenceToBytesReference,
  RootPath,
  WebsiteIndexDocumentSuffixKey,
  ZeroHashReference,
} from "../utils/mantaray"
import Queue from "./Queue"

import type { BatchId, BeeClient } from "../clients"

export interface FolderBuilderConfig {
  beeClient: BeeClient
  batchId: BatchId
  concurrentTasks?: number
  indexDocument?: string
}

export default abstract class FolderBuilder {
  protected node = new MantarayNode()
  protected queue: Queue
  protected bytesTotal = 0
  protected bytesProgress = 0
  protected abortController = new AbortController()
  protected errored = false

  public onProgress?: (percent: number) => void

  constructor(protected config: FolderBuilderConfig) {
    this.queue = new Queue(config.concurrentTasks ?? 10)
  }

  addFile(data: Uint8Array, filename: string, path: string, contentType: string | null) {
    const entry = this.enqueueData(data)
    this.node.addFork(encodePath(path), entry, {
      [EntryMetadataFilenameKey]: filename,
      ...(contentType ? { [EntryMetadataContentTypeKey]: contentType } : {}),
    })
  }

  async save() {
    this.node.addFork(encodePath(RootPath), ZeroHashReference, {
      [WebsiteIndexDocumentSuffixKey]: "index.html",
    })
    const reference = await this.node.save(async data => {
      return this.enqueueData(data)
    })
    await this.queue.drain()

    if (this.errored) {
      throw new Error("Upload failed")
    }

    return bytesReferenceToReference(reference)
  }

  private enqueueData(data: Uint8Array) {
    const reference = getReferenceFromData(data)
    this.queue.enqueue(async () => {
      if (this.abortController.signal.aborted) return

      try {
        await this.config.beeClient.bytes.upload(data, {
          batchId: this.config.batchId,
          signal: this.abortController.signal,
          onUploadProgress: completion => {
            this.bytesProgress += (completion / 100) * data.length

            const progress =
              this.bytesTotal === 0 ? 0 : (this.bytesProgress / this.bytesTotal) * 100
            this.onProgress?.(progress)
          },
        })
      } catch (error) {
        this.errored = true

        if (error instanceof AxiosError) {
          const statusCode = error.response?.status ?? 400
          if (statusCode >= 400) {
            // Unauthorized, kill the queue
            this.kill()
          }
        }
      }
    })
    return referenceToBytesReference(reference)
  }

  private kill() {
    this.abortController.abort()
  }
}
