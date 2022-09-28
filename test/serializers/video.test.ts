import { describe, it, expect } from "vitest"

import { VideoDeserializer, VideoSerializer } from "../../src/serializers"
import {
  beeUrl,
  testVideoRaw_1_0,
  testVideoRaw_1_1,
  testVideoParsed_1_0,
  testVideoParsed_1_1,
  videoReference,
  testVideoIndex,
  testVideoIndexParsed,
} from "./__data__/video.test.data"

describe("video deserializer", () => {
  const deserializer = new VideoDeserializer(beeUrl)

  it("should parse a raw video v1.0", () => {
    const video = deserializer.deserialize(JSON.stringify(testVideoRaw_1_0), {
      reference: videoReference,
    })
    expect(video).toEqual(testVideoParsed_1_0)
  })

  it("should parse a raw video v1.1", () => {
    const video = deserializer.deserialize(JSON.stringify(testVideoRaw_1_1), {
      reference: videoReference,
    })
    expect(video).toEqual(testVideoParsed_1_1)
  })

  it("should parse an index generic video", () => {
    const video = deserializer.deserialize(JSON.stringify(testVideoIndex), {
      reference: videoReference,
    })
    expect(video).toEqual(testVideoIndexParsed)
  })

  it("should throw when required field is missing", () => {
    // title
    let manifest: Record<string, any> = { ...testVideoRaw_1_1 }
    delete manifest.title
    expect(() =>
      deserializer.deserialize(JSON.stringify(manifest), { reference: videoReference })
    ).toThrowError()

    // description
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.description
    expect(() =>
      deserializer.deserialize(JSON.stringify(manifest), { reference: videoReference })
    ).toThrowError()

    // createdAt
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.createdAt
    expect(() =>
      deserializer.deserialize(JSON.stringify(manifest), { reference: videoReference })
    ).toThrowError()

    // originalQuality
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.originalQuality
    expect(() =>
      deserializer.deserialize(JSON.stringify(manifest), { reference: videoReference })
    ).toThrowError()

    // ownerAddress
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.ownerAddress
    expect(() =>
      deserializer.deserialize(JSON.stringify(manifest), { reference: videoReference })
    ).toThrowError()

    // duration
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.duration
    expect(() =>
      deserializer.deserialize(JSON.stringify(manifest), { reference: videoReference })
    ).toThrowError()

    // description
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.description
    expect(() =>
      deserializer.deserialize(JSON.stringify(manifest), { reference: videoReference })
    ).toThrowError()

    // thumbnail
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.thumbnail
    expect(() =>
      deserializer.deserialize(JSON.stringify(manifest), { reference: videoReference })
    ).toThrowError()

    // sources
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.sources
    expect(() =>
      deserializer.deserialize(JSON.stringify(manifest), { reference: videoReference })
    ).toThrowError()

    // sources empty
    manifest = { ...testVideoRaw_1_1, sources: [] }
    expect(() =>
      deserializer.deserialize(JSON.stringify(manifest), { reference: videoReference })
    ).toThrowError()
  })
})

describe("video serializer", () => {
  const serializer = new VideoSerializer()

  it("should serialize a video into swarm manifest", () => {
    const manifest = serializer.serialize(testVideoParsed_1_1)
    expect(JSON.parse(manifest)).toEqual(testVideoRaw_1_1)
  })

  it("should throw when required field is missing", () => {
    // title
    let manifest: Record<string, any> = { ...testVideoRaw_1_1 }
    delete manifest.title
    expect(() => serializer.serialize(manifest)).toThrowError()

    // description
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.description
    expect(() => serializer.serialize(manifest)).toThrowError()

    // createdAt
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.createdAt
    expect(() => serializer.serialize(manifest)).toThrowError()

    // originalQuality
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.originalQuality
    expect(() => serializer.serialize(manifest)).toThrowError()

    // ownerAddress
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.ownerAddress
    expect(() => serializer.serialize(manifest)).toThrowError()

    // duration
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.duration
    expect(() => serializer.serialize(manifest)).toThrowError()

    // description
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.description
    expect(() => serializer.serialize(manifest)).toThrowError()

    // thumbnail
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.thumbnail
    expect(() => serializer.serialize(manifest)).toThrowError()

    // sources
    manifest = { ...testVideoRaw_1_1 }
    delete manifest.sources
    expect(() => serializer.serialize(manifest)).toThrowError()

    // sources empty
    manifest = { ...testVideoRaw_1_1, sources: [] }
    expect(() => serializer.serialize(manifest)).toThrowError()
  })
})
