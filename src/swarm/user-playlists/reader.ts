import { UserPlaylistsDeserializer } from "../../serializers"
import { BaseReader } from "../base-reader"

import type { UserPlaylists, UserPlaylistsRaw } from "../.."
import type { BeeClient, EthAddress } from "../../clients"
import type { ReaderDownloadOptions, ReaderOptions } from "../base-reader"

interface UserPlaylistsReaderOptions extends ReaderOptions {}

interface UserPlaylistsDownloadOptions extends ReaderDownloadOptions {}

export const USER_PLAYLISTS_TOPIC = "EthernaUserPlaylists"

export class UserPlaylistsReader extends BaseReader<UserPlaylists, EthAddress, UserPlaylistsRaw> {
  private owner: EthAddress
  private beeClient: BeeClient

  constructor(owner: EthAddress, opts: UserPlaylistsReaderOptions) {
    super(owner, opts)

    this.owner = owner
    this.beeClient = opts.beeClient
  }

  async download(opts?: UserPlaylistsDownloadOptions): Promise<UserPlaylists> {
    let userPlaylists: UserPlaylists = {
      channel: null,
      saved: null,
      custom: [],
    }

    try {
      const feed = this.beeClient.feed.makeFeed(USER_PLAYLISTS_TOPIC, this.owner, "epoch")
      console.log("DOWNLOAD FEED", feed)
      const reader = this.beeClient.feed.makeReader(feed)
      const { reference } = await reader.download({
        headers: {
          // "x-etherna-reason": "users-playlists-feed",
        },
      })
      const data = await this.beeClient.bzz.download(reference, {
        headers: {
          // "x-etherna-reason": "users-playlists",
        },
        onDownloadProgress: opts?.onDownloadProgress,
      })
      const rawPlaylists = data.data.text()
      userPlaylists = new UserPlaylistsDeserializer().deserialize(rawPlaylists)

      this.rawResponse = data.data.json<UserPlaylistsRaw>()
    } catch (error) {
      console.error(error)
    }

    return userPlaylists
  }
}
