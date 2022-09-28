import type { VideoRaw } from "../.."
import { beeReference } from "../../schemas/base"
import { VideoSchema } from "../../schemas/video"
import BaseSerializer from "../base-serializer"
import ImageSerializer from "../image/serializer"

export default class VideoSerializer extends BaseSerializer {
  constructor() {
    super()
  }

  serialize(item: object): string {
    const video = VideoSchema.parse(item)

    const imageSerializer = new ImageSerializer()

    const videoRaw: VideoRaw = {
      v: "1.1",
      title: video.title,
      description: video.description,
      duration: video.duration,
      ownerAddress: video.ownerAddress,
      originalQuality: video.originalQuality,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
      thumbnail: video.thumbnail ? imageSerializer.serialize(video.thumbnail) : null,
      sources: video.sources.map(source => ({
        reference: source.reference,
        quality: source.quality,
        size: source.size,
        bitrate: source.bitrate,
      })),
      batchId: beeReference.parse(video.batchId),
    }

    return JSON.stringify(videoRaw)
  }
}
