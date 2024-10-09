import { z } from "zod"

import { AUDIO_MANIFEST_REGEX, MASTER_MANIFEST_REGEX } from "../utils"
import { beeReference, ethAddress, slicedString, timestamp } from "./base"
import { ImageRawSchema, ImageSchema } from "./image"
import { MantarayNodeSchema } from "./mantaray"

import type { Reference } from "../clients"

const quality = z.custom<`${number}p`>((val) => /^\d+p$/g.test(val as string))

/**
 * / --> preview
 * /preview
 * /details
 * /thumb/
 *   /480-png
 *   /1280-png
 *   /480-avif
 *   /1280-avif
 * /sources/
 *   /720p
 *   /1080p
 *   /dash/
 *     /manifest.mpd
 *     /...
 */

export const VideoSourceRawSchema = z
  .union([
    z.object({
      /** Source type */
      type: z.literal("mp4").optional(),
      /** Video resolution (eg: 1080p) */
      quality: quality,
      /** Path of the video (for folder based video manifest) */
      path: z.string().optional(),
      /** Swarm reference of the video */
      reference: beeReference.optional(),
      /** Video size in bytes */
      size: z.number().min(0),
      /** Video bitrate */
      bitrate: z.number().min(0).optional(),
    }),
    z.object({
      /** Source type */
      type: z
        .enum(["dash", "Dash", "hls", "Hls"])
        .transform((data) => data.toLowerCase() as "dash" | "hls"),
      /** Path of the source */
      path: z.string().min(3),
      /** Video size in bytes */
      size: z.number().min(0),
    }),
  ])
  .transform((data) => {
    if (!("type" in data)) {
      // if index doesn't return the type, we can guess it from the path
      if (data.path?.startsWith("sources/hls")) {
        ;(data as any).type = "hls"
      } else if (data.path?.startsWith("sources/dash")) {
        ;(data as any).type = "dash"
      } else {
        data.type = "mp4"
      }
    }
    if ("reference" in data && data.path) {
      delete data.reference
    }
    if ("path" in data && data.type === "mp4" && beeReference.safeParse(data.path).success) {
      data.reference = beeReference.parse(data.path)
      delete data.path
    }
    return data
  })

export const VideoPreviewRawSchema = z.object({
  /** Schema version */
  v: z.enum(["1.0", "1.1", "1.2", "2.0", "2.1"]).optional(),
  /** Title of the video */
  title: slicedString(150),
  /** Video creation timestamp */
  createdAt: timestamp,
  /** Video creation timestamp */
  updatedAt: timestamp.optional().nullable(),
  /** Address of the owner of the video */
  ownerAddress: ethAddress,
  /** Duration of the video in seconds */
  duration: z.number().min(0),
  /** Thumbnail raw image */
  thumbnail: ImageRawSchema.nullable(),
})

export const VideoCaptionSchema = z.object({
  label: z.string().min(1),
  lang: z.string().min(2),
  path: z.string().min(3),
})

export const VideoDetailsRawSchema = z.object({
  /** Description of the video */
  description: slicedString(5000),
  /** Video aspect ratio (width / height) */
  aspectRatio: z.number().min(0).nullish(),
  /** List of available qualities of the video */
  sources: z.array(VideoSourceRawSchema).min(1),
  /** List of available video captions */
  captions: z.array(VideoCaptionSchema).optional(),
  /** batch id used */
  batchId: beeReference.nullable().optional(),
  /** Optional extra data */
  personalData: z.string().max(200).optional(),
})

export const VideoSourceSchema = z
  .union([
    z.object({
      /** Source type */
      type: z.literal("mp4"),
      /** Video resolution (eg: 1080p) */
      quality: quality,
      /** Swarm reference of the video */
      reference: beeReference.optional(),
      /** Path of the video (for folder based video manifest) */
      path: z.string().optional(),
      /** Video size in bytes */
      size: z.number().min(0),
      /** Video bitrate */
      bitrate: z.number().min(0).optional(),
      /** source url */
      url: z.string().url(),
    }),
    z
      .object({
        /** Source type */
        type: z
          .enum(["dash", "Dash", "hls", "Hls"])
          .transform((data) => data.toLowerCase() as "dash" | "hls"),
        /** Path of the source */
        path: z.string().min(3),
        /** Video size in bytes */
        size: z.number().min(0),
        /** source url */
        url: z.string().url(),
      })
      .transform((data) => ({
        ...data,
        isMaster: MASTER_MANIFEST_REGEX.test(data.path),
        isAudio: AUDIO_MANIFEST_REGEX.test(data.path),
      })),
  ])
  .superRefine((data, ctx) => {
    if (data.type === "mp4" && !data.reference && !data.path) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either reference or path must be defined",
      })
    }
  })

export const VideoPreviewSchema = z.object({
  /** Hash of the video */
  reference: beeReference,
  /** Title of the video */
  title: slicedString(150),
  /** Video creation timestamp */
  createdAt: z.date(),
  /** Video update timestamp */
  updatedAt: z.date().nullable(),
  /** Address of the owner of the video */
  ownerAddress: ethAddress,
  /** Duration of the video in seconds */
  duration: z.number().min(0),
  /** Thumbnail image data */
  thumbnail: ImageSchema.nullable(),
  /** Schema version */
  v: z.enum(["1.0", "1.1", "1.2", "2.0", "2.1"]),
})

export const VideoDetailsSchema = z.object({
  /** Description of the video */
  description: slicedString(5000),
  /** All qualities of video */
  sources: z.array(VideoSourceSchema).min(1),
  /** Video aspect ratio (width / height) */
  aspectRatio: z.number().min(0).nullable(),
  /** List of available video captions */
  captions: z.array(VideoCaptionSchema),
  /** Optional extra data */
  personalData: z.string().max(200).optional(),
  /** batch id used (null if v < `1.1`) */
  batchId: beeReference.nullable(),
})

export const VideoBuilderSchema = z.object({
  reference: beeReference,
  previewMeta: VideoPreviewRawSchema,
  detailsMeta: VideoDetailsRawSchema.omit({ sources: true }).extend({
    sources: z.array(VideoSourceRawSchema),
  }),
  node: MantarayNodeSchema,
})

// Types
export type VideoQuality = z.infer<typeof quality>
export type VideoPreviewRaw = z.infer<typeof VideoPreviewRawSchema>
export type VideoDetailsRaw = z.infer<typeof VideoDetailsRawSchema>
export type VideoSource = z.infer<typeof VideoSourceSchema>
export type VideoSourceRaw = z.infer<typeof VideoSourceRawSchema>
export type VideoPreview = z.infer<typeof VideoPreviewSchema>
export type VideoDetails = z.infer<typeof VideoDetailsSchema>
export type Video = {
  reference: Reference
  preview: VideoPreview
  details?: VideoDetails
}
export type VideoRaw = {
  preview?: VideoPreviewRaw
  details?: VideoDetailsRaw
}
export type SerializedVideoBuilder = z.infer<typeof VideoBuilderSchema>
