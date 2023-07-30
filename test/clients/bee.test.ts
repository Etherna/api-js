import { etc } from "@noble/secp256k1"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createPostageBatch, startBee } from "../__utils__/bee-process"
import { BeeClient } from "../../src/clients"
import { makeContentAddressedChunk } from "../../src/clients/bee/utils/chunk"
import { keccak256Hash } from "../../src/utils"

import type { BeeProcess } from "../__utils__/bee-process"

describe("bee client", () => {
  const privateKey = "f6379d2f0229ca418812cf65cc5e26e727c968912442721139b74455dd7a0095"
  const message = "Etherna is awesome!"
  const messageData = new TextEncoder().encode(message)
  const socData =
    "08b086a7f24adfa7c484ac56869d9463c873a5b182d147ba2c0041ae9fb015f63d" +
    "3b74bc4d87b75e610b4654efa6220404ebe0f3ec329e4a03e0f3a9375a839f02d9" +
    "14b03cbf6caef4599856103f4aeeac60295c5b8804d6c8724aeb9db579f01b1300" +
    "00000000000045746865726e6120697320617765736f6d6521"
  const socSignature =
    "3d3b74bc4d87b75e610b4654efa6220404ebe0f3ec329e4a03e0f3a9375a839f02d914b03cbf6caef4599856103f4aeeac60295c5b8804d6c8724aeb9db579f01b"
  const username = ""
  const password = "hello"

  let bee: BeeClient
  let beeProcess: BeeProcess
  let batchId: string

  beforeAll(async () => {
    beeProcess = await startBee()
    batchId = await createPostageBatch(beeProcess)
    bee = new BeeClient(beeProcess.url, {
      signer: privateKey,
    })
  })

  afterAll(() => {
    beeProcess?.kill()
  })

  it.concurrent("should authenticate and refresh token", async () => {
    const token = await bee.auth.authenticate(username, password)
    expect(token).not.toBeNull()

    await new Promise(resolve => setTimeout(resolve, 100))

    const newToken = await bee.auth.refreshToken(token)
    expect(newToken).not.toBeNull()
  })

  it.concurrent("should create a single owner chunk", async () => {
    const cac = makeContentAddressedChunk(messageData)
    const identifier = keccak256Hash("etherna")
    const soc = await bee.soc.makeSingleOwnerChunk(cac, identifier)

    expect(etc.bytesToHex(soc.data)).toEqual(socData)
    expect(etc.bytesToHex(soc.signature())).toEqual(socSignature)
  })

  it("should upload a single owner chunk", async () => {
    const identifier = keccak256Hash("etherna")

    const { reference } = await bee.soc.upload(identifier, messageData, {
      batchId,
    })

    expect(reference).length(64)

    const chunkData = await bee.chunk.download(reference)
    const socData = await bee.soc.download(identifier, bee.signer!.address)

    expect(chunkData).toEqual(socData.data)
    expect(etc.bytesToHex(socData.payload())).toEqual(etc.bytesToHex(messageData))
  })

  it("should upload raw data", async () => {
    const { reference } = await bee.bytes.upload(new TextEncoder().encode(message), {
      batchId,
    })

    expect(reference).length(64)

    const data = await bee.bytes.download(reference)

    expect(data.text()).toEqual(message)
  })

  it("should upload a file", async () => {
    const { reference } = await bee.bzz.upload(message, {
      batchId,
      contentType: "text/plain",
    })

    expect(reference).length(64)

    const file = await bee.bzz.download(reference)

    expect(file.data.text()).toEqual(message)
  })

  it("should create a feed", async () => {
    const feedData = { id: "feed", msg: "Hello Etherna" }
    const feedDataSerialized = JSON.stringify(feedData)

    const { reference } = await bee.bzz.upload(feedDataSerialized, {
      batchId,
      contentType: "application/json",
    })

    const feed = bee.feed.makeFeed("topic", bee.signer!.address, "sequence")

    // write
    const feedWriter = bee.feed.makeWriter(feed)
    await feedWriter.upload(reference, { batchId })
    // read
    const feedReader = bee.feed.makeReader(feed)
    const feedDownloadResp = await feedReader.download()

    expect(feedDownloadResp.reference).toEqual(reference)

    const feedDataDownloaded = await bee.bzz.download(feedDownloadResp.reference)

    expect(feedDataDownloaded.data.json()).toEqual(feedData)
  })

  it("should create an epoch feed", async () => {
    const feedData = { id: "feed", msg: "Hello Etherna" }
    const feedDataSerialized = JSON.stringify(feedData)

    const { reference } = await bee.bzz.upload(feedDataSerialized, {
      batchId,
      contentType: "application/json",
    })

    const feed = bee.feed.makeFeed("topic", bee.signer!.address, "epoch")

    // write
    const feedWriter = bee.feed.makeWriter(feed)
    await feedWriter.upload(reference, { batchId })
    // read
    const feedReader = bee.feed.makeReader(feed)
    const feedDownloadResp = await feedReader.download()

    expect(feedDownloadResp.reference).toEqual(reference)

    const feedDataDownloaded = await bee.bzz.download(feedDownloadResp.reference)

    expect(feedDataDownloaded.data.json()).toEqual(feedData)
  })

  it("should make a correct feed root manifest", async () => {
    const feedSequence = bee.feed.makeFeed("topic", bee.signer!.address, "sequence")
    const feedEpoch = bee.feed.makeFeed("topic", bee.signer!.address, "epoch")

    const sequenceRootManifest = await bee.feed.createRootManifest(feedSequence, { batchId })
    const epochRootManifest = await bee.feed.createRootManifest(feedEpoch, { batchId })

    const { reference: madeSequenceRootManifest } = await bee.feed.makeRootManifest(feedSequence)
    const { reference: madeEpochRootManifest } = await bee.feed.makeRootManifest(feedEpoch)

    expect(sequenceRootManifest).toEqual(madeSequenceRootManifest)
    // FIXME: epoch not yet supported: https://github.com/ethersphere/bee/blob/master/pkg/api/feed.go#L213
    // expect(epochRootManifest).toEqual(madeEpochRootManifest)
  })

  it("should parse a feed from the root manifest", async () => {
    const feedSequence = bee.feed.makeFeed("topic", bee.signer!.address, "sequence")
    const feedEpoch = bee.feed.makeFeed("topic", bee.signer!.address, "epoch")

    const madeSequenceRootManifest = await bee.feed.makeRootManifest(feedSequence)
    const madeEpochRootManifest = await bee.feed.makeRootManifest(feedEpoch)

    await madeSequenceRootManifest.save({ batchId })
    await madeEpochRootManifest.save({ batchId })

    const parsedSequenceFeed = await bee.feed.parseFeedFromRootManifest(
      madeSequenceRootManifest.reference
    )
    const parsedEpochFeed = await bee.feed.parseFeedFromRootManifest(
      madeEpochRootManifest.reference
    )

    expect(parsedSequenceFeed).toEqual(feedSequence)
    expect(parsedEpochFeed).toEqual(feedEpoch)
  })

  it.concurrent("should create a postage stamp", async () => {
    const batchId = await bee.stamps.create(20, "1000000")

    expect(batchId).toHaveLength(64)

    const batch = await bee.stamps.download(batchId)

    expect(batch.depth).toEqual(20)
    expect(batch.amount).toEqual("1000000")
  })

  // it("should topup a postage stamp", async () => {
  //   const batchId = await bee.stamps.create(20, "1000000")
  //   const batch = await bee.stamps.download(batchId)
  //   const ok = await bee.stamps.topup(batchId, "1000")

  //   expect(ok).toBeTruthy()

  //   const dilutedBatch = await bee.stamps.download(batchId)

  //   // expect(batch.amount).toEqual("1001000")
  //   expect(dilutedBatch.batchTTL).toBeGreaterThan(batch.batchTTL)
  // })

  // it("should dilute a postage stamp", async () => {
  //   const batchId = await bee.stamps.create(20, "1000000")
  //   // const batch = await bee.stamps.download(batchId)
  //   const ok = await bee.stamps.dilute(batchId, 21)

  //   expect(ok).toBeTruthy()

  //   // const dilutedBatch = await bee.stamps.download(batchId)

  //   // Depth is not updating in dev mode:
  //   // https://github.com/ethersphere/bee/issues/3092
  //   // expect(batch.depth).toEqual(21)
  //   // expect(dilutedBatch.batchTTL).toBeLessThan(batch.batchTTL)
  // })

  it.concurrent.fails("should fetch the current price", async () => {
    // chainstate in dev-mode fails

    const price = await bee.chainstate.getCurrentPrice()

    expect(price).toBeDefined()
    expect(price).greaterThan(0)
  })
})
