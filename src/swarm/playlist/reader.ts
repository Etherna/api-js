import { PlaylistDeserializer } from "../../serializers"
import { Cache } from "../../utils/cache"
import { BaseReader } from "../base-reader"

import type { Playlist, PlaylistRaw } from "../.."
import type { BeeClient, EthAddress, Reference } from "../../clients"
import type { ReaderDownloadOptions, ReaderOptions } from "../base-reader"

interface PlaylistReaderOptions extends ReaderOptions {
  prefetchData?: Playlist
}

export const PlaylistCache = new Cache<string, Playlist>()

export const getPlaylistCacheId = (owner: EthAddress, id: string) => `${owner}/${id}`

export const getFeedTopicName = (id: string) => `EthernaPlaylist:${id}`

export class PlaylistReader extends BaseReader<Playlist | null, string, PlaylistRaw> {
  private reference?: Reference
  private id: string
  private owner: EthAddress
  private beeClient: BeeClient

  static channelPlaylistId = "Channel" as const
  static savedPlaylistId = "Saved" as const

  constructor(id: string, owner: EthAddress, opts: PlaylistReaderOptions) {
    super(id, opts)

    this.beeClient = opts.beeClient
    this.id = id
    this.owner = owner
  }

  async download(opts?: ReaderDownloadOptions): Promise<Playlist> {
    const cacheId = getPlaylistCacheId(this.owner, this.id)

    if (PlaylistCache.has(cacheId)) {
      return PlaylistCache.get(cacheId)!
    }

    if (!this.reference) {
      const topicName = getFeedTopicName(this.id!)
      const feed = this.beeClient.feed.makeFeed(topicName, this.owner!, "epoch")
      const reader = this.beeClient.feed.makeReader(feed)
      this.reference = (
        await reader.download({
          headers: {
            // "x-etherna-reason": "playlist-feed",
          },
        })
      ).reference
    }

    const playlistData = await this.beeClient.bzz.download(this.reference, {
      headers: {
        // "x-etherna-reason": "playlist",
      },
      maxResponseSize: opts?.maxResponseSize,
      onDownloadProgress: opts?.onDownloadProgress,
    })

    const rawPlaylist = playlistData.data.text()
    const playlist = new PlaylistDeserializer().deserialize(rawPlaylist, {
      reference: this.reference,
    })

    this.rawResponse = playlistData.data.json<PlaylistRaw>()

    PlaylistCache.set(cacheId, playlist)

    return playlist
  }
}
