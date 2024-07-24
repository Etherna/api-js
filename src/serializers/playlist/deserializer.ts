import { Reference } from "../../clients"
import {
  PlaylistDetails,
  PlaylistDetailsRawSchema,
  PlaylistPreview,
  PlaylistPreviewRawSchema,
} from "../../schemas/playlist"
import { decryptData } from "../../utils/crypto"
import { timestampToDate } from "../../utils/time"

export type PlaylistDeserializerOptions = {
  /** Root manifest reference */
  rootManifest: Reference
}

export class PlaylistDeserializer {
  constructor() {}

  deserializePreview(data: string, opts: PlaylistDeserializerOptions): PlaylistPreview {
    const previewRaw = PlaylistPreviewRawSchema.parse(JSON.parse(data))
    const preview = {
      ...previewRaw,
      rootManifest: opts.rootManifest,
      createdAt: new Date(previewRaw.createdAt * 1000),
      updatedAt: new Date(previewRaw.updatedAt * 1000),
    } satisfies PlaylistPreview

    return preview
  }

  deserializeDetails(data: string): { details: PlaylistDetails; encryptedData?: string } {
    let json

    try {
      json = JSON.parse(data)
    } catch (error) {
      json = null
    }

    if (json) {
      const detailsRaw = PlaylistDetailsRawSchema.parse(json)
      const details = {
        name: detailsRaw.name,
        description: detailsRaw.description,
        videos: detailsRaw.videos.map((rawVideo) => ({
          reference: rawVideo.r,
          title: rawVideo.t,
          addedAt: timestampToDate(rawVideo.a),
          publishedAt: rawVideo.p ? timestampToDate(rawVideo.p) : undefined,
        })),
      } satisfies PlaylistDetails

      return { details }
    } else {
      return {
        details: {
          videos: [],
        } satisfies PlaylistDetails,
        encryptedData: data,
      }
    }
  }

  deserializeEncryptedDetails(encryptedData: string, password: string): PlaylistDetails {
    const rawDetails = PlaylistDetailsRawSchema.parse(
      JSON.parse(decryptData(encryptedData, password)),
    )

    const details = {
      name: rawDetails.name,
      description: rawDetails.description,
      videos: rawDetails.videos.map((rawVideo) => ({
        reference: rawVideo.r,
        title: rawVideo.t,
        addedAt: timestampToDate(rawVideo.a),
        publishedAt: rawVideo.p ? timestampToDate(rawVideo.p) : undefined,
      })),
    } satisfies PlaylistDetails

    return details
  }
}
