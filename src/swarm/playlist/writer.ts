import { PlaylistSerializer } from "../../serializers"
import { BaseWriter } from "../base-writer"
import { createPlaylistTopicName, getPlaylistCacheId, PlaylistCache } from "./reader"

import type { Playlist } from "../.."
import type { BeeClient, Reference } from "../../clients"
import type { WriterOptions, WriterUploadOptions } from "../base-writer"

interface PlaylistWriterOptions extends WriterOptions {}

interface PlaylistWriterUploadOptions extends WriterUploadOptions {
  encryptionPassword?: string
}

export class PlaylistWriter extends BaseWriter<Playlist> {
  private playlist: Playlist
  private beeClient: BeeClient

  constructor(playlist: Playlist, opts: PlaylistWriterOptions) {
    super(playlist, opts)

    this.playlist = playlist
    this.beeClient = opts.beeClient
  }

  async upload(opts?: PlaylistWriterUploadOptions): Promise<Reference> {
    const isEncrypted = ["private", "protected"].includes(this.playlist.type)
    if (isEncrypted && !opts?.encryptionPassword) {
      throw new Error("Please insert a password for a private playlist")
    }

    this.playlist.updatedAt = Date.now()

    const batchId = opts?.batchId ?? (await this.beeClient.stamps.fetchBestBatchId())
    const rawPlaylist = new PlaylistSerializer().serialize(this.playlist, opts?.encryptionPassword)

    const { reference } = await this.beeClient.bzz.upload(rawPlaylist, {
      batchId,
      deferred: opts?.deferred,
      encrypt: opts?.encrypt,
      pin: opts?.pin,
      tag: opts?.tag,
      headers: {
        "Content-Type": "application/json",
        // "x-etherna-reason": "swarm-playlist-upload",
      },
    })

    const topicName = createPlaylistTopicName(this.playlist.id)
    const feed = this.beeClient.feed.makeFeed(topicName, this.playlist.owner, "epoch")
    const writer = this.beeClient.feed.makeWriter(feed)
    await writer.upload(reference, {
      batchId,
      deferred: opts?.deferred,
      encrypt: opts?.encrypt,
      pin: opts?.pin,
      tag: opts?.tag,
      headers: {
        // "x-etherna-reason": "swarm-playlist-feed-upload",
      },
      signal: opts?.signal,
      onUploadProgress: opts?.onUploadProgress,
    })

    const reader = this.beeClient.feed.makeReader(feed)
    const { reference: feedReference } = await reader.download({
      headers: {
        // "x-etherna-reason": "playlist-feed",
      },
    })

    const rootManifest = await this.beeClient.feed.createRootManifest(feed, {
      batchId,
      deferred: opts?.deferred,
      encrypt: opts?.encrypt,
      pin: opts?.pin,
      tag: opts?.tag,
      headers: {
        // "x-etherna-reason": "swarm-playlist-feed-root-manifest",
      },
    })

    this.playlist.reference = rootManifest

    PlaylistCache.set(getPlaylistCacheId(this.playlist.owner, this.playlist.id), this.playlist)

    return reference
  }
}
