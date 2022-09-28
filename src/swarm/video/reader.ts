import type { Video, VideoRaw, Profile } from "../.."
import type {
  BeeClient,
  EthernaIndexClient,
  IndexVideo,
  Reference,
  IndexVideoManifest,
} from "../../clients"
import { beeReference } from "../../schemas/base"
import { VideoDeserializer } from "../../serializers"
import type { ReaderOptions } from "../base-reader"
import BaseReader from "../base-reader"
import type { ReaderDownloadOptions } from "../base-reader"

interface VideoReaderOptions extends ReaderOptions {
  indexClient?: EthernaIndexClient
  owner?: Profile
  prefetchedVideo?: Video
}

interface VideoReaderDownloadOptions extends ReaderDownloadOptions {}

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

  async download(opts?: VideoReaderDownloadOptions): Promise<Video | null> {
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

    const video = new VideoDeserializer(this.beeClient.url).deserialize(JSON.stringify(videoRaw), {
      reference: this.reference,
    })

    this.rawResponse = indexVideo ?? videoRaw

    return video
  }

  indexVideoToRaw(video: IndexVideo): VideoRaw {
    const videoRaw = VideoReader.emptyVideo()

    if (video.lastValidManifest && !this.isValidatingManifest(video.lastValidManifest)) {
      videoRaw.v = "1.1"
      videoRaw.createdAt = new Date(video.creationDateTime).getTime()
      videoRaw.updatedAt = video.lastValidManifest.updatedAt
        ? new Date(video.lastValidManifest.updatedAt).getTime()
        : null
      videoRaw.batchId = video.lastValidManifest.batchId
      videoRaw.title = video.lastValidManifest.title
      videoRaw.description = video.lastValidManifest.description
      videoRaw.duration = video.lastValidManifest.duration
      videoRaw.originalQuality = video.lastValidManifest.originalQuality
      videoRaw.thumbnail = video.lastValidManifest.thumbnail
      videoRaw.sources = video.lastValidManifest.sources
      videoRaw.ownerAddress = video.ownerAddress
    }

    return videoRaw
  }

  static emptyVideo(): VideoRaw {
    return {
      title: "",
      description: "",
      originalQuality: "0p",
      duration: 0,
      thumbnail: null,
      sources: [],
      ownerAddress: "0x0",
      createdAt: Date.now(),
      updatedAt: null,
      batchId: undefined,
      v: "1.1",
    }
  }

  // Private methods

  private async fetchIndexVideo(): Promise<IndexVideo | null> {
    if (!this.indexClient) return null
    try {
      const indexVideo = this.indexReference
        ? await this.indexClient.videos.fetchVideoFromId(this.indexReference)
        : await this.indexClient.videos.fetchVideoFromHash(this.reference)

      if (this.isValidatingManifest(indexVideo.lastValidManifest)) return null

      return indexVideo
    } catch (error) {
      console.error(error)
      return null
    }
  }

  private async fetchSwarmVideo(opts?: VideoReaderDownloadOptions): Promise<VideoRaw | null> {
    if (!this.reference) return null
    try {
      const resp = await this.beeClient.bzz.download(this.reference, {
        headers: {
          // "x-etherna-reason": "video-meta",
        },
        maxResponseSize: opts?.maxResponseSize,
        onDownloadProgress: opts?.onDownloadProgress,
      })
      const videoRaw = resp.data.json() as VideoRaw
      return videoRaw
    } catch (error) {
      console.error(error)
      return null
    }
  }

  private isValidatingManifest(manifest: IndexVideoManifest | null): boolean {
    if (!manifest) return true
    return (
      manifest.title === null &&
      manifest.description === null &&
      manifest.duration === null &&
      manifest.thumbnail === null &&
      manifest.originalQuality === null &&
      manifest.sources.length === 0
    )
  }
}
