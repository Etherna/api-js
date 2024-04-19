import { UserPlaylistsSchema } from "../../schemas/user-playlists"
import { BaseSerializer } from "../base-serializer"

import type { UserPlaylistsRaw } from "../.."

export class UserPlaylistsSerializer extends BaseSerializer {
  constructor() {
    super()
  }

  serialize(item: object): string {
    const usersPlaylists = UserPlaylistsSchema.parse(item)

    const usersPlaylistsRaw: UserPlaylistsRaw = {}

    if (usersPlaylists.channel) {
      usersPlaylistsRaw.channel = usersPlaylists.channel
    }
    if (usersPlaylists.saved) {
      usersPlaylistsRaw.saved = usersPlaylists.saved
    }
    if (usersPlaylists.custom.length > 0) {
      usersPlaylistsRaw.custom = usersPlaylists.custom
    }

    return JSON.stringify(usersPlaylistsRaw)
  }
}
