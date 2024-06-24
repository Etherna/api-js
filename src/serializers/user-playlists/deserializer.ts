import { UserPlaylistsRawSchema } from "../../schemas/playlists"
import { BaseDeserializer } from "../base-deserializer"

import type { UserPlaylists } from "../.."

export class UserPlaylistsDeserializer extends BaseDeserializer<UserPlaylists> {
  constructor() {
    super()
  }

  deserialize(data: string): UserPlaylists {
    const userPlaylistsRaw = UserPlaylistsRawSchema.parse(JSON.parse(data))

    return userPlaylistsRaw
  }
}
