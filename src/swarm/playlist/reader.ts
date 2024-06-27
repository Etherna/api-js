import { PlaylistDeserializer } from "../../serializers"
import { EmptyReference, isEmptyReference } from "../../utils"
import { Cache } from "../../utils/cache"
import { BaseReader } from "../base-reader"

import type { Playlist, PlaylistRaw } from "../.."
import type { BeeClient, EthAddress, FeedInfo, Reference } from "../../clients"
import type { ReaderDownloadOptions, ReaderOptions } from "../base-reader"

interface PlaylistReaderOptions extends ReaderOptions {
  prefetchData?: Playlist
}

export const PlaylistCache = new Cache<string, Playlist>()

export const getPlaylistCacheId = (owner: EthAddress, id: string) => `${owner}/${id}`

export const createPlaylistTopicName = (id: string) => `EthernaPlaylist:${id}`

export const parsePlaylistIdFromTopic = (topic: string) => topic.split(":")[1]

type PlaylistReaderIdentification = { id: string; owner: EthAddress } | { rootManifest: Reference }

export class PlaylistReader extends BaseReader<
  Playlist | null,
  PlaylistReaderIdentification,
  PlaylistRaw
> {
  private reference: Reference
  private id: string
  private owner: EthAddress
  private beeClient: BeeClient

  static channelPlaylistId = "Channel" as const
  static savedPlaylistId = "Saved" as const

  constructor(identification: PlaylistReaderIdentification, opts: PlaylistReaderOptions) {
    super(identification, opts)

    this.beeClient = opts.beeClient

    if ("rootManifest" in identification) {
      this.reference = identification.rootManifest
      this.id = ""
      this.owner = "0x0"
    } else {
      this.id = identification.id
      this.owner = identification.owner
      this.reference = EmptyReference
    }
  }

  async download(opts?: ReaderDownloadOptions): Promise<Playlist> {
    const cacheId = getPlaylistCacheId(this.owner, this.id)

    if (PlaylistCache.has(cacheId)) {
      return PlaylistCache.get(cacheId)!
    }

    const feed = await this.getPlaylistFeed()
    const reader = this.beeClient.feed.makeReader(feed)

    const { reference: playlistReference } = await reader.download({
      headers: {
        // "x-etherna-reason": "playlist-feed",
      },
    })

    const [playlistData, rootManifest] = await Promise.all([
      this.beeClient.bzz.download(playlistReference, {
        headers: {
          // "x-etherna-reason": "playlist",
        },
        maxResponseSize: opts?.maxResponseSize,
        onDownloadProgress: opts?.onDownloadProgress,
      }),
      this.beeClient.feed.makeRootManifest(feed),
    ])

    const rawPlaylist = playlistData.data.text()
    const playlist = new PlaylistDeserializer().deserialize(rawPlaylist, {
      reference: this.reference,
    })

    this.reference = rootManifest.reference
    this.id = playlist.id // can't derive from feed topic when only rootManifest is provided
    this.rawResponse = playlistData.data.json<PlaylistRaw>()

    PlaylistCache.set(cacheId, playlist)

    return playlist
  }

  async getPlaylistFeed(): Promise<FeedInfo<"epoch">> {
    if ((!this.id || this.owner === "0x0") && isEmptyReference(this.reference)) {
      throw new Error("id + owner or rootManifest must be provided")
    }

    const topicName = createPlaylistTopicName(this.id)
    const feed = this.beeClient.feed.makeFeed(topicName, this.owner, "epoch")

    if (!this.id || this.owner === "0x0") {
      const playlistFeed = await this.beeClient.feed.parseFeedFromRootManifest(this.reference)
      this.owner = `0x${playlistFeed.owner}`

      feed.owner = playlistFeed.owner
      feed.topic = playlistFeed.topic
    }

    return feed
  }
}
