import { BaseMantarayManifest } from "./base-manifest"
import { EthernaSdkError, throwSdkError } from "@/classes"
import { EmptyAddress, MANIFEST_DETAILS_PATH } from "@/consts"
import { PlaylistDetailsSchema, PlaylistPreviewSchema } from "@/schemas/playlist-schema"
import {
  bytesReferenceToReference,
  dateToTimestamp,
  decryptData,
  fetchAddressFromEns,
  isEmptyReference,
  isEnsAddress,
  isEthAddress,
  isValidReference,
  timestampToDate,
} from "@/utils"

import type {
  BaseManifestOptions,
  BaseManifestUploadOptions,
  BaseMantarayManifestDownloadOptions,
} from "./base-manifest"
import type { Video } from "./video-manifest"
import type { FeedInfo } from "@/clients"
import type {
  PlaylistDetails,
  PlaylistPreview,
  PlaylistType,
  PlaylistVideo,
} from "@/schemas/playlist-schema"
import type { EnsAddress, EthAddress } from "@/types/eth"
import type { BatchId, Reference } from "@/types/swarm"

export type PlaylistIdentification = Reference | { id: string; owner: EthAddress | EnsAddress }

export interface Playlist {
  reference: Reference
  rootManifest: Reference
  preview: PlaylistPreview
  details: PlaylistDetails
}

export const createPlaylistTopicName = (id: string) => `EthernaPlaylist:${id}`

/**
 * This class is used to fetch/update a playlist
 */
export class PlaylistManifest extends BaseMantarayManifest {
  private _ensName: EnsAddress | null = null
  protected override _preview: PlaylistPreview = {
    id: "",
    type: "public",
    name: "",
    owner: EmptyAddress,
    thumb: null,
    createdAt: dateToTimestamp(new Date()),
    updatedAt: dateToTimestamp(new Date()),
  }
  protected override _details: PlaylistDetails = {
    videos: [],
  }
  private _encryptedDetails?: string
  private _isEncrypted = false

  /**
   * Load a playlist from identification (rootManifest or id + owner)
   * @param identification Playlist identification (rootManifest or id + owner)
   * @param options Manifest options
   */
  constructor(identification: PlaylistIdentification, options: BaseManifestOptions)
  /**
   * Load a playlist from existing data for updating
   * @param playlist Playlist existing data
   * @param options Manifest options
   */
  constructor(playlist: Playlist, options: BaseManifestOptions)
  /**
   * Create new playlist
   * @param options Manifest options
   */
  constructor(options: BaseManifestOptions)
  constructor(
    input: PlaylistIdentification | Playlist | BaseManifestOptions,
    options?: BaseManifestOptions,
  ) {
    const init = "beeClient" in input ? undefined : input
    const opts = options ?? (input as BaseManifestOptions)

    super(init, opts)

    if (typeof init === "string" && isValidReference(init)) {
      this._rootManifest = init
    } else if (init && "id" in init && "owner" in init) {
      this._preview = {
        id: init.id,
        owner: isEthAddress(init.owner) ? init.owner : EmptyAddress,
        name: "",
        thumb: null,
        type: "public",
        createdAt: dateToTimestamp(new Date()),
        updatedAt: dateToTimestamp(new Date()),
      }

      if (isEnsAddress(init.owner)) {
        this._ensName = init.owner
      }
    } else {
      if (!opts.beeClient.signer) {
        throw new EthernaSdkError("MISSING_SIGNER", "Signer is required to upload")
      }

      if (init) {
        if (opts.beeClient.signer.address !== init.preview.owner) {
          throw new EthernaSdkError("PERMISSION_DENIED", "You can't update other user's profile")
        }

        this._preview = init.preview
        this._details = init.details
        this._reference = init.reference
        this._rootManifest = init.rootManifest
      } else {
        this._preview.owner = opts.beeClient.signer.address
      }
    }

    this.setPreviewProxy(this._preview)
    this.setDetailsProxy(this._details)
  }

  public get id() {
    return this._preview.id
  }

  public get owner() {
    return this._preview.owner
  }

  public get type() {
    return this._preview.type
  }
  public set type(value: PlaylistType) {
    this._preview.type = value

    if (this.isEncryptableType) {
      this._details.name = this._preview.name
      this._preview.name = ""
    } else {
      this._preview.name = this._details.name ?? this._preview.name
    }
  }

  public get isEncrypted() {
    return this._isEncrypted
  }

  public get isEncryptableType() {
    switch (this.type) {
      case "public":
        return false
      case "private":
      case "protected":
        return true
    }
  }

  public get previewName() {
    return this._preview.name
  }
  public set previewName(value: string) {
    if (!this.isEncryptableType) {
      throw new EthernaSdkError(
        "BAD_REQUEST",
        "Only private and protected playlists can have a preview name",
      )
    }
    this._preview.name = value
  }

  public get name() {
    return this.hasLoadedDetails ? this._details.name ?? this._preview.name : this._preview.name
  }
  public set name(value: string) {
    if (this.isEncryptableType) {
      this._details.name = value
    } else {
      this._preview.name = value
    }
  }

  public get description() {
    return this._details.description
  }
  public set description(value: string | undefined) {
    this._details.description = value
  }

  public get thumb() {
    return this._preview.thumb
  }

  public get passwordHint() {
    return this._preview.passwordHint
  }
  public set passwordHint(value: string | undefined) {
    this._preview.passwordHint = value
  }

  public get createdAt() {
    return timestampToDate(this._preview.createdAt)
  }

  public get updatedAt() {
    return timestampToDate(this._preview.updatedAt)
  }

  public get videos() {
    return this._details.videos.map((v) => ({
      title: v.t,
      reference: v.r,
      addedAt: timestampToDate(v.a),
      publishedAt: v.p ? timestampToDate(v.p) : null,
    }))
  }

  public override get serialized(): Playlist {
    return Object.freeze({
      reference: this.reference,
      rootManifest: this._rootManifest,
      preview: this._preview,
      details: this._details,
    })
  }

  public override async download(options: BaseMantarayManifestDownloadOptions): Promise<Playlist> {
    try {
      if (this._preview.owner === EmptyAddress && this._ensName) {
        this._preview.owner = (await fetchAddressFromEns(this._ensName)) ?? EmptyAddress
      }

      if (this._preview.owner === EmptyAddress) {
        throw new EthernaSdkError("INVALID_ARGUMENT", "Address or ENS name is required")
      }

      if (isEmptyReference(this._reference)) {
        const feed = await this.getPlaylistFeed()
        const reader = this.beeClient.feed.makeReader(feed)
        this._reference = (await reader.download({ ...options })).reference
        this._rootManifest = (await this.beeClient.feed.makeRootManifest(feed)).reference
      }

      const shouldDownloadPreview = options.mode === "preview" || options.mode === "full"
      const shouldDownloadDetails = options.mode === "details" || options.mode === "full"

      const previewData = shouldDownloadPreview
        ? await this.beeClient.bzz
            .download(this._reference, {
              headers: {
                // "x-etherna-reason": "playlist-preview",
              },
            })
            .then((res) => res.data.text())
        : await Promise.resolve(JSON.stringify(this._preview))
      const detailsData = shouldDownloadDetails
        ? await this.beeClient.bzz
            .downloadPath(this._reference, MANIFEST_DETAILS_PATH, {
              headers: {
                // "x-etherna-reason": "playlist-details",
              },
            })
            .then((res) => res.data.text())
        : await Promise.resolve(JSON.stringify(this._details))

      this._preview = PlaylistPreviewSchema.parse(JSON.parse(previewData))
      this._details = PlaylistDetailsSchema.parse(JSON.parse(detailsData))
      this._hasLoadedPreview = shouldDownloadPreview || this._hasLoadedPreview
      this._hasLoadedDetails = shouldDownloadDetails || this._hasLoadedDetails
      this._isDirty = false

      return this.serialized
    } catch (error) {
      throwSdkError(error)
    }
  }

  public override async upload(options?: BaseManifestUploadOptions): Promise<Playlist> {
    if (this.owner !== this.beeClient.signer?.address) {
      throw new EthernaSdkError("PERMISSION_DENIED", "You can't update other user's playlist")
    }

    try {
      await Promise.all([
        this.prepareForUpload(options?.batchId, options?.batchLabelQuery),
        this.loadNode(),
      ])

      // after 'prepareForUpload' batchId must be defined
      const batchId = this.batchId as BatchId

      // ensure data is not malformed
      this._preview = PlaylistPreviewSchema.parse(this._preview)
      this._details = PlaylistDetailsSchema.parse(this._details)

      // update data
      this.updateNodeDefaultEntries()
      this.enqueueData(new TextEncoder().encode(JSON.stringify(this._preview)), {
        ...options,
        batchId,
      })
      this.enqueueData(new TextEncoder().encode(JSON.stringify(this._details)), {
        ...options,
        batchId,
      })

      // save mantary node
      this._reference = await this.node
        .save(async (data) => {
          return this.enqueueData(data, {
            ...options,
            batchId,
          })
        })
        .then(bytesReferenceToReference)
      await this.queue.drain()

      // update feed
      const feed = this.beeClient.feed.makeFeed(
        createPlaylistTopicName(this.id),
        this.owner,
        "epoch",
      )
      const writer = this.beeClient.feed.makeWriter(feed)
      await Promise.all([
        writer.upload(this.reference, {
          batchId,
          deferred: options?.deferred,
          encrypt: options?.encrypt,
          pin: options?.pin,
          tag: options?.tag,
          signal: options?.signal,
          headers: {
            // "x-etherna-reason": "playlist-feed-update",
          },
        }),
        this.beeClient.feed.createRootManifest(feed, { batchId }),
      ])

      this._hasLoadedPreview = true
      this._hasLoadedDetails = true

      return this.serialized
    } catch (error) {
      throwSdkError(error)
    }
  }

  public decrypt(password: string) {
    if (!this.isEncrypted) {
      return
    }

    if (!this._encryptedDetails) {
      throw new EthernaSdkError(
        "BAD_REQUEST",
        "No encrypted data found. Try to download this playlist with mode set to 'full' or 'details'.",
      )
    }

    try {
      const decryptedData = decryptData(this._encryptedDetails, password)
      this._details = PlaylistDetailsSchema.parse(JSON.parse(decryptedData))
      this._encryptedDetails = undefined
      this._isEncrypted = false
    } catch (error) {
      throwSdkError(error)
    }
  }

  public addVideo(video: Video, publishAt?: Date) {
    this._details.videos.unshift({
      r: video.reference,
      t: video.preview.title,
      a: dateToTimestamp(new Date()),
      p: publishAt ? dateToTimestamp(publishAt) : undefined,
    })

    if (video.preview.thumbnail) {
      this.updateThumb(video)
    }
  }

  public replaceVideo(oldReference: Reference, newVideo: Video) {
    const playlistVideo = {
      r: newVideo.reference,
      t: newVideo.preview.title,
      a: dateToTimestamp(new Date()),
    } satisfies PlaylistVideo

    const videoIndex = this._details.videos.findIndex((video) => video.r === oldReference)

    if (videoIndex >= 0) {
      this._details.videos[videoIndex] = playlistVideo

      const shouldUpdateThumb = this._preview.thumb?.path.startsWith(`/${oldReference}`)
      if (shouldUpdateThumb) {
        this.updateThumb(newVideo)
      }
    } else {
      this.addVideo(newVideo)
    }
  }

  public removeVideos(videoRefsToRemove: Reference[]) {
    this._details.videos = this._details.videos.filter(
      (video) => !videoRefsToRemove.includes(video.r),
    )
  }

  private updateThumb(video: Video) {
    if (!video.preview.thumbnail) {
      return
    }

    const smallerThumb = video.preview.thumbnail.sources.sort((a, b) => a.width - b.width)[0]

    if (smallerThumb) {
      const smallerThumbPath = smallerThumb.path
        ? `/${video.reference}/${smallerThumb.path}`
        : `/${smallerThumb.reference}`

      this._preview.thumb = {
        blurhash: video.preview.thumbnail.blurhash,
        path: smallerThumbPath,
      }
    }
  }

  private async getPlaylistFeed(): Promise<FeedInfo> {
    if ((!this.id || this.owner === EmptyAddress) && isEmptyReference(this.rootManifest)) {
      throw new Error("id + owner or rootManifest must be provided")
    }

    const topicName = createPlaylistTopicName(this.id)
    const feed = this.beeClient.feed.makeFeed(topicName, this.owner, "epoch")

    if (!this.id || this.owner === "0x0") {
      const playlistFeed = await this.beeClient.feed.parseFeedFromRootManifest(this.rootManifest)
      this._preview.owner = `0x${playlistFeed.owner}`

      feed.owner = playlistFeed.owner
      feed.topic = playlistFeed.topic
    }

    return feed
  }
}
