import { beeReference } from "../../schemas/base"
import { VideoRawSchema } from "../../schemas/video"
import { getBzzUrl } from "../../utils/bzz"
import BaseDeserializer from "../base-deserializer"
import ImageDeserializer from "../image/deserializer"

import type { Video } from "../.."

export type VideoDeserializerOptions = {
  /** Video swarm reference */
  reference: string
}

export default class VideoDeserializer extends BaseDeserializer<Video, VideoDeserializerOptions> {
  constructor(private beeUrl: string) {
    super()
  }

  deserialize(data: string, opts: VideoDeserializerOptions): Video {
    const videoRaw = VideoRawSchema.parse(JSON.parse(data))

    const imageDeserializer = new ImageDeserializer(this.beeUrl)

    const video: Video = {
      reference: beeReference.parse(opts.reference),
      title: videoRaw.title,
      description: videoRaw.description,
      duration: videoRaw.duration,
      ownerAddress: videoRaw.ownerAddress,
      originalQuality: videoRaw.originalQuality,
      createdAt: videoRaw.createdAt,
      updatedAt: videoRaw.updatedAt || null,
      thumbnail: videoRaw.thumbnail ? imageDeserializer.deserialize(videoRaw.thumbnail) : null,
      sources: videoRaw.sources.map(source => ({
        ...source,
        source: getBzzUrl(this.beeUrl, source.reference),
      })),
      batchId: videoRaw.batchId || null,
    }

    return video
  }
}
