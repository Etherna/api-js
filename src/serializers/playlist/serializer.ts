import { PlaylistEncryptedDataRawSchema, PlaylistSchema } from "../../schemas/playlist"
import { encryptData } from "../../utils/crypto"
import { BaseSerializer } from "../base-serializer"

import type { PlaylistRaw } from "../.."

export class PlaylistSerializer extends BaseSerializer {
  constructor() {
    super()
  }

  serialize(item: object, password?: string): string {
    const playlist = PlaylistSchema.parse(item)

    const type = playlist.type

    switch (type) {
      case "public":
        const playlistRaw: PlaylistRaw = {
          id: playlist.id,
          name: playlist.name,
          type,
          owner: playlist.owner,
          createdAt: playlist.createdAt,
          updatedAt: playlist.updatedAt,
          description: playlist.description,
          videos: playlist.videos.map((video) => ({
            r: video.reference,
            t: video.title,
            a: video.addedAt,
            p: video.publishedAt,
          })),
        }
        return JSON.stringify(playlistRaw)
      case "private":
      case "protected":
        if (!password) {
          throw new Error("Cannot serialize encrypted data. Password is not provided.")
        }

        const encryptedValues = PlaylistEncryptedDataRawSchema.parse({
          description: playlist.description,
          videos: playlist.videos.map((video) => ({
            r: video.reference,
            t: video.title,
            a: video.addedAt,
            p: video.publishedAt,
          })),
        })
        const encryptedData = encryptData(JSON.stringify(encryptedValues), password)
        const encryptedPlaylistRaw: PlaylistRaw = {
          id: playlist.id,
          name: playlist.name,
          type,
          owner: playlist.owner,
          createdAt: playlist.createdAt,
          updatedAt: playlist.updatedAt,
          encryptedData,
        }
        return JSON.stringify(encryptedPlaylistRaw)
      default:
        throw new Error(`Playlist type ${type} is not supported.`)
    }
  }
}
