import { beeReference } from "../../schemas/base"
import {
  VideoDetailsRawSchema,
  VideoDetailsSchema,
  VideoPreviewRawSchema,
  VideoPreviewSchema,
} from "../../schemas/video"
import { dateToTimestamp } from "../../utils"
import { ImageSerializer } from "../image/serializer"

import type { VideoDetailsRaw } from "../.."

export class VideoSerializer {
  constructor() {}

  serializePreview(previewItem: object): string {
    const videoPreview = VideoPreviewSchema.parse(previewItem)

    const imageSerializer = new ImageSerializer()

    const videoRaw = VideoPreviewRawSchema.parse({
      v: "2.1",
      title: videoPreview.title,
      duration: videoPreview.duration,
      ownerAddress: videoPreview.ownerAddress,
      createdAt: dateToTimestamp(videoPreview.createdAt),
      updatedAt: videoPreview.updatedAt ? dateToTimestamp(videoPreview.updatedAt) : null,
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
      sources: videoDetails.sources.map((source) => ({
        type: source.type,
        path: source.path,
        size: source.size,
        reference: source.type === "mp4" ? source.reference : undefined,
        quality: source.type === "mp4" ? source.quality : undefined,
        bitrate: source.type === "mp4" ? source.bitrate : undefined,
      })),
      captions: videoDetails.captions,
      batchId: beeReference.parse(videoDetails.batchId),
    })

    return JSON.stringify(videoRaw)
  }
}
