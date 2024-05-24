import { describe, expect, it } from "vitest"

import { ProfileDeserializer, ProfileSerializer } from "../../src/serializers"
import {
  beeUrl,
  testProfileDetailsParsed,
  testProfileDetailsRaw_2,
  testProfilePreviewParsed,
  testProfilePreviewParsed_1_0,
  testProfilePreviewRaw_2,
  testProfileRaw_1_0,
  testProfileRaw_1_1,
} from "./__data__/profile.test.data"

describe("profile deserializer", () => {
  const deserializer = new ProfileDeserializer(beeUrl)

  it("should parse a raw profile preview v1.0", () => {
    const previewManifest = deserializer.deserializePreview(JSON.stringify(testProfileRaw_1_0))
    expect(previewManifest).toEqual(testProfilePreviewParsed_1_0)
  })

  it("should parse a raw profile preview + details v1.1", () => {
    const previewManifest = deserializer.deserializePreview(JSON.stringify(testProfileRaw_1_1))
    const detailsManifest = deserializer.deserializeDetails(JSON.stringify(testProfileRaw_1_1))
    expect(previewManifest).toEqual(testProfilePreviewParsed)
    expect(detailsManifest).toEqual(testProfileDetailsParsed)
  })

  it("should parse a raw profile preview + details v2", () => {
    const previewManifest = deserializer.deserializePreview(JSON.stringify(testProfilePreviewRaw_2))
    const detailsManifest = deserializer.deserializeDetails(JSON.stringify(testProfileDetailsRaw_2))
    expect(previewManifest).toEqual(testProfilePreviewParsed)
    expect(detailsManifest).toEqual(testProfileDetailsParsed)
  })

  it("should throw when required field is missing", () => {
    // address
    let manifest: Record<string, any> = { ...testProfilePreviewParsed }
    delete manifest.address
    expect(() => deserializer.deserializePreview(JSON.stringify(manifest))).toThrowError()

    // name
    manifest = { ...testProfilePreviewParsed }
    delete manifest.name
    expect(() => deserializer.deserializePreview(JSON.stringify(manifest))).toThrowError()
  })
})

describe("profile serializer", () => {
  const serializer = new ProfileSerializer()

  it("should serialize profile into swarm manifest", () => {
    const previewManifest = serializer.serializePreview(testProfilePreviewParsed)
    const detailsManifest = serializer.serializeDetails(testProfileDetailsParsed)
    expect(JSON.parse(previewManifest)).toEqual(testProfilePreviewRaw_2)
    expect(JSON.parse(detailsManifest)).toEqual(testProfileDetailsRaw_2)
  })

  it("should throw when required field is missing", () => {
    // address
    let manifest: Record<string, any> = { ...testProfilePreviewParsed }
    delete manifest.address
    expect(() => serializer.serializePreview(manifest)).toThrowError()

    // name
    manifest = { ...testProfilePreviewParsed }
    delete manifest.name
    expect(() => serializer.serializePreview(manifest)).toThrowError()

    // batchId
    manifest = { ...testProfilePreviewParsed }
    delete manifest.batchId
    expect(() => serializer.serializePreview(manifest)).toThrowError()
  })
})
