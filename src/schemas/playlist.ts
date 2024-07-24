import { object, z } from "zod"

import { Reference } from "../clients"
import { beeReference, ethAddress, timestamp } from "./base"

export const PlaylistTypeEncryptedSchema = z.enum(["private", "protected"])

export const PlaylistReservedIdsSchema = z.enum(["Channel", "Saved"])

export const PlaylistTypeVisibleSchema = z.literal("public")

export const PlaylistTypeSchema = z.union([PlaylistTypeEncryptedSchema, PlaylistTypeVisibleSchema])

export const PlaylistIdSchema = z.string().uuid().or(PlaylistReservedIdsSchema)

export const PlaylistThumbSchema = z.object({
  blurhash: z.string(),
  path: z.string(),
})

export const PlaylistVideoRawSchema = z.object({
  /** Video reference */
  r: beeReference,
  /** Video Title */
  t: z.string().min(1),
  /** Timestamp of when the videos has been added to playlist */
  a: timestamp,
  /** Timestamp of when the video should be visible */
  p: timestamp.optional(),
})

export const PlaylistPreviewRawSchema = z.object({
  /** Playlist id (used for feed update) */
  id: PlaylistIdSchema,
  /** Playlist visibility: public (visibile by anyone), private (visibible by owner), protected (visible by anyone with the password) */
  type: PlaylistTypeSchema,
  /** Private type password hint */
  passwordHint: z.string().optional(),
  /** Playlist name (empty for __channel & __saved) */
  name: z.string(),
  /** Playlist owner */
  owner: ethAddress,
  /** Preview image */
  thumb: PlaylistThumbSchema.nullable(),
  /** Playlist creation timestamp */
  createdAt: timestamp,
  /** Playlist update timestamp */
  updatedAt: timestamp,
})

export const PlaylistDetailsRawSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  videos: z.array(PlaylistVideoRawSchema),
})

export const PlaylistVideoSchema = z.object({
  /** Video reference */
  reference: beeReference,
  /** Video Title */
  title: z.string().min(1),
  /** Timestamp of when the videos has been added to playlist */
  addedAt: z.date(),
  /** Timestamp of when the video should be visible */
  publishedAt: z.date().optional(),
})

export const PlaylistPreviewSchema = z.object({
  /** Epoch feed root manifest */
  rootManifest: beeReference,
  /** Playlist id (used for feed update) */
  id: PlaylistIdSchema,
  /** Playlist visibility: public (visibile by anyone), private (visibible by owner), protected (visible by anyone with the password) */
  type: PlaylistTypeSchema,
  /** Private type password hint */
  passwordHint: z.string().optional(),
  /** Playlist name (empty for Channel & Saved) */
  name: z.string(),
  /** Playlist owner */
  owner: ethAddress,
  /** Preview image */
  thumb: PlaylistThumbSchema.nullable(),
  /** Playlist creation timestamp */
  createdAt: z.date(),
  /** Playlist update timestamp */
  updatedAt: z.date(),
})

export const PlaylistDetailsSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  videos: z.array(PlaylistVideoSchema),
})

// types
export type PlaylistType = z.infer<typeof PlaylistTypeSchema>
export type PlaylistId = z.infer<typeof PlaylistIdSchema>
export type PlaylistThumb = z.infer<typeof PlaylistThumbSchema>
export type PlaylistVideoRaw = z.infer<typeof PlaylistVideoRawSchema>
export type PlaylistPreviewRaw = z.infer<typeof PlaylistPreviewRawSchema>
export type PlaylistDetailsRaw = z.infer<typeof PlaylistDetailsRawSchema>
export type PlaylistVideo = z.infer<typeof PlaylistVideoSchema>
export type PlaylistPreview = z.infer<typeof PlaylistPreviewSchema>
export type PlaylistDetails = z.infer<typeof PlaylistDetailsSchema>
export type Playlist = {
  reference: Reference
  preview: PlaylistPreview
  details: PlaylistDetails
}
