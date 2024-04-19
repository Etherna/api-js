import { PlaylistDeserializer } from "../../serializers"
import { Cache } from "../../utils/cache"
import { BaseReader } from "../base-reader"

import type { Playlist, PlaylistRaw } from "../.."
import type { BeeClient, EthAddress, Reference } from "../../clients"
import type { ReaderDownloadOptions, ReaderOptions } from "../base-reader"

interface PlaylistReaderOptions extends ReaderOptions {
  playlistId?: string
  playlistOwner?: EthAddress
  prefetchData?: Playlist
}

export const PlaylistCache = new Cache<string, Playlist>()

export const getFeedTopicName = (id: string) => `EthernaPlaylist:${id}`

export class PlaylistReader extends BaseReader<
  Playlist | null,
  Reference | undefined,
  PlaylistRaw
> {
  private reference?: string
  private id?: string
  private owner?: EthAddress
  private beeClient: BeeClient

  static channelPlaylistId = "__channel" as const
  static savedPlaylistId = "__saved" as const

  constructor(reference: Reference | undefined, opts: PlaylistReaderOptions) {
    super(reference, opts)

    this.reference = reference
    this.beeClient = opts.beeClient
    this.id = opts.playlistId
    this.owner = opts.playlistOwner
  }

  async download(opts?: ReaderDownloadOptions): Promise<Playlist> {
    if (!this.reference && (!this.id || !this.owner)) {
      throw new Error("Cannot fetch playlist. Missing reference or identifier.")
    }

    const cacheId = this.reference || `${this.owner}/${this.id}`

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
