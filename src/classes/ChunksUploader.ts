import { makeChunkedFile } from "@fairdatasociety/bmt-js/src/file"

import { bytesReferenceToReference, getReferenceFromData, MAX_CHUNK_PAYLOAD_SIZE } from "../utils"
import { splitArrayInChunks } from "../utils/array"

import type { BeeClient, RequestUploadOptions } from "../clients"
import type { BytesReference } from "../handlers"

type ChunksUploadOptions = RequestUploadOptions & {
  currentLevel?: number
  currentChunk?: number
  deferred?: boolean
  onBytesUploaded?(bytes: number): void
}

export default class ChunksUploader {
  constructor(
    public beeClient: BeeClient,
    public concurrentChunks = 10
  ) {}

  async uploadData(data: Uint8Array, options: ChunksUploadOptions) {
    if (this.concurrentChunks === -1) {
      // disable chunks upload
      const { reference } = await this.beeClient.bytes.upload(data, options)
      return reference
    }

    let tag: number | undefined = undefined
    if (options.deferred) {
      const tagResp = await this.beeClient.tags.create(getReferenceFromData(data))
      tag = tagResp.uid
    }

    const chunkedFile = makeChunkedFile(data)
    const levels = chunkedFile.bmt()
    for (const level of levels) {
      for (const chunks of splitArrayInChunks(level, this.concurrentChunks)) {
        await Promise.all(
          chunks.map(chunk =>
            this.beeClient.chunk.upload(Uint8Array.from([...chunk.span(), ...chunk.payload]), {
              ...options,
              tag,
            })
          )
        )

        options.onBytesUploaded?.(chunks.length * MAX_CHUNK_PAYLOAD_SIZE)
      }
    }
    return bytesReferenceToReference(chunkedFile.address() as BytesReference)
  }
}
