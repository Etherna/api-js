import { beeReference } from "../../schemas/base"
import { VideoDeserializer } from "../../serializers"
import BaseReader from "../base-reader"

import type {
  Video,
  Profile,
  VideoPreview,
  VideoDetailsRaw,
  VideoPreviewRaw,
  VideoSourceRaw,
  VideoRaw,
} from "../.."
import type {
  BeeClient,
  EthernaIndexClient,
  IndexVideo,
  Reference,
  IndexVideoManifest,
} from "../../clients"
import type { ReaderOptions, ReaderDownloadOptions } from "../base-reader"

interface VideoReaderOptions extends ReaderOptions {
  indexClient?: EthernaIndexClient
  owner?: Profile
  prefetchedVideo?: Video
}

interface VideoReaderDownloadOptions extends ReaderDownloadOptions {
  mode: "preview" | "full"
}

export default class VideoReader extends BaseReader<Video | null, string, VideoRaw | IndexVideo> {
  reference: Reference
  indexReference?: string

  private beeClient: BeeClient
  private indexClient?: EthernaIndexClient
  private prefetchedVideo?: Video

  constructor(reference: string, opts: VideoReaderOptions) {
    super(reference, opts)

    const safeSwarmReference = beeReference.safeParse(reference)
    if (safeSwarmReference.success) {
      this.reference = safeSwarmReference.data as Reference
    } else {
      if (!opts.indexClient) throw new Error("Index client is required")

      this.reference = "" as Reference // temporary
      this.indexReference = reference
    }

    this.beeClient = opts.beeClient
    this.indexClient = opts.indexClient
    this.prefetchedVideo = opts.prefetchedVideo
  }

  async download(opts: VideoReaderDownloadOptions): Promise<Video | null> {
    if (this.prefetchedVideo) return this.prefetchedVideo

    let videoRaw: VideoRaw | null = null
    let indexVideo: IndexVideo | null = null

    if (this.indexReference) {
      indexVideo = await this.fetchIndexVideo()
      const reference = indexVideo?.lastValidManifest?.hash as Reference

      if (reference) {
        videoRaw = this.indexVideoToRaw(indexVideo!)
        this.reference = reference
      }
    } else {
      videoRaw = await this.fetchSwarmVideo(opts)
    }

    if (!videoRaw) return null

    const deserializer = new VideoDeserializer(this.beeClient.url)
    const preview = deserializer.deserializePreview(JSON.stringify(videoRaw.preview), {
      reference: this.reference,
    })
    const details = deserializer.deserializeDetails(JSON.stringify(videoRaw.details), {
      reference: this.reference,
    })

    this.rawResponse = indexVideo ?? videoRaw

    return {
      reference: this.reference,
      preview,
      details,
    }
  }

  indexVideoToRaw(video: IndexVideo): VideoRaw {
    const videoPreviewRaw = VideoReader.emptyVideoPreview()
    const videoDetailsRaw = VideoReader.emptyVideoDetails()

    if (video.lastValidManifest && !VideoReader.isValidatingManifest(video.lastValidManifest)) {
      videoPreviewRaw.v = "2.0"
      videoPreviewRaw.title = video.lastValidManifest.title
      videoPreviewRaw.duration = video.lastValidManifest.duration
      videoPreviewRaw.thumbnail = video.lastValidManifest.thumbnail
      videoPreviewRaw.ownerAddress = video.ownerAddress
      videoPreviewRaw.createdAt = new Date(video.creationDateTime).getTime()
      videoPreviewRaw.updatedAt = video.lastValidManifest.updatedAt
        ? new Date(video.lastValidManifest.updatedAt).getTime()
        : null
      videoDetailsRaw.v = "2.0"
      videoDetailsRaw.batchId = video.lastValidManifest.batchId
      videoDetailsRaw.description = video.lastValidManifest.description
      videoDetailsRaw.sources = video.lastValidManifest.sources
    }

    return {
      preview: videoPreviewRaw,
      details: videoDetailsRaw,
    }
  }

  static emptyVideoPreview(): VideoPreviewRaw {
    return {
      title: "",
      duration: 0,
      thumbnail: null,
      ownerAddress: "0x0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      v: "2.0",
    }
  }

  static emptyVideoDetails(): VideoDetailsRaw {
    return {
      description: "",
      aspectRatio: null,
      sources: [],
      batchId: undefined,
      v: "2.0",
    }
  }

  // Private methods

  private async fetchIndexVideo(): Promise<IndexVideo | null> {
    if (!this.indexClient) return null
    try {
      const indexVideo = this.indexReference
        ? await this.indexClient.videos.fetchVideoFromId(this.indexReference)
        : await this.indexClient.videos.fetchVideoFromHash(this.reference)

      if (VideoReader.isValidatingManifest(indexVideo.lastValidManifest)) return null

      return indexVideo
    } catch (error) {
      console.error(error)
      return null
    }
  }

  private async fetchSwarmVideo(opts: VideoReaderDownloadOptions): Promise<VideoRaw | null> {
    if (!this.reference) return null
    try {
      const [previewResp, detailsResp] = await Promise.allSettled([
        this.beeClient.bzz.download(this.reference, {
          headers: {
            // "x-etherna-reason": "video-preview-meta",
          },
          maxResponseSize: opts?.maxResponseSize,
          onDownloadProgress: opts?.onDownloadProgress,
        }),
        opts.mode === "full"
          ? this.beeClient.bzz.downloadPath(this.reference, "details", {
              headers: {
                // "x-etherna-reason": "video-details-meta",
              },
              maxResponseSize: opts?.maxResponseSize,
              onDownloadProgress: opts?.onDownloadProgress,
            })
          : Promise.resolve(null),
      ])

      if (previewResp.status === "rejected") {
        throw previewResp.reason
      }

      const preview = previewResp.value.data.json() as VideoPreviewRaw
      const details =
        detailsResp.status === "fulfilled"
          ? (detailsResp.value?.data.json() as VideoDetailsRaw)
          : undefined

      return {
        preview,
        details,
      }
    } catch (error) {
      console.error(error)
      return null
    }
  }

  static isValidatingManifest(manifest: IndexVideoManifest | null): boolean {
    if (!manifest) return true
    return (
      manifest.title === null &&
      manifest.description === null &&
      manifest.duration === null &&
      manifest.thumbnail === null &&
      manifest.sources.length === 0
    )
  }
}
