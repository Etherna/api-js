import { UserPlaylistsRawSchema } from "../../schemas/user-playlists"
import BaseDeserializer from "../base-deserializer"

import type { UserPlaylists } from "../.."

export default class UserPlaylistsDeserializer extends BaseDeserializer<UserPlaylists> {
  constructor() {
    super()
  }

  deserialize(data: string): UserPlaylists {
    const userPlaylistsRaw = UserPlaylistsRawSchema.parse(JSON.parse(data))

    return {
      channel: userPlaylistsRaw.channel ?? null,
      saved: userPlaylistsRaw.saved ?? null,
      custom: userPlaylistsRaw.custom ?? [],
    }
  }
}
