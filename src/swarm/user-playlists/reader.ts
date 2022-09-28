import type { UserPlaylists, UserPlaylistsRaw } from "../.."
import type { BeeClient, EthAddress } from "../../clients"
import { UserPlaylistsDeserializer } from "../../serializers"
import type { ReaderDownloadOptions, ReaderOptions } from "../base-reader"
import BaseReader from "../base-reader"

interface UserPlaylistsReaderOptions extends ReaderOptions {}

interface UserPlaylistsDownloadOptions extends ReaderDownloadOptions {}

export const USER_PLAYLISTS_TOPIC = "EthernaUserPlaylists"

export default class UserPlaylistsReader extends BaseReader<
  UserPlaylists,
  EthAddress,
  UserPlaylistsRaw
> {
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
      const feed = this.beeClient.feed.makeFeed(USER_PLAYLISTS_TOPIC, this.owner, "sequence")
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
