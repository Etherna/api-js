import { z } from "zod"

import { beeReference, ethAddress, slicedString } from "./base"
import { ImageRawSchema, ImageSchema } from "./image"

const quality = z.custom<`${number}p`>(val => /^\d+p$/g.test(val as string))

export const VideoSourceRawSchema = z.object({
  /** Video resolution (eg: 1080p) */
  quality: quality,
  /** Swarm reference of the video */
  reference: beeReference,
  /** Video size in bytes */
  size: z.number().min(0),
  /** Video bitrate */
  bitrate: z.number().min(0),
})

export const VideoRawSchema = z.object({
  /**  Title of the video */
  title: slicedString(150),
  /**  Description of the video */
  description: slicedString(5000),
  /** Video creation timestamp */
  createdAt: z.number().min(0),
  /** Video creation timestamp */
  updatedAt: z.number().min(0).optional().nullable(),
  /**  Quality of the original video */
  originalQuality: quality,
  /**  Address of the owner of the video */
  ownerAddress: ethAddress,
  /**  Duration of the video in seconds */
  duration: z.number().min(0),
  /** Thumbnail raw image */
  thumbnail: ImageRawSchema.nullable(),
  /**  List of available qualities of the video */
  sources: z.array(VideoSourceRawSchema).min(1),
  /** batch id used */
  batchId: beeReference.nullable().optional(),
  /** Optional extra data */
  personalData: z.string().max(200).optional(),
  /** Schema version */
  v: z.enum(["1.0", "1.1", "1.2"]).optional(),
})

export const VideoSourceSchema = VideoSourceRawSchema.extend({
  /**  Source url */
  source: z.string().url(),
})

export const VideoSchema = z.object({
  /**  Hash of the video */
  reference: beeReference,
  /**  Title of the video */
  title: slicedString(150),
  /**  Description of the video */
  description: slicedString(5000),
  /** Video creation timestamp */
  createdAt: z.number().min(0),
  /** Video update timestamp */
  updatedAt: z.number().min(0).nullable(),
  /**  Quality of the original video */
  originalQuality: quality,
  /**  Address of the owner of the video */
  ownerAddress: ethAddress,
  /**  Duration of the video in seconds */
  duration: z.number().min(0),
  /**  Thumbnail image data */
  thumbnail: ImageSchema.nullable(),
  /**  All qualities of video */
  sources: z.array(VideoSourceSchema).min(1),
  /** batch id used (null if v < `1.1`) */
  batchId: beeReference.nullable(),
})

// Types
export type VideoQuality = z.infer<typeof quality>
export type VideoRaw = z.infer<typeof VideoRawSchema>
export type VideoSource = z.infer<typeof VideoSourceSchema>
export type Video = z.infer<typeof VideoSchema>
