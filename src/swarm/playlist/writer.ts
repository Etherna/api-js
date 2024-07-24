import { Playlist } from "../../schemas/playlist"
import { PlaylistDeserializer, PlaylistSerializer } from "../../serializers"
import { EmptyReference, isEmptyReference } from "../../utils"
import { PlaylistBuilder } from "./builder"
import { createPlaylistTopicName } from "./reader"

import type { BeeClient, EthAddress, Reference } from "../../clients"
import type { WriterOptions, WriterUploadOptions } from "../base-writer"

interface PlaylistWriterOptions extends WriterOptions {}

interface PlaylistWriterUploadOptions extends WriterUploadOptions {}

export class PlaylistWriter {
  private playlistBuilder: PlaylistBuilder
  private beeClient: BeeClient

  constructor(playlistBuilder: PlaylistBuilder, opts: PlaylistWriterOptions) {
    this.playlistBuilder = playlistBuilder
    this.beeClient = opts.beeClient
  }

  async upload(opts?: PlaylistWriterUploadOptions) {
    const batchId = opts?.batchId ?? (await this.beeClient.stamps.fetchBestBatchId())

    // save mantary node
    const reference = await this.playlistBuilder.saveNode({
      beeClient: this.beeClient,
      batchId,
      signal: opts?.signal,
    })

    // update feed
    const topicName = createPlaylistTopicName(this.playlistBuilder.previewMeta.id)
    const feed = this.beeClient.feed.makeFeed(
      topicName,
      this.playlistBuilder.previewMeta.owner,
      "epoch",
    )
    const writer = this.beeClient.feed.makeWriter(feed)

    const [, rootManifest] = await Promise.all([
      writer.upload(reference, {
        batchId,
        deferred: opts?.deferred,
        encrypt: opts?.encrypt,
        pin: opts?.pin,
        tag: opts?.tag,
        headers: {
          // "x-etherna-reason": "playlist-feed-update",
        },
        signal: opts?.signal,
      }),
      this.beeClient.feed.createRootManifest(feed, { batchId }),
    ])

    const deserializer = new PlaylistDeserializer()
    const preview = deserializer.deserializePreview(
      JSON.stringify(this.playlistBuilder.previewMeta),
      {
        rootManifest,
      },
    )
    const { details } = deserializer.deserializeDetails(
      JSON.stringify(this.playlistBuilder.detailsMeta),
    )

    return {
      reference,
      preview,
      details,
    }
  }

  static emptyPlaylist(owner: EthAddress, id?: string): Playlist {
    return {
      reference: EmptyReference,
      preview: {
        id: id ?? crypto.randomUUID(),
        type: "public",
        name: "",
        owner,
        thumb: null,
        rootManifest: EmptyReference,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      details: {
        videos: [],
      },
    }
  }
}
