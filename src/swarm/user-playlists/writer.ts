import { UserPlaylistsSerializer } from "../../serializers"
import BaseWriter from "../base-writer"
import PlaylistReader from "../playlist/reader"
import { USER_PLAYLISTS_TOPIC } from "./reader"

import type { UserPlaylists, Playlist } from "../.."
import type { BeeClient, Reference } from "../../clients"
import type { WriterOptions, WriterUploadOptions } from "../base-writer"

interface UserPlaylistsWriterOptions extends WriterOptions {}

interface UserPlaylistsWriterUploadOptions extends WriterUploadOptions {}

export default class UserPlaylistsWriter extends BaseWriter<UserPlaylists> {
  private playlists: UserPlaylists
  private beeClient: BeeClient

  constructor(playlists: UserPlaylists, opts: UserPlaylistsWriterOptions) {
    super(playlists, opts)

    this.playlists = playlists
    this.beeClient = opts.beeClient
  }

  async upload(opts?: UserPlaylistsWriterUploadOptions): Promise<Reference> {
    const batchId = await this.beeClient.stamps.fetchBestBatchId()
    const playlistsRaw = new UserPlaylistsSerializer().serialize(this.playlists)

    const { reference } = await this.beeClient.bzz.upload(playlistsRaw, {
      batchId,
      headers: {
        "Content-Type": "application/json",
        // "x-etherna-reason": "user-playlists-upload",
      },
      signal: opts?.signal,
      onUploadProgress: opts?.onUploadProgress,
    })

    const feed = this.beeClient.feed.makeFeed(
      USER_PLAYLISTS_TOPIC,
      this.beeClient.signer!.address,
      "sequence"
    )
    const writer = this.beeClient.feed.makeWriter(feed)
    await writer.upload(reference, {
      batchId,
      headers: {
        // "x-etherna-reason": "user-playlists-feed-update",
      },
      signal: opts?.signal,
    })

    return reference
  }

  static defaultChannelPlaylists(owner: string): Playlist {
    return {
      id: PlaylistReader.channelPlaylistId,
      reference: "",
      type: "public",
      owner,
      videos: [],
      name: "",
      description: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  static defaultSavedPlaylists(owner: string): Playlist {
    return {
      id: PlaylistReader.savedPlaylistId,
      reference: "",
      type: "unlisted",
      owner,
      videos: [],
      name: "",
      description: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }
}
