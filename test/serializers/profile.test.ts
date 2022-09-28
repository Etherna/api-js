import { describe, it, expect } from "vitest"

import { ProfileDeserializer, ProfileSerializer } from "../../src/serializers"
import {
  beeUrl,
  testProfileParsed,
  testProfileRaw_1_0,
  testProfileRaw_1_1,
} from "./__data__/profile.test.data"

describe("profile deserializer", () => {
  const deserializer = new ProfileDeserializer(beeUrl)

  it("should parse a raw profile v1.0", () => {
    const manifest = deserializer.deserialize(JSON.stringify(testProfileRaw_1_0), {
      fallbackBatchId: testProfileRaw_1_1.batchId ?? null,
    })
    expect(manifest).toEqual(testProfileParsed)
  })

  it("should parse a raw profile v1.1", () => {
    const manifest = deserializer.deserialize(JSON.stringify(testProfileRaw_1_1))
    expect(manifest).toEqual(testProfileParsed)
  })

  it("should throw when required field is missing", () => {
    // address
    let manifest: Record<string, any> = { ...testProfileParsed }
    delete manifest.address
    expect(() => deserializer.deserialize(JSON.stringify(manifest))).toThrowError()

    // name
    manifest = { ...testProfileParsed }
    delete manifest.name
    expect(() => deserializer.deserialize(JSON.stringify(manifest))).toThrowError()
  })
})

describe("profile serializer", () => {
  const serializer = new ProfileSerializer()

  it("should serialize profile into swarm manifest", () => {
    const manifest = serializer.serialize(testProfileParsed)
    expect(JSON.parse(manifest)).toEqual(testProfileRaw_1_1)
  })

  it("should throw when required field is missing", () => {
    // address
    let manifest: Record<string, any> = { ...testProfileParsed }
    delete manifest.address
    expect(() => serializer.serialize(manifest)).toThrowError()

    // name
    manifest = { ...testProfileParsed }
    delete manifest.name
    expect(() => serializer.serialize(manifest)).toThrowError()

    // batchId
    manifest = { ...testProfileParsed }
    delete manifest.batchId
    expect(() => serializer.serialize(manifest)).toThrowError()
  })
})
