import { utils } from "@noble/secp256k1"
import { describe, it, expect, beforeAll, afterAll } from "vitest"

import { BeeClient } from "../../src/clients"
import { makeContentAddressedChunk } from "../../src/clients/bee/utils/chunk"
import { keccak256Hash } from "../../src/clients/bee/utils/hash"
import { createPostaBatch, startBee } from "../__utils__/bee-process"

import type { ChildProcess } from "../__utils__/bee-process"

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

  const bee = new BeeClient("http://localhost:1633", {
    signer: privateKey,
  })

  let beeProcess: ChildProcess
  let batchId: string

  beforeAll(async () => {
    beeProcess = await startBee()
    batchId = await createPostaBatch()
  })

  afterAll(() => {
    beeProcess?.kill()
  })

  it("should authenticate and refresh token", async () => {
    const token = await bee.auth.authenticate(username, password)
    expect(token).toBeDefined()

    const newToken = await bee.auth.refreshToken(token)
    expect(newToken).toBeDefined()
  })

  it("should create a single owner chunk", async () => {
    const cac = makeContentAddressedChunk(messageData)
    const identifier = keccak256Hash("etherna")
    const soc = await bee.soc.makeSingleOwnerChunk(cac, identifier)

    expect(utils.bytesToHex(soc.data)).toEqual(socData)
    expect(utils.bytesToHex(soc.signature())).toEqual(socSignature)
  })

  it("should upload a single owner chunk", async () => {
    const identifier = keccak256Hash("etherna")

    const { reference } = await bee.soc.upload(identifier, messageData, {
      batchId,
    })

    expect(reference).length(64)

    const socData = await bee.soc.download(identifier, bee.signer!.address)

    expect(utils.bytesToHex(socData.payload())).toEqual(utils.bytesToHex(messageData))
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

    const feed = bee.feed.makeFeed("topic", bee.signer!.address, "sequence")

    const { reference } = await bee.bzz.upload(feedDataSerialized, {
      batchId,
      contentType: "application/json",
    })

    const feedWriter = bee.feed.makeWriter(feed)
    await feedWriter.upload(reference, { batchId })

    const feedReader = bee.feed.makeReader(feed)
    const feedDownloadResp = await feedReader.download()

    expect(feedDownloadResp.reference).toEqual(reference)

    const feedDataDownloaded = await bee.bzz.download(feedDownloadResp.reference)

    expect(feedDataDownloaded.data.json()).toEqual(feedData)
  })

  it("should create a postage stamp", async () => {
    const batchId = await bee.stamps.create(20, "1000000")

    expect(batchId).toHaveLength(64)

    const batch = await bee.stamps.download(batchId)

    expect(batch.depth).toEqual(20)
    expect(batch.amount).toEqual("1000000")
  })

  it("should topup a postage stamp", async () => {
    const batchId = await bee.stamps.create(20, "1000000")
    const batch = await bee.stamps.download(batchId)
    const ok = await bee.stamps.topup(batchId, "1000")

    expect(ok).toBeTruthy()

    const dilutedBatch = await bee.stamps.download(batchId)

    // expect(batch.amount).toEqual("1001000")
    expect(dilutedBatch.batchTTL).toBeGreaterThan(batch.batchTTL)
  })

  it("should dilute a postage stamp", async () => {
    const batchId = await bee.stamps.create(20, "1000000")
    // const batch = await bee.stamps.download(batchId)
    const ok = await bee.stamps.dilute(batchId, 21)

    expect(ok).toBeTruthy()

    // const dilutedBatch = await bee.stamps.download(batchId)

    // Depth is not updating in dev mode:
    // https://github.com/ethersphere/bee/issues/3092
    // expect(batch.depth).toEqual(21)
    // expect(dilutedBatch.batchTTL).toBeLessThan(batch.batchTTL)
  })

  it.fails("should fetch the current price", async () => {
    // chainstate in dev-mdoe fails

    const price = await bee.chainstate.getCurrentPrice()

    expect(price).toBeDefined()
    expect(price).greaterThan(0)
  })
})
