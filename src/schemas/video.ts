import { z } from "zod"

import { beeReference, ethAddress, slicedString } from "./base"
import { ImageRawSchema, ImageSchema } from "./image"

const quality = z.custom<`${number}p`>(val => /^\d+p$/g.test(val as string))

export const VideoSourceRawSchema = z.discriminatedUnion("type", [
  z.object({
    /** Source type */
    type: z.literal("mp4"),
    /** Video resolution (eg: 1080p) */
    quality: quality,
    /** Swarm reference of the video */
    reference: beeReference,
    /** Video size in bytes */
    size: z.number().min(0),
    /** Video bitrate */
    bitrate: z.number().min(0).optional(),
  }),
  z.object({
    /** Source type */
    type: z.literal("dash"),
    /** Path of the source */
    path: z.string().min(3),
  }),
  z.object({
    /** Source type */
    type: z.literal("hls"),
    /** Path of the source */
    path: z.string().min(3),
  }),
])

export const VideoPreviewRawSchema = z.object({
  /** Title of the video */
  title: slicedString(150),
  /** Video creation timestamp */
  createdAt: z.number().min(0),
  /** Video creation timestamp */
  updatedAt: z.number().min(0).optional().nullable(),
  /** Address of the owner of the video */
  ownerAddress: ethAddress,
  /** Duration of the video in seconds */
  duration: z.number().min(0),
  /** Thumbnail raw image */
  thumbnail: ImageRawSchema.nullable(),
  /** Schema version */
  v: z.enum(["1.0", "1.1", "1.2", "2.0"]).optional(),
})

export const VideoDetailsRawSchema = z.object({
  /** Description of the video */
  description: slicedString(5000),
  /** Quality of the original video */
  originalQuality: quality,
  /** List of available qualities of the video */
  sources: z.array(VideoSourceRawSchema).min(1),
  /** batch id used */
  batchId: beeReference.nullable().optional(),
  /** Optional extra data */
  personalData: z.string().max(200).optional(),
  /** Schema version */
  v: z.enum(["1.0", "1.1", "1.2", "2.0"]).optional(),
})

export const VideoSourceSchema = z.discriminatedUnion("type", [
  z.object({
    /** Source type */
    type: z.literal("mp4"),
    /** Video resolution (eg: 1080p) */
    quality: quality,
    /** Swarm reference of the video */
    reference: beeReference,
    /** Video size in bytes */
    size: z.number().min(0),
    /** Video bitrate */
    bitrate: z.number().min(0).optional(),
    /** source url */
    url: z.string().url(),
  }),
  z.object({
    /** Source type */
    type: z.literal("dash"),
    /** Path of the source */
    path: z.string().min(3),
    /** source url */
    url: z.string().url(),
  }),
  z.object({
    /** Source type */
    type: z.literal("hls"),
    /** Path of the source */
    path: z.string().min(3),
    /** source url */
    url: z.string().url(),
  }),
])

export const VideoPreviewSchema = z.object({
  /** Hash of the video */
  reference: beeReference,
  /** Title of the video */
  title: slicedString(150),
  /** Video creation timestamp */
  createdAt: z.number().min(0),
  /** Video update timestamp */
  updatedAt: z.number().min(0).nullable(),
  /** Address of the owner of the video */
  ownerAddress: ethAddress,
  /** Duration of the video in seconds */
  duration: z.number().min(0),
  /** Thumbnail image data */
  thumbnail: ImageSchema.nullable(),
})

export const VideoDetailsSchema = z.object({
  /** Description of the video */
  description: slicedString(5000),
  /** Quality of the original video */
  originalQuality: quality,
  /** All qualities of video */
  sources: z.array(VideoSourceSchema).min(1),
  /** batch id used (null if v < `1.1`) */
  batchId: beeReference.nullable(),
})

// Types
export type VideoQuality = z.infer<typeof quality>
export type VideoPreviewRaw = z.infer<typeof VideoPreviewRawSchema>
export type VideoDetailsRaw = z.infer<typeof VideoDetailsRawSchema>
export type VideoSource = z.infer<typeof VideoSourceSchema>
export type VideoPreview = z.infer<typeof VideoPreviewSchema>
export type VideoDetails = z.infer<typeof VideoDetailsSchema>
