import type { Playlist } from "../.."
import { PlaylistEncryptedDataRawSchema, PlaylistRawSchema } from "../../schemas/playlist"
import { decryptData } from "../../utils/crypto"
import BaseDeserializer from "../base-deserializer"

export type PlaylistDeserializerOptions = {
  /** Video swarm reference */
  reference: string
}

export default class PlaylistDeserializer extends BaseDeserializer<Playlist> {
  constructor() {
    super()
  }

  deserialize(data: string, opts: PlaylistDeserializerOptions): Playlist {
    const playlistRaw = PlaylistRawSchema.parse(JSON.parse(data))

    const type = playlistRaw.type

    if (type === "public" || type === "unlisted") {
      const playlist: Playlist = {
        reference: opts.reference,
        id: playlistRaw.id,
        name: playlistRaw.name,
        type: type,
        owner: playlistRaw.owner,
        createdAt: playlistRaw.createdAt,
        updatedAt: playlistRaw.updatedAt,
        description: playlistRaw.description ?? null,
        videos: playlistRaw.videos.map(rawVideo => ({
          reference: rawVideo.r,
          title: rawVideo.t,
          addedAt: rawVideo.a,
          publishedAt: rawVideo.p,
        })),
      }
      return playlist
    } else if (type === "private") {
      const playlist: Playlist = {
        reference: opts.reference,
        id: playlistRaw.id,
        name: playlistRaw.name,
        type: type,
        owner: playlistRaw.owner,
        createdAt: playlistRaw.createdAt,
        updatedAt: playlistRaw.updatedAt,
        encryptedData: playlistRaw.encryptedData,
        description: null,
        videos: [],
      }
      return playlist
    } else {
      throw new Error("Wrong Schema. Field 'type' is not a valid playlist type")
    }
  }

  deserializeEncryptedData(playlist: Playlist, password: string): Playlist {
    if (playlist.type !== "private") {
      throw new Error("Cannot deserialize encrypted data. Playlist is not private.")
    }

    const encryptedData = PlaylistEncryptedDataRawSchema.parse(
      JSON.parse(decryptData(playlist.encryptedData, password))
    )

    playlist.description = encryptedData.description ?? null
    playlist.videos = encryptedData.videos.map(rawVideo => ({
      reference: rawVideo.r,
      title: rawVideo.t,
      addedAt: rawVideo.a,
      publishedAt: rawVideo.p,
    }))

    return playlist
  }
}
