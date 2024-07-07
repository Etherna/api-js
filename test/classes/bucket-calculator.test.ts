import { makeChunk, makeChunkedFile } from "@fairdatasociety/bmt-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { BeeProcess, createPostageBatch, startBee } from "../__utils__/bee-process"
import { BucketCalculator } from "../../src/classes"
import { BatchId, BeeClient } from "../../src/clients"
import { BytesReference } from "../../src/handlers"
import { bytesReferenceToReference } from "../../src/utils"

describe("bucket", () => {
  const privateKey = "f6379d2f0229ca418812cf65cc5e26e727c968912442721139b74455dd7a0095"
  const beeUrl = "http://localhost:1633"

  let bee: BeeClient
  let beeProcess: BeeProcess

  beforeAll(async () => {
    // beeProcess = await startBee()
    bee = new BeeClient(beeUrl, {
      signer: privateKey,
    })
  })

  afterAll(() => {
    beeProcess?.kill()
  })

  it("should match bukets when uploading a single file", async () => {
    const batchId = "fe1d2e2a6c32b42dbb539923658169ec65d8e877b9a310a7e012c8e44591cdf6" as BatchId //await bee.stamps.create(17, "10000000")

    const data = new Uint8Array(1024 * 10).fill(0).map(() => Math.floor(Math.random() * 256))

    const bucket = new BucketCalculator()

    const bmt = makeChunkedFile(data).bmt()

    for (const chunk of bmt.flat()) {
      const reference = bytesReferenceToReference(chunk.address() as BytesReference)
      bucket.add(reference)
    }

    const { buckets } = await bee.stamps.downloadBuckets(batchId)

    console.log(buckets.filter((b) => b.collisions > 0))
    console.log(bucket.bucketCollisions)
  })
})
