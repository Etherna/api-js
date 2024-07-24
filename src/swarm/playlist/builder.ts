import { makeChunkedFile } from "@fairdatasociety/bmt-js"

import { Queue } from "../../classes/Queue"
import { MantarayNode } from "../../handlers/mantaray"
import { PlaylistDetailsRawSchema, PlaylistPreviewRawSchema } from "../../schemas/playlist"
import { Video } from "../../schemas/video"
import { PlaylistSerializer } from "../../serializers"
import { EmptyReference, encryptData } from "../../utils"
import {
  bytesReferenceToReference,
  encodePath,
  EntryMetadataContentTypeKey,
  EntryMetadataFilenameKey,
  isZeroBytesReference,
  jsonToReference,
  referenceToBytesReference,
  RootPath,
  textToReference,
  WebsiteIndexDocumentSuffixKey,
  ZeroHashReference,
} from "../../utils/mantaray"
import { dateToTimestamp } from "../../utils/time"

import type { BatchId, BeeClient, EthAddress, Reference } from "../../clients"
import type { BytesReference } from "../../handlers"
import type {
  PlaylistDetails,
  PlaylistDetailsRaw,
  PlaylistPreview,
  PlaylistPreviewRaw,
  PlaylistType,
  PlaylistVideoRaw,
} from "../../schemas/playlist"

interface PlaylistBuilderLoadOptions {
  beeClient: BeeClient
  signal?: AbortSignal
}

interface PlaylistBuilderSaveOptions {
  beeClient: BeeClient
  batchId: BatchId
  signal?: AbortSignal
}

export const PLAYLIST_PREVIEW_META_PATH = "preview"
export const PLAYLIST_DETAILS_META_PATH = "details"

export class PlaylistBuilder {
  reference: Reference
  previewMeta: PlaylistPreviewRaw
  detailsMeta: PlaylistDetailsRaw
  node: MantarayNode

  private queue: Queue
  private playlistPassword?: string
  private encryptedDetails?: string

  constructor() {
    this.previewMeta = {
      id: crypto.randomUUID(),
      name: "",
      owner: "0x0",
      thumb: null,
      type: "public",
      createdAt: dateToTimestamp(new Date()),
      updatedAt: dateToTimestamp(new Date()),
    }
    this.detailsMeta = {
      videos: [],
    }
    this.queue = new Queue()
    this.node = new MantarayNode()
    this.reference = EmptyReference

    this.updateNode()
  }

  // methods

  initialize(
    reference: Reference,
    ownerAddress: EthAddress,
    previewMeta?: PlaylistPreview,
    detailsMeta?: PlaylistDetails,
  ) {
    const serializer = new PlaylistSerializer()

    this.reference = reference || this.reference
    this.previewMeta = previewMeta
      ? PlaylistPreviewRawSchema.parse(JSON.parse(serializer.serializePreview(previewMeta)))
      : this.previewMeta
    this.detailsMeta = detailsMeta
      ? PlaylistDetailsRawSchema.parse(JSON.parse(serializer.serializeDetails(detailsMeta)))
      : this.detailsMeta
    this.previewMeta.owner = ownerAddress
    this.updateNode()
  }

  async loadNode(opts: PlaylistBuilderLoadOptions): Promise<void> {
    if (!isZeroBytesReference(this.reference)) {
      await this.node.load(async (reference) => {
        const data = await opts.beeClient.bytes.download(bytesReferenceToReference(reference), {
          signal: opts.signal,
        })
        return data
      }, referenceToBytesReference(this.reference))
    }
  }

  async saveNode(opts: PlaylistBuilderSaveOptions): Promise<Reference> {
    const batchId = opts.batchId

    this.updateNode()

    const previewData = JSON.stringify(this.previewMeta)
    const detailsData = this.isEncrypted ? this.encryptedDetails : JSON.stringify(this.detailsMeta)

    this.enqueueData(new TextEncoder().encode(previewData), opts.beeClient, batchId)
    this.enqueueData(new TextEncoder().encode(detailsData), opts.beeClient, batchId)

    const reference = await this.node.save(async (data) => {
      return this.enqueueData(data, opts.beeClient, batchId, opts.signal)
    })
    await this.queue.drain()

    this.reference = bytesReferenceToReference(reference)

    return this.reference
  }

  get isEncrypted() {
    return this.previewMeta.type === "private" || this.previewMeta.type === "protected"
  }

  updateName(name: string, type: "preview" | "details" = "preview") {
    this.previewMeta.name = type === "preview" ? name : this.previewMeta.name
    this.detailsMeta.name = type === "details" ? name : this.detailsMeta.name
    this.updateNode()
  }

  updateType(type: PlaylistType) {
    this.previewMeta.type = type
    this.updateNode()
  }

  updatePasswordHint(passwordHint: string) {
    this.previewMeta.passwordHint = passwordHint
    this.updateNode()
  }

  updateDescription(description: string) {
    this.detailsMeta.description = description
    this.updateNode()
  }

  updateThumb(video: Video) {
    const smallerThumb = video.preview.thumbnail?.sources.sort((a, b) => a.width - b.width)[0]

    if (smallerThumb) {
      const smallerThumbPath = smallerThumb.path
        ? `/${video.reference}/${smallerThumb.path}`
        : `/${smallerThumb.reference}`

      this.previewMeta.thumb = {
        blurhash: video.preview.thumbnail!.blurhash,
        path: smallerThumbPath,
      }
    }

    this.updateNode()
  }

  addVideos(videosToAdd: Video[], publishAt?: Date) {
    this.detailsMeta.videos = [
      ...videosToAdd.map((video) => ({
        r: video.reference,
        t: video.preview.title,
        a: dateToTimestamp(new Date()),
        p: publishAt ? dateToTimestamp(publishAt) : undefined,
      })),
      ...this.detailsMeta.videos,
    ]

    const firstVidWithThumb = videosToAdd.reverse().find((vid) => vid.preview.thumbnail)
    if (firstVidWithThumb) {
      this.updateThumb(firstVidWithThumb)
    }

    this.updateNode()
  }

  replaceVideo(oldReference: Reference, newVideo: Video) {
    const playlistVideo = {
      r: newVideo.reference,
      t: newVideo.preview.title,
      a: dateToTimestamp(new Date()),
    } satisfies PlaylistVideoRaw

    const videoIndex = this.detailsMeta.videos.findIndex((video) => video.r === oldReference)
    if (videoIndex === -1) {
      this.addVideos([newVideo])
      return
    }

    this.detailsMeta.videos[videoIndex] = playlistVideo

    const shouldUpdateThumb = this.previewMeta.thumb?.path.startsWith(`/${oldReference}`)
    if (shouldUpdateThumb) {
      this.updateThumb(newVideo)
    }

    this.updateNode()
  }

  removeVideos(videoRefsToRemove: Reference[]) {
    this.detailsMeta.videos = this.detailsMeta.videos.filter(
      (video) => !videoRefsToRemove.includes(video.r),
    )
  }

  setEncryptionPassword(password: string) {
    this.playlistPassword = password
    this.updateNode()
  }

  updateNode() {
    // update timestamp
    this.previewMeta.updatedAt = dateToTimestamp(new Date())

    this.node.addFork(encodePath(RootPath), ZeroHashReference, {
      [WebsiteIndexDocumentSuffixKey]: PLAYLIST_PREVIEW_META_PATH,
    })
    this.node.addFork(encodePath(PLAYLIST_PREVIEW_META_PATH), jsonToReference(this.previewMeta), {
      [EntryMetadataContentTypeKey]: "application/json",
      [EntryMetadataFilenameKey]: `${PLAYLIST_PREVIEW_META_PATH}.json`,
    })

    // cleanup: remove publish status for videos already published
    this.detailsMeta.videos = this.detailsMeta.videos.map((vid) => ({
      ...vid,
      p: vid.p && vid.p > dateToTimestamp(new Date()) ? vid.p : undefined,
    }))

    const detailsText = JSON.stringify(this.detailsMeta)
    const detailsData = this.isEncrypted
      ? encryptData(detailsText, this.playlistPassword ?? "")
      : detailsText

    if (this.isEncrypted) {
      this.encryptedDetails = detailsData
    }

    this.node.addFork(encodePath(PLAYLIST_DETAILS_META_PATH), textToReference(detailsData), {
      [EntryMetadataContentTypeKey]: this.isEncrypted
        ? "application/octet-stream"
        : "application/json",
      [EntryMetadataFilenameKey]: `${PLAYLIST_DETAILS_META_PATH}.json`,
    })
  }

  // private

  private enqueueData(
    data: Uint8Array,
    beeClient: BeeClient,
    batchId: BatchId,
    signal?: AbortSignal,
  ) {
    const chunkedFile = makeChunkedFile(data)
    this.queue.enqueue(async () => {
      await beeClient.bytes.upload(data, { batchId, signal })
    })
    return chunkedFile.address() as BytesReference
  }
}
