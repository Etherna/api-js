import { beeReference } from "../../schemas/base"
import {
  VideoPreviewSchema,
  VideoDetailsSchema,
  VideoDetailsRawSchema,
  VideoPreviewRawSchema,
} from "../../schemas/video"
import ImageSerializer from "../image/serializer"

import type { VideoDetailsRaw } from "../.."

export default class VideoSerializer {
  constructor() {}

  serializePreview(previewItem: object): string {
    const videoPreview = VideoPreviewSchema.parse(previewItem)

    const imageSerializer = new ImageSerializer()

    const videoRaw = VideoPreviewRawSchema.parse({
      v: "2.0",
      title: videoPreview.title,
      duration: videoPreview.duration,
      ownerAddress: videoPreview.ownerAddress,
      createdAt: videoPreview.createdAt,
      updatedAt: videoPreview.updatedAt,
      thumbnail: videoPreview.thumbnail ? imageSerializer.serialize(videoPreview.thumbnail) : null,
    })

    return JSON.stringify(videoRaw)
  }

  serializeDetails(detailsItem: object): string {
    const videoDetails = VideoDetailsSchema.parse(detailsItem)

    const videoRaw: VideoDetailsRaw = VideoDetailsRawSchema.parse({
      description: videoDetails.description,
      aspectRatio: videoDetails.aspectRatio,
      personalData: videoDetails.personalData,
      sources: videoDetails.sources.map(source => ({
        type: source.type,
        path: source.path,
        reference: source.type === "mp4" ? source.reference : undefined,
        quality: source.type === "mp4" ? source.quality : undefined,
        size: source.type === "mp4" ? source.size : undefined,
        bitrate: source.type === "mp4" ? source.bitrate : undefined,
      })),
      batchId: beeReference.parse(videoDetails.batchId),
    })

    return JSON.stringify(videoRaw)
  }
}
