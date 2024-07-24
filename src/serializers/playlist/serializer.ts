import {
  PlaylistDetailsRaw,
  PlaylistDetailsSchema,
  PlaylistPreviewRaw,
  PlaylistPreviewSchema,
} from "../../schemas/playlist"
import { encryptData } from "../../utils/crypto"
import { dateToTimestamp } from "../../utils/time"

export class PlaylistSerializer {
  constructor() {}

  serializePreview(item: object): string {
    const { rootManifest, ...preview } = PlaylistPreviewSchema.parse(item)
    const rawPreview = {
      ...preview,
      createdAt: dateToTimestamp(preview.createdAt),
      updatedAt: dateToTimestamp(preview.updatedAt),
    } satisfies PlaylistPreviewRaw

    return JSON.stringify(rawPreview)
  }

  serializeDetails(item: object, password?: string): string {
    const details = PlaylistDetailsSchema.parse(item)

    const detailsRaw = {
      name: details.name,
      description: details.description,
      videos: details.videos.map((video) => ({
        r: video.reference,
        t: video.title,
        a: dateToTimestamp(video.addedAt),
        p: video.publishedAt ? dateToTimestamp(video.publishedAt) : undefined,
      })),
    } satisfies PlaylistDetailsRaw

    let data = JSON.stringify(detailsRaw)

    if (password) {
      data = encryptData(data, password)
    }

    return data
  }
}
