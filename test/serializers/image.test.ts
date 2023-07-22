import { describe, expect, it } from "vitest"

import { ImageDeserializer, ImageSerializer } from "../../src/serializers"
import {
  beeUrl,
  testImageParsed,
  testImageRaw,
  testLegacyImageParsed,
  testLegacyImageRaw,
} from "./__data__/image.test.data"

describe("image deserializer", () => {
  const deserializer = new ImageDeserializer(beeUrl)

  it("should parse a legacy raw image", () => {
    const manifest = deserializer.deserialize(testLegacyImageRaw)
    expect(manifest).toEqual(testLegacyImageParsed)
  })

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

    // source path/reference
    manifest = JSON.parse(JSON.stringify(testImageRaw)) as any
    delete manifest.sources[0].reference
    delete manifest.sources[0].path
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

    // source path/reference
    manifest = JSON.parse(JSON.stringify(testImageParsed)) as any
    delete manifest.sources[0].reference
    delete manifest.sources[0].path
    expect(() => serializer.serialize(manifest as any)).toThrowError()

    // empty sources
    manifest = { ...testImageParsed, sources: {} }
    expect(() => serializer.serialize(manifest as any)).toThrowError()
  })
})
