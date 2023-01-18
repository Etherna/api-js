import fs from "fs"
import { resolve } from "node:path"
import { describe, it, expect, beforeAll, afterAll } from "vitest"

import { BeeClient } from "../../src/clients"
import { VideoDeserializer } from "../../src/serializers"
import VideoBuilder from "../../src/swarm/video/builder"
import { createPostaBatch, startBee } from "../__utils__/bee-process"
import { testVideoRaw_1_1 } from "./__data__/video.test.data"

import type { BatchId, Reference } from "../../src/clients"
import type { ChildProcess } from "../__utils__/bee-process"

describe("builder", () => {
  const beeClient = new BeeClient("http://localhost:1633")
  const deserializer = new VideoDeserializer("http://localhost:1633")

  let beeProcess: ChildProcess
  let batchId: BatchId
  let legacyVideoReference: Reference
  let folderVideoReference: Reference

  beforeAll(async () => {
    beeProcess = await startBee()
    batchId = await createPostaBatch()

    // upload v1 video
    const video = fs.readFileSync(resolve("test/serializers/__data__/video.mp4"))
    const source = await beeClient.bzz.upload(video, {
      batchId,
      contentType: "video/mp4",
    })
    // upload v1 thumbnail
    const thumb = fs.readFileSync(resolve("test/serializers/__data__/thumbnail.png"))
    const thumbSource = await beeClient.bzz.upload(thumb, {
      batchId,
      contentType: "image/png",
    })
    // create video manifest
    const videoMeta = { ...testVideoRaw_1_1 }
    videoMeta.sources = [
      {
        reference: source.reference,
        quality: "720p",
        size: video.length,
        bitrate: (video.length / 8) * 10,
      },
    ]
    videoMeta.thumbnail = {
      ...videoMeta.thumbnail!,
      sources: [
        {
          type: "png",
          width: 1280,
          reference: thumbSource.reference,
        },
      ],
    }
    // upload video manifest
    const { reference } = await beeClient.bzz.upload(JSON.stringify(videoMeta), {
      batchId,
      contentType: "application/json",
    })
    legacyVideoReference = reference
  })

  afterAll(() => {
    beeProcess?.kill()
  })

  it("should parse a legacy video", async () => {
    const videoOldManifest = await beeClient.bzz.download(legacyVideoReference)
    const videoPreview = new VideoDeserializer(beeClient.url).deserializePreview(
      videoOldManifest.data.text(),
      { reference: legacyVideoReference }
    )
    const videoDetails = new VideoDeserializer(beeClient.url).deserializeDetails(
      videoOldManifest.data.text(),
      { reference: legacyVideoReference }
    )
    videoDetails.batchId = batchId

    const builder = new VideoBuilder()
    builder.initialize("0x6163C4b8264a03CCAc412B83cbD1B551B6c6C246", videoPreview, videoDetails)

    await builder.loadNode({ beeClient })
    await builder.saveNode({ beeClient })

    folderVideoReference = builder.reference
  })

  it("should load a folder based video", async () => {
    const reference = folderVideoReference
    const videoPreviewManifest = await beeClient.bzz.downloadPath(reference, "preview")
    const videoDetailsManifest = await beeClient.bzz.downloadPath(reference, "details")

    const videoPreview = new VideoDeserializer(beeClient.url).deserializePreview(
      videoPreviewManifest.data.text(),
      { reference }
    )
    const videoDetails = new VideoDeserializer(beeClient.url).deserializeDetails(
      videoDetailsManifest.data.text(),
      { reference }
    )
    videoDetails.batchId = batchId

    const builder = new VideoBuilder()
    builder.initialize("0x6163C4b8264a03CCAc412B83cbD1B551B6c6C246", videoPreview, videoDetails)

    await builder.loadNode({ beeClient })
    await builder.saveNode({ beeClient })
  })

  it("should serialize and deserialize", async () => {
    const reference = folderVideoReference
    const videoPreviewManifest = await beeClient.bzz.downloadPath(reference, "preview")
    const videoDetailsManifest = await beeClient.bzz.downloadPath(reference, "details")

    const videoPreview = new VideoDeserializer(beeClient.url).deserializePreview(
      videoPreviewManifest.data.text(),
      { reference }
    )
    const videoDetails = new VideoDeserializer(beeClient.url).deserializeDetails(
      videoDetailsManifest.data.text(),
      { reference }
    )
    videoDetails.batchId = batchId

    const builder = new VideoBuilder()
    builder.initialize("0x6163C4b8264a03CCAc412B83cbD1B551B6c6C246", videoPreview, videoDetails)

    await builder.loadNode({ beeClient })

    const initialPreview = builder.previewMeta
    const initialDetails = builder.detailsMeta
    const initialNode = builder.node.readable

    const serialized = builder.serialize()

    expect(serialized.node).toStrictEqual(initialNode)

    const builder2 = new VideoBuilder()
    builder2.deserialize(serialized)

    expect(builder2.previewMeta).toStrictEqual(initialPreview)
    expect(builder2.detailsMeta).toStrictEqual(initialDetails)
    expect(builder2.node.readable).toStrictEqual(initialNode)
  })
})
