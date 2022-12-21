import { beeReference } from "../../schemas/base"
import {
  VideoDetailsRawSchema,
  VideoPreviewRawSchema,
  VideoSourceSchema,
} from "../../schemas/video"
import { getBzzUrl } from "../../utils/bzz"
import ImageDeserializer from "../image/deserializer"

import type { VideoDetails, VideoPreview } from "../../schemas/video"

export type VideoDeserializerOptions = {
  /** Video swarm reference */
  reference: string
}

export default class VideoDeserializer {
  constructor(private beeUrl: string) {}

  deserializePreview(data: string, opts: VideoDeserializerOptions): VideoPreview {
    console.log(opts)
    const videoRaw = VideoPreviewRawSchema.parse(JSON.parse(data))

    const imageDeserializer = new ImageDeserializer(this.beeUrl)

    const video: VideoPreview = {
      reference: beeReference.parse(opts.reference),
      title: videoRaw.title,
      duration: videoRaw.duration,
      ownerAddress: videoRaw.ownerAddress,
      createdAt: videoRaw.createdAt,
      updatedAt: videoRaw.updatedAt || null,
      thumbnail: videoRaw.thumbnail
        ? imageDeserializer.deserialize(videoRaw.thumbnail, { reference: opts.reference })
        : null,
    }

    return video
  }

  deserializeDetails(data: string, opts: VideoDeserializerOptions): VideoDetails {
    const videoRaw = VideoDetailsRawSchema.parse(JSON.parse(data))

    const video: VideoDetails = {
      description: videoRaw.description,
      aspectRatio: videoRaw.aspectRatio || null,
      personalData: videoRaw.personalData,
      sources: videoRaw.sources.map(source =>
        VideoSourceSchema.parse({
          ...source,
          type: source.type || "mp4",
          url: getBzzUrl(
            this.beeUrl,
            "reference" in source && source.reference ? source.reference : opts.reference,
            source.path
          ),
        })
      ),
      batchId: videoRaw.batchId || null,
    }

    return video
  }
}
