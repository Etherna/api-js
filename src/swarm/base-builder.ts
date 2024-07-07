import { makeChunkedFile } from "@fairdatasociety/bmt-js"

import { Queue } from "../classes"
import { BatchId, BeeClient, Reference } from "../clients"
import { BytesReference, MantarayNode } from "../handlers"
import {
  EmptyReference,
  encodePath,
  EntryMetadataContentTypeKey,
  EntryMetadataFilenameKey,
  getReferenceFromData,
  referenceToBytesReference,
} from "../utils"

export interface BaseBuilderOptions {
  beeClient: BeeClient
  batchId: BatchId
}

export class BaseBuilder {
  reference: Reference
  node: MantarayNode

  private queue: Queue
  private abortController: AbortController

  constructor(protected options: BaseBuilderOptions) {
    this.queue = new Queue()
    this.node = new MantarayNode()
    this.abortController = new AbortController()
    this.reference = EmptyReference

    this.updateNode()
  }

  public stop() {
    this.abortController.abort()
    this.abortController = new AbortController()
  }

  protected enqueueData(data: Uint8Array) {
    const { beeClient, batchId } = this.options
    const signal = this.abortController.signal

    const chunkedFile = makeChunkedFile(data)
    this.queue.enqueue(async () => {
      await beeClient.bytes.upload(data, { batchId, signal })
    })
    return chunkedFile.address() as BytesReference
  }

  protected addFile(
    data: Uint8Array,
    path: string,
    meta?: {
      filename?: string
      contentType?: string | null
    },
  ) {
    this.node.addFork(encodePath(path), referenceToBytesReference(getReferenceFromData(data)), {
      ...(meta?.filename ? { [EntryMetadataFilenameKey]: meta?.filename } : {}),
      ...(meta?.contentType ? { [EntryMetadataContentTypeKey]: meta?.contentType } : {}),
    })
    this.updateNode()
  }

  protected removeFile(path: string) {
    this.node.removePath(encodePath(path))
  }

  protected updateNode() {
    // to be implemented by subclasses
  }
}
