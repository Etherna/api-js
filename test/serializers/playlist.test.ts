import { describe, expect, it } from "vitest"

import { PlaylistDeserializer, PlaylistSerializer } from "../../src/serializers"
import { decryptData } from "../../src/utils"
import {
  password,
  rootManifest,
  testEncryptedDetails,
  testManifestDetails,
  testManifestDetailsParsed,
  testManifestPreview,
  testManifestPreviewParsed,
} from "./__data__/playlist.test.data"

describe("playlist deserializer", () => {
  const deserializer = new PlaylistDeserializer()

  it("should parse a raw playlist preview", () => {
    const preview = deserializer.deserializePreview(JSON.stringify(testManifestPreview), {
      rootManifest,
    })
    expect(preview).toEqual(testManifestPreviewParsed)
  })

  it("should parse a raw playlist details", () => {
    const { details } = deserializer.deserializeDetails(JSON.stringify(testManifestDetails))
    expect(details).toEqual(testManifestDetailsParsed)
  })

  it("should parse a private playlist details", () => {
    const details = deserializer.deserializeEncryptedDetails(testEncryptedDetails, password)
    expect(details).toEqual(testManifestDetailsParsed)
  })

  it("should throw when required field is missing", () => {
    // id
    let manifest: Record<string, any> = { ...testManifestPreview }
    delete manifest.id
    expect(() =>
      deserializer.deserializePreview(JSON.stringify(manifest), {
        rootManifest,
      }),
    ).toThrowError()

    // name
    manifest = { ...testManifestPreview }
    delete manifest.name
    expect(() =>
      deserializer.deserializePreview(JSON.stringify(manifest), {
        rootManifest,
      }),
    ).toThrowError()

    // type
    manifest = { ...testManifestPreview }
    delete manifest.type
    expect(() =>
      deserializer.deserializePreview(JSON.stringify(manifest), {
        rootManifest,
      }),
    ).toThrowError()

    // owner
    manifest = { ...testManifestPreview }
    delete manifest.owner
    expect(() =>
      deserializer.deserializePreview(JSON.stringify(manifest), {
        rootManifest,
      }),
    ).toThrowError()

    // thumb
    manifest = { ...testManifestPreview }
    delete manifest.thumb
    expect(() =>
      deserializer.deserializePreview(JSON.stringify(manifest), {
        rootManifest,
      }),
    ).toThrowError()

    // createdAt
    manifest = { ...testManifestPreview }
    delete manifest.createdAt
    expect(() =>
      deserializer.deserializePreview(JSON.stringify(manifest), {
        rootManifest,
      }),
    ).toThrowError()

    // updatedAt
    manifest = { ...testManifestPreview }
    delete manifest.updatedAt
    expect(() =>
      deserializer.deserializePreview(JSON.stringify(manifest), {
        rootManifest,
      }),
    ).toThrowError()

    // videos
    manifest = { ...testManifestDetails }
    delete manifest.videos
    expect(() => deserializer.deserializeDetails(JSON.stringify(manifest))).toThrowError()
  })
})

describe("playlist serializer", () => {
  const serializer = new PlaylistSerializer()

  it("should serialize a public playlist preview into swarm manifest", () => {
    const manifest = serializer.serializePreview(testManifestPreviewParsed)
    expect(JSON.parse(manifest)).toEqual(testManifestPreview)
  })

  it("should serialize a public playlist details into swarm manifest", () => {
    const manifest = serializer.serializeDetails(testManifestDetailsParsed)
    expect(JSON.parse(manifest)).toEqual(testManifestDetails)
  })

  it("should serialize a private playlist details into swarm manifest", () => {
    const encryptedDetails = serializer.serializeDetails(testManifestDetailsParsed, password)
    const descripted = JSON.parse(decryptData(encryptedDetails, password))
    expect(descripted).toEqual(testManifestDetails)
  })

  it("should throw when required field is missing", () => {
    // id
    let manifest: Record<string, any> = { ...testManifestPreview }
    delete manifest.id
    expect(() => serializer.serializePreview(manifest)).toThrowError()

    // name
    manifest = { ...testManifestPreview }
    delete manifest.name
    expect(() => serializer.serializePreview(manifest)).toThrowError()

    // type
    manifest = { ...testManifestPreview }
    delete manifest.type
    expect(() => serializer.serializePreview(manifest)).toThrowError()

    // owner
    manifest = { ...testManifestPreview }
    delete manifest.owner
    expect(() => serializer.serializePreview(manifest)).toThrowError()

    // thumb
    manifest = { ...testManifestPreview }
    delete manifest.thumb
    expect(() => serializer.serializePreview(manifest)).toThrowError()

    // createdAt
    manifest = { ...testManifestPreview }
    delete manifest.createdAt
    expect(() => serializer.serializePreview(manifest)).toThrowError()

    // updatedAt
    manifest = { ...testManifestPreview }
    delete manifest.updatedAt
    expect(() => serializer.serializePreview(manifest)).toThrowError()

    // videos
    manifest = { ...testManifestDetails }
    delete manifest.videos
    expect(() => serializer.serializeDetails(manifest)).toThrowError()
  })
})
