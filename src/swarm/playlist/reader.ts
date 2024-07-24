import { PlaylistDetails, PlaylistPreview } from "../../schemas/playlist"
import { PlaylistDeserializer } from "../../serializers"
import { EmptyReference, fetchAddressFromEns, isEmptyReference, isEnsAddress } from "../../utils"

import type { BeeClient, EnsAddress, EthAddress, FeedInfo, Reference } from "../../clients"
import type { ReaderOptions } from "../base-reader"

interface PlaylistReaderOptions extends ReaderOptions {}

interface PlaylistReaderDownloadOptions {
  mode: "preview" | "details" | "full"
  signal?: AbortSignal
  prefetchedPreview?: PlaylistPreview
}

export const createPlaylistTopicName = (id: string) => `EthernaPlaylist:${id}`

export type PlaylistIdentification =
  | { id: string; owner: EthAddress | EnsAddress }
  | { rootManifest: Reference }

export class PlaylistReader {
  private rootManifest: Reference
  private id: string
  private owner: EthAddress | EnsAddress
  private beeClient: BeeClient

  static channelPlaylistId = "Channel" as const
  static savedPlaylistId = "Saved" as const

  constructor(identification: PlaylistIdentification, opts: PlaylistReaderOptions) {
    this.beeClient = opts.beeClient

    if ("rootManifest" in identification) {
      this.rootManifest = identification.rootManifest
      this.id = ""
      this.owner = "0x0"
    } else {
      this.id = identification.id
      this.owner = identification.owner
      this.rootManifest = EmptyReference
    }
  }

  async download(opts: PlaylistReaderDownloadOptions) {
    const feed = await this.getPlaylistFeed()
    const reader = this.beeClient.feed.makeReader(feed)

    const { reference: playlistReference } = await reader.download({
      headers: {
        // "x-etherna-reason": "playlist-feed",
      },
    })

    const [playlistPreviewData, playlistDetailsData, rootManifest] = await Promise.all([
      opts.prefetchedPreview && opts.mode !== "preview"
        ? Promise.resolve(JSON.stringify(opts.prefetchedPreview))
        : this.beeClient.bzz
            .download(playlistReference, {
              headers: {
                // "x-etherna-reason": "playlist-preview",
              },
            })
            .then((res) => res.data.text()),
      opts.mode !== "preview"
        ? this.beeClient.bzz
            .downloadPath(playlistReference, "details", {
              headers: {
                // "x-etherna-reason": "playlist-details",
              },
            })
            .then((res) => res.data.text())
        : Promise.resolve(null),
      this.beeClient.feed.makeRootManifest(feed),
    ])

    const deserializer = new PlaylistDeserializer()
    const preview = deserializer.deserializePreview(playlistPreviewData, {
      rootManifest: rootManifest.reference,
    })
    const { details, encryptedData } = playlistDetailsData
      ? deserializer.deserializeDetails(playlistDetailsData)
      : { details: { videos: [] } as PlaylistDetails, encryptedData: null }

    this.rootManifest = rootManifest.reference
    this.id = preview.id // can't derive from feed topic when only rootManifest is provided

    return {
      reference: playlistReference,
      preview,
      details,
      encryptedData,
    }
  }

  async getPlaylistFeed(): Promise<FeedInfo<"epoch">> {
    if ((!this.id || this.owner === "0x0") && isEmptyReference(this.rootManifest)) {
      throw new Error("id + owner or rootManifest must be provided")
    }

    if (isEnsAddress(this.owner)) {
      const ethAddress = await fetchAddressFromEns(this.owner)

      if (!ethAddress) {
        throw new Error(`Could not resolve ENS address: '${this.owner}'`)
      }

      this.owner = ethAddress
    }

    const topicName = createPlaylistTopicName(this.id)
    const feed = this.beeClient.feed.makeFeed(topicName, this.owner, "epoch")

    if (!this.id || this.owner === "0x0") {
      const playlistFeed = await this.beeClient.feed.parseFeedFromRootManifest(this.rootManifest)
      this.owner = `0x${playlistFeed.owner}`

      feed.owner = playlistFeed.owner
      feed.topic = playlistFeed.topic
    }

    return feed
  }
}
