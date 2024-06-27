import { z } from "zod"

import { beeReference, ethAddress } from "./base"

export const PlaylistTypeEncryptedSchema = z.enum(["private", "protected"])

export const PlaylistTypeVisibleSchema = z.literal("public")

export const PlaylistTypeSchema = z.union([PlaylistTypeEncryptedSchema, PlaylistTypeVisibleSchema])

export const PlaylistVideoRawSchema = z.object({
  /** Video reference */
  r: beeReference,
  /** Video Title */
  t: z.string().min(1),
  /** Timestamp of when the videos has been added to playlist */
  a: z.number().min(0),
  /** Timestamp of when the video should be visible */
  p: z.number().min(0).optional(),
})

export const PlaylistRawSchema = z
  .object({
    /** Playlist id (used for feed update) */
    id: z.string().min(1),
    /** Playlist name (empty for __channel & __saved) */
    name: z.string(),
    /** Playlist owner */
    owner: ethAddress,
    /** Playlist creation timestamp */
    createdAt: z.number().min(0),
    /** Playlist update timestamp */
    updatedAt: z.number().min(0),
  })
  .and(
    z.union([
      z.object({
        /** Playlist visibility: public (show in channel), unlisted (not in channel), private (encrypted) */
        type: PlaylistTypeVisibleSchema,
        /** List of the playlist videos */
        videos: z.array(PlaylistVideoRawSchema),
        /** Playlist description */
        description: z.string().nullable().optional(),
      }),
      z.object({
        /** Playlist visibility: public (show in channel), unlisted (not in channel), private (encrypted) */
        type: PlaylistTypeEncryptedSchema,
        /** Encrypted data of the playlist (only for private playlists) */
        encryptedData: z.string().min(1),
      }),
    ]),
  )

export const PlaylistVideoSchema = z.object({
  /** Video reference */
  reference: beeReference,
  /** Video Title */
  title: z.string().min(1),
  /** Timestamp of when the videos has been added to playlist */
  addedAt: z.number().min(0),
  /** Timestamp of when the video should be visible */
  publishedAt: z.number().min(0).optional(),
})

export const PlaylistSchema = z
  .object({
    /** Epoch feed root manifest */
    reference: beeReference,
    /** Playlist id (used for feed update) */
    id: z.string().min(1),
    /** Playlist name */
    name: z.string(),
    /** Playlist owner */
    owner: ethAddress,
    /** Playlist creation timestamp */
    createdAt: z.number().min(0),
    /** Playlist update timestamp */
    updatedAt: z.number().min(0),
    /** List of the playlist videos */
    videos: z.array(PlaylistVideoSchema),
    /** Playlist description */
    description: z.string().nullable(),
  })
  .and(
    z.union([
      z.object({
        /** Playlist visibility: public (show in channel), unlisted (not in channel), private (encrypted) */
        type: PlaylistTypeVisibleSchema,
      }),
      z.object({
        /** Playlist visibility: public (show in channel), unlisted (not in channel), private (encrypted) */
        type: PlaylistTypeEncryptedSchema,
        /** Ecrypted data for private */
        encryptedData: z.string().min(1),
      }),
    ]),
  )

export const PlaylistEncryptedDataRawSchema = z.object({
  /** List of the playlist videos */
  videos: z.array(PlaylistVideoRawSchema),
  /** Playlist description */
  description: z.string().nullable().optional(),
})

// types
export type PlaylistType = z.infer<typeof PlaylistTypeSchema>
export type PlaylistVideoRaw = z.infer<typeof PlaylistVideoRawSchema>
export type PlaylistRaw = z.infer<typeof PlaylistRawSchema>
export type PlaylistEncryptedDataRaw = z.infer<typeof PlaylistEncryptedDataRawSchema>
export type PlaylistVideo = z.infer<typeof PlaylistVideoSchema>
export type Playlist = z.infer<typeof PlaylistSchema>
