import { UserPlaylistsRawSchema } from "../../schemas/playlists"
import { BaseSerializer } from "../base-serializer"

export class UserPlaylistsSerializer extends BaseSerializer {
  constructor() {
    super()
  }

  serialize(item: object): string {
    const usersPlaylists = UserPlaylistsRawSchema.parse(item)

    return JSON.stringify(usersPlaylists)
  }
}
