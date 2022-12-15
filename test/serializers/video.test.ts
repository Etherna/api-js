import { describe, it, expect } from "vitest"

import { VideoDeserializer, VideoSerializer } from "../../src/serializers"
import {
  beeUrl,
  testVideoRaw_1_0,
  testVideoRaw_1_1,
  testVideoPreviewParsed_1_0,
  testVideoDetailsParsed_1_0,
  testVideoPreviewParsed_1_1,
  testVideoDetailsParsed_1_1,
  videoReference,
  testVideoIndex,
  testVideoPreviewIndexParsed,
  testVideoDetailsIndexParsed,
  testVideoPreviewParsed_2_0,
  testVideoDetailsParsed_2_0,
  testVideoPreviewParsed_1_1_2_0,
  testVideoDetailsParsed_1_1_2_0,
  testVideoRawPreview_1_1_2_0,
  testVideoRawDetails_1_1_2_0,
  testVideoPreviewRaw_2_0,
  testVideoDetailsRaw_2_0,
} from "./__data__/video.test.data"

describe("video deserializer", () => {
  const deserializer = new VideoDeserializer(beeUrl)

  it("should parse a raw video v1.0", () => {
    const videoPreview = deserializer.deserializePreview(JSON.stringify(testVideoRaw_1_0), {
      reference: videoReference,
    })
    const videoDetails = deserializer.deserializeDetails(JSON.stringify(testVideoRaw_1_0), {
      reference: videoReference,
    })
    expect(videoPreview).toEqual(testVideoPreviewParsed_1_0)
    expect(videoDetails).toEqual(testVideoDetailsParsed_1_0)
  })

  it("should parse a raw video v1.1", () => {
    const videoPreview = deserializer.deserializePreview(JSON.stringify(testVideoRaw_1_1), {
      reference: videoReference,
    })
    const videoDetails = deserializer.deserializeDetails(JSON.stringify(testVideoRaw_1_1), {
      reference: videoReference,
    })
    expect(videoPreview).toEqual(testVideoPreviewParsed_1_1)
    expect(videoDetails).toEqual(testVideoDetailsParsed_1_1)
  })

  it("should parse an index generic video", () => {
    const videoPreview = deserializer.deserializePreview(JSON.stringify(testVideoIndex), {
      reference: videoReference,
    })
    const videoDetails = deserializer.deserializeDetails(JSON.stringify(testVideoIndex), {
      reference: videoReference,
    })
    expect(videoPreview).toEqual(testVideoPreviewIndexParsed)
    expect(videoDetails).toEqual(testVideoDetailsIndexParsed)
  })

  it("should throw when required field is missing", () => {
    // title
    let manifest: Record<string, any> = { ...testVideoRaw_1_1 }
    delete manifest.title
    expect(() =>
      deserializer.deserializePreview(JSON.stringify(manifest), { reference: videoReference })
    ).toThrowError()

    // description
    manifest = { ...testVideoRawDetails_1_1_2_0 }
    delete manifest.description
    expect(() =>
      deserializer.deserializeDetails(JSON.stringify(manifest), { reference: videoReference })
    ).toThrowError()

    // createdAt
    manifest = { ...testVideoRawPreview_1_1_2_0 }
    delete manifest.createdAt
    expect(() =>
      deserializer.deserializePreview(JSON.stringify(manifest), { reference: videoReference })
    ).toThrowError()

    // ownerAddress
    manifest = { ...testVideoRawPreview_1_1_2_0 }
    delete manifest.ownerAddress
    expect(() =>
      deserializer.deserializePreview(JSON.stringify(manifest), { reference: videoReference })
    ).toThrowError()

    // duration
    manifest = { ...testVideoRawPreview_1_1_2_0 }
    delete manifest.duration
    expect(() =>
      deserializer.deserializePreview(JSON.stringify(manifest), { reference: videoReference })
    ).toThrowError()

    // description
    manifest = { ...testVideoRawDetails_1_1_2_0 }
    delete manifest.description
    expect(() =>
      deserializer.deserializeDetails(JSON.stringify(manifest), { reference: videoReference })
    ).toThrowError()

    // thumbnail
    manifest = { ...testVideoRawPreview_1_1_2_0 }
    delete manifest.thumbnail
    expect(() =>
      deserializer.deserializePreview(JSON.stringify(manifest), { reference: videoReference })
    ).toThrowError()

    // sources
    manifest = { ...testVideoRawDetails_1_1_2_0 }
    delete manifest.sources
    expect(() =>
      deserializer.deserializeDetails(JSON.stringify(manifest), { reference: videoReference })
    ).toThrowError()

    // sources empty
    manifest = { ...testVideoRawDetails_1_1_2_0, sources: [] }
    expect(() =>
      deserializer.deserializeDetails(JSON.stringify(manifest), { reference: videoReference })
    ).toThrowError()
  })
})

describe("video serializer", () => {
  const serializer = new VideoSerializer()

  it("should serialize a video into preview / details manifests", () => {
    // 1.2 to 2.0
    const manifestPreview = serializer.serializePreview(testVideoPreviewParsed_1_1_2_0)
    const manifestDetails = serializer.serializeDetails(testVideoDetailsParsed_1_1_2_0)
    expect(JSON.parse(manifestPreview)).toEqual(testVideoRawPreview_1_1_2_0)
    expect(JSON.parse(manifestDetails)).toEqual(testVideoRawDetails_1_1_2_0)
    // 2.0
    const manifestPreview2 = serializer.serializePreview(testVideoPreviewParsed_2_0)
    const manifestDetails2 = serializer.serializeDetails(testVideoDetailsParsed_2_0)
    expect(JSON.parse(manifestPreview2)).toEqual(testVideoPreviewRaw_2_0)
    expect(JSON.parse(manifestDetails2)).toEqual(testVideoDetailsRaw_2_0)
  })

  it("should throw when required field is missing", () => {
    // title
    let manifest: Record<string, any> = { ...testVideoRaw_1_1 }
    delete manifest.title
    expect(() => serializer.serializePreview(manifest)).toThrowError()

    // description
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.description
    expect(() => serializer.serializeDetails(manifest)).toThrowError()

    // createdAt
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.createdAt
    expect(() => serializer.serializePreview(manifest)).toThrowError()

    // ownerAddress
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.ownerAddress
    expect(() => serializer.serializePreview(manifest)).toThrowError()

    // duration
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.duration
    expect(() => serializer.serializePreview(manifest)).toThrowError()

    // description
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.description
    expect(() => serializer.serializeDetails(manifest)).toThrowError()

    // thumbnail
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.thumbnail
    expect(() => serializer.serializePreview(manifest)).toThrowError()

    // aspectRatio
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.aspectRatio
    expect(() => serializer.serializeDetails(manifest)).toThrowError()

    // sources
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.sources
    expect(() => serializer.serializeDetails(manifest)).toThrowError()

    // sources empty
    manifest = { ...testVideoRaw_1_1, sources: [] }
    expect(() => serializer.serializeDetails(manifest)).toThrowError()
  })
})
