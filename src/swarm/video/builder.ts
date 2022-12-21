import { makeChunkedFile } from "@fairdatasociety/bmt-js"

import Queue from "../../handlers/Queue"
import { MantarayFork, MantarayNode } from "../../handlers/mantaray"
import { beeReference } from "../../schemas/base"
import { imageType } from "../../schemas/image"
import { MantarayNodeSchema } from "../../schemas/mantaray"
import { VideoDetailsRawSchema, VideoPreviewRawSchema } from "../../schemas/video"
import { VideoDeserializer, VideoSerializer } from "../../serializers"
import { isValidReference } from "../../utils"
import {
  jsonToReference,
  encodePath,
  EntryMetadataContentTypeKey,
  EntryMetadataFilenameKey,
  getReferenceFromData,
  RootPath,
  WebsiteIndexDocumentSuffixKey,
  ZeroHashReference,
  referenceToBytesReference,
  bytesReferenceToReference,
  getBzzNodeInfo,
  isZeroBytesReference,
} from "../../utils/mantaray"
import { getVideoMeta } from "../../utils/media"

import type {
  ImageType,
  VideoDetails,
  VideoPreview,
  VideoQuality,
  MantarayNode as MantarayNodeType,
} from "../.."
import type { BatchId, BeeClient, Reference } from "../../clients"
import type { ImageRawSource } from "../../schemas/image"
import type { VideoDetailsRaw, VideoPreviewRaw, VideoSourceRaw } from "../../schemas/video"

interface VideoBuilderOptions {
  reference?: Reference
  ownerAddress: string
  beeClient: BeeClient
  batchId?: BatchId
  previewMeta?: VideoPreview
  detailsMeta?: VideoDetails
}

export const VIDEO_PREVIEW_META_PATH = "preview"
export const VIDEO_DETAILS_META_PATH = "details"

export default class VideoBuilder {
  reference: Reference
  previewMeta: VideoPreviewRaw
  detailsMeta: VideoDetailsRaw
  node: MantarayNode
  batchId?: BatchId

  private beeClient: BeeClient
  private queue: Queue

  constructor(opts: VideoBuilderOptions) {
    this.previewMeta = opts.previewMeta
      ? VideoPreviewRawSchema.parse(opts.previewMeta)
      : {
          title: "",
          duration: 0,
          thumbnail: null,
          ownerAddress: opts.ownerAddress,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
    this.detailsMeta = opts.detailsMeta
      ? VideoDetailsRawSchema.parse(opts.detailsMeta)
      : {
          description: "",
          aspectRatio: 1,
          sources: [],
          batchId: null,
        }
    this.beeClient = opts.beeClient
    this.batchId = opts.batchId
    this.queue = new Queue()

    this.node = new MantarayNode()
    this.node.addFork(encodePath(RootPath), ZeroHashReference, {
      [WebsiteIndexDocumentSuffixKey]: "preview",
    })

    this.reference = opts.reference ?? bytesReferenceToReference(ZeroHashReference)

    this.updateNode()
  }

  async loadNode() {
    if (!isZeroBytesReference(this.reference)) {
      await this.node.load(async reference => {
        const data = await this.beeClient.bytes.download(bytesReferenceToReference(reference))
        return data
      }, referenceToBytesReference(this.reference))
    }

    const videoReferences = this.detailsMeta.sources
      .map(s => (s.type === "mp4" ? s.reference : null))
      .filter(ref => ref && isValidReference(ref)) as Reference[]
    const thumbReferences = (this.previewMeta.thumbnail?.sources ?? [])
      .map(source => source.reference)
      .filter(ref => ref && isValidReference(ref)) as Reference[]

    const references = [...videoReferences, ...thumbReferences]

    const bytesReferences = await Promise.all(
      references.map(ref => getBzzNodeInfo(ref, this.beeClient))
    )

    if (this.previewMeta.thumbnail) {
      this.previewMeta.thumbnail.sources = this.previewMeta.thumbnail.sources.map(source => {
        if (source.path) return source

        const reference = references.findIndex(ref => ref === source.reference)
        const contentType = bytesReferences[reference]?.contentType
        const typeParse = imageType.safeParse(contentType?.split("/")[1])
        const type = typeParse.success ? typeParse.data : "jpeg"
        const bytesReference = bytesReferences[reference]?.entry

        if (!bytesReference) {
          throw new Error(`Could not find raw reference for image source: '${source.reference}'`)
        }

        const newSource = this.addThumbSource(
          source.width,
          type,
          bytesReferenceToReference(bytesReference)
        )
        return newSource
      })
    }
    this.detailsMeta.sources = this.detailsMeta.sources.map(source => {
      if (source.path || source.type !== "mp4") return source

      const reference = references.findIndex(ref => ref === source.reference)
      const bytesReference = bytesReferences[reference]?.entry

      if (!bytesReference) {
        throw new Error(`Could not find raw reference for video source: '${source.reference}'`)
      }

      const newSource = this.addVideoSource(
        source.quality,
        source.size,
        bytesReferenceToReference(bytesReference)
      )
      return newSource
    })
  }

  async saveNode() {
    if (!this.batchId) throw new Error("BatchId is missing")

    // 1. deserialize with dummy params
    // 2. re-serialize in a raw format
    // validation: raw -> parsed -> raw
    this.previewMeta = JSON.parse(
      new VideoSerializer().serializePreview(
        new VideoDeserializer("http://doesntmatter.com").deserializePreview(
          JSON.stringify(this.previewMeta),
          { reference: "0".repeat(64) }
        )
      )
    )
    this.detailsMeta = JSON.parse(
      new VideoSerializer().serializeDetails(
        new VideoDeserializer("http://doesntmatter.com").deserializeDetails(
          JSON.stringify(this.detailsMeta),
          { reference: "0".repeat(64) }
        )
      )
    )

    this.updateNode()

    this.enqueueData(new TextEncoder().encode(JSON.stringify(this.previewMeta)))
    this.enqueueData(new TextEncoder().encode(JSON.stringify(this.detailsMeta)))

    const reference = await this.node.save(async data => this.enqueueData(data))
    await this.queue.drain()

    this.reference = bytesReferenceToReference(reference)
  }

  async addMp4Source(data: Uint8Array, quality: VideoQuality) {
    const meta = await getVideoMeta(data)

    if (!this.previewMeta.duration) {
      this.previewMeta.duration = meta.duration
    }
    if (!this.detailsMeta.aspectRatio) {
      this.detailsMeta.aspectRatio = meta.width / meta.height
    }

    const source = this.addVideoSource(quality, data.length, getReferenceFromData(data))
    this.detailsMeta.sources.push(source)
  }

  async addThumbnailSource(data: Uint8Array, width: number, type: ImageType) {
    if (!this.previewMeta.thumbnail) {
      throw new Error("Thumbnail is missing")
    }

    const source = this.addThumbSource(width, type, getReferenceFromData(data))
    this.previewMeta.thumbnail.sources.push(source)
  }

  removeMp4Source(quality: VideoQuality) {
    const path = this.getVideoPath(quality)
    this.node.removePath(encodePath(path))
    this.detailsMeta.sources = this.detailsMeta.sources.filter(
      s => s.type === "mp4" && s.quality !== quality
    )
    this.updateNode()
  }

  removeThumbnail() {
    for (const source of this.previewMeta.thumbnail?.sources ?? []) {
      const path = this.getThumbPath(source.width, source.type)
      this.node.removePath(encodePath(path))
    }
    this.previewMeta.thumbnail = null
    this.updateNode()
  }

  serialize(): string {
    return JSON.stringify({
      reference: this.reference,
      previewMeta: this.previewMeta,
      detailsMeta: this.detailsMeta,
      node: this.node.readable,
    })
  }

  deserialize(value: string) {
    const obj = JSON.parse(value)
    this.reference = beeReference.parse(obj.reference) as Reference
    this.previewMeta = VideoPreviewRawSchema.parse(obj.previewMeta)
    this.detailsMeta = VideoDetailsRawSchema.parse(obj.detailsMeta)

    const recursiveLoadNode = (node: MantarayNodeType): MantarayNode => {
      const mantarayNode = new MantarayNode()

      if (node.entry) {
        mantarayNode.setEntry = referenceToBytesReference(node.entry as Reference)
      }
      if (node.metadata) {
        mantarayNode.setMetadata = node.metadata
      }
      if (Object.keys(node.forks).length > 0) {
        mantarayNode.forks = Object.entries(node.forks).reduce((acc, [path, value]) => {
          const fork = new MantarayFork(encodePath(value.prefix), recursiveLoadNode(value.node))
          return {
            ...acc,
            [encodePath(path)[0]!]: fork,
          }
        }, {} as Record<number, MantarayFork>)
      }

      return mantarayNode
    }

    const node = MantarayNodeSchema.parse(obj.node)
    this.node = recursiveLoadNode(node)

    return JSON.stringify({
      reference: this.reference,
      previewMeta: this.previewMeta,
      detailsMeta: this.detailsMeta,
      node: this.node.readable,
    })
  }

  // private

  private enqueueData(data: Uint8Array) {
    const chunkedFile = makeChunkedFile(data)
    this.queue.enqueue(async () => {
      await this.beeClient.bytes.upload(data, { batchId: this.batchId! })
    })
    return chunkedFile.address()
  }

  private addVideoSource(quality: VideoQuality, size: number, entry: Reference): VideoSourceRaw {
    const path = this.getVideoPath(quality)

    this.node.addFork(encodePath(path), referenceToBytesReference(entry), {
      [EntryMetadataContentTypeKey]: "video/mp4",
      [EntryMetadataFilenameKey]: `source-${quality}.mp4`,
    })
    this.updateNode()

    return {
      type: "mp4",
      quality,
      size,
      path,
    }
  }

  private addThumbSource(width: number, type: ImageType, entry: Reference): ImageRawSource {
    const path = this.getThumbPath(width, type)

    this.node.addFork(encodePath(path), referenceToBytesReference(entry), {
      [EntryMetadataContentTypeKey]: `image/${type}`,
      [EntryMetadataFilenameKey]: `thumb-${width}.${type}`,
    })
    this.updateNode()

    return {
      type,
      width,
      path,
    }
  }

  private getThumbPath(width: number, type: ImageType) {
    return `thumb/${width}-${type}`
  }

  private getVideoPath(quality: VideoQuality) {
    return `sources/${quality}`
  }

  private updateNode() {
    this.node.addFork(encodePath(VIDEO_PREVIEW_META_PATH), jsonToReference(this.previewMeta), {
      [EntryMetadataContentTypeKey]: "application/json",
      [EntryMetadataFilenameKey]: "preview",
    })
    this.node.addFork(encodePath(VIDEO_DETAILS_META_PATH), jsonToReference(this.detailsMeta), {
      [EntryMetadataContentTypeKey]: "application/json",
      [EntryMetadataFilenameKey]: "details",
    })
  }
}
