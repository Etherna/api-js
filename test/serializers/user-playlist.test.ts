import { describe, expect, it } from "vitest"

import { UserPlaylistsDeserializer, UserPlaylistsSerializer } from "../../src/serializers"
import { testProfileParsed, userPlaylistsRaw_Legacy } from "./__data__/user-playlists.test.data"

describe("user playlists deserializer", () => {
  const deserializer = new UserPlaylistsDeserializer()

  it("should parse a raw user playlists", () => {
    const playlist = deserializer.deserialize(JSON.stringify(userPlaylistsRaw_Legacy))
    expect(playlist).toEqual(testProfileParsed)
  })
})

describe("user playlists serializer", () => {
  const serializer = new UserPlaylistsSerializer()

  it("should serialize a user playlists into swarm manifest", () => {
    const manifest = serializer.serialize(testProfileParsed)
    expect(JSON.parse(manifest)).toEqual(testProfileParsed)
  })
})
