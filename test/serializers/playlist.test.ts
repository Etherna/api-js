import { describe, it, expect } from "vitest"

import { PlaylistDeserializer, PlaylistSerializer } from "../../src/serializers"
import { decryptData } from "../../src/utils"
import {
  password,
  testManifest,
  testManifestParsed,
  testPrivateManifest,
  testPrivateManifestParsed,
} from "./__data__/playlist.test.data"

describe("playlist deserializer", () => {
  const deserializer = new PlaylistDeserializer()

  it("should parse a raw playlist", () => {
    const playlist = deserializer.deserialize(JSON.stringify(testManifest), {
      reference: testManifestParsed.reference,
    })
    expect(playlist).toEqual(testManifestParsed)
  })

  it("should parse a private playlist", () => {
    const manifest = deserializer.deserialize(JSON.stringify(testPrivateManifest), {
      reference: testPrivateManifestParsed.reference,
    })
    expect(manifest).toEqual({
      ...testPrivateManifestParsed,
      description: null,
      videos: [],
    })
    const manifestWithPrivateData = deserializer.deserializeEncryptedData(manifest, password)
    expect(manifestWithPrivateData).toEqual(testPrivateManifestParsed)
  })

  it("should throw when required field is missing", () => {
    // id
    let manifest: Record<string, any> = { ...testManifest }
    delete manifest.id
    expect(() =>
      deserializer.deserialize(JSON.stringify(manifest), {
        reference: testManifestParsed.reference,
      })
    ).toThrowError()

    // name
    manifest = { ...testManifest }
    delete manifest.name
    expect(() =>
      deserializer.deserialize(JSON.stringify(manifest), {
        reference: testManifestParsed.reference,
      })
    ).toThrowError()

    // type
    manifest = { ...testManifest }
    delete manifest.type
    expect(() =>
      deserializer.deserialize(JSON.stringify(manifest), {
        reference: testManifestParsed.reference,
      })
    ).toThrowError()

    // owner
    manifest = { ...testManifest }
    delete manifest.owner
    expect(() =>
      deserializer.deserialize(JSON.stringify(manifest), {
        reference: testManifestParsed.reference,
      })
    ).toThrowError()

    // createdAt
    manifest = { ...testManifest }
    delete manifest.createdAt
    expect(() =>
      deserializer.deserialize(JSON.stringify(manifest), {
        reference: testManifestParsed.reference,
      })
    ).toThrowError()

    // updatedAt
    manifest = { ...testManifest }
    delete manifest.updatedAt
    expect(() =>
      deserializer.deserialize(JSON.stringify(manifest), {
        reference: testManifestParsed.reference,
      })
    ).toThrowError()
  })
})

describe("playlist serializer", () => {
  const serializer = new PlaylistSerializer()

  it("should serialize a public playlist into swarm manifest", () => {
    const manifest = serializer.serialize(testManifestParsed)
    expect(JSON.parse(manifest)).toEqual(testManifest)
  })

  it("should serialize a private playlist into swarm manifest", () => {
    const manifest = serializer.serialize(testPrivateManifestParsed, password)
    const parsedManifest = JSON.parse(manifest)
    const testParsedManifest = { ...testPrivateManifest } as Record<string, any>
    // Check encrypted data
    expect(JSON.parse(decryptData(parsedManifest.encryptedData, password))).toEqual(
      JSON.parse(decryptData(testParsedManifest.encryptedData, password))
    )
    // Remove encrypted data (encrypted data changes every time)
    delete parsedManifest.encryptedData
    delete testParsedManifest.encryptedData
    expect(parsedManifest).toEqual(testParsedManifest)
  })

  it("should throw when required field is missing", () => {
    // id
    let manifest: Record<string, any> = { ...testManifest }
    delete manifest.id
    expect(() => serializer.serialize(manifest)).toThrowError()

    // name
    manifest = { ...testManifest }
    delete manifest.name
    expect(() => serializer.serialize(manifest)).toThrowError()

    // type
    manifest = { ...testManifest }
    delete manifest.type
    expect(() => serializer.serialize(manifest)).toThrowError()

    // owner
    manifest = { ...testManifest }
    delete manifest.owner
    expect(() => serializer.serialize(manifest)).toThrowError()

    // createdAt
    manifest = { ...testManifest }
    delete manifest.createdAt
    expect(() => serializer.serialize(manifest)).toThrowError()

    // updatedAt
    manifest = { ...testManifest }
    delete manifest.updatedAt
    expect(() => serializer.serialize(manifest)).toThrowError()
  })
})
