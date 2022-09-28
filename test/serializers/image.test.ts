import { describe, it, expect } from "vitest"

import { ImageDeserializer, ImageSerializer } from "../../src/serializers"
import { beeUrl, testImageRaw, testImageParsed } from "./__data__/image.test.data"

describe("image deserializer", () => {
  const deserializer = new ImageDeserializer(beeUrl)

  it("should parse a raw image", () => {
    const manifest = deserializer.deserialize(testImageRaw)
    expect(manifest).toEqual(testImageParsed)
  })

  it("should throw when required field is missing", () => {
    // aspectRatio
    let manifest: Record<string, any> = { ...testImageRaw }
    delete manifest.aspectRatio
    expect(() => deserializer.deserialize(manifest)).toThrowError()

    // blurhash
    manifest = { ...testImageRaw }
    delete manifest.blurhash
    expect(() => deserializer.deserialize(manifest)).toThrowError()

    // sources
    manifest = { ...testImageRaw }
    delete manifest.sources
    expect(() => deserializer.deserialize(manifest)).toThrowError()

    // empty sources
    manifest = { ...testImageRaw, sources: {} }
    expect(() => deserializer.deserialize(manifest)).toThrowError()
  })
})

describe("image serializer", () => {
  const serializer = new ImageSerializer()

  it("should serialize image into swarm manifest", () => {
    const manifest = serializer.serialize(testImageParsed)
    expect(manifest).toEqual(testImageRaw)
  })

  it("should throw when required field is missing", () => {
    // aspectRatio
    let manifest: Record<string, any> = { ...testImageParsed }
    delete manifest.aspectRatio
    expect(() => serializer.serialize(manifest as any)).toThrowError()

    // blurhash
    manifest = { ...testImageParsed }
    delete manifest.blurhash
    expect(() => serializer.serialize(manifest as any)).toThrowError()

    // sources
    manifest = { ...testImageParsed }
    delete manifest.sources
    expect(() => serializer.serialize(manifest as any)).toThrowError()

    // empty sources
    manifest = { ...testImageParsed, sources: {} }
    expect(() => serializer.serialize(manifest as any)).toThrowError()
  })
})
