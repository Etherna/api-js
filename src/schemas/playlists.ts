import { z } from "zod"

import { beeReference } from "./base"

export const PlaylistsSchema = z.array(beeReference)

export const UserPlaylistsRawSchema = z
  .object({
    /** Reference to the channel playlist */
    channel: beeReference.optional(),
    /** Reference to the saved videos playlist */
    saved: beeReference.optional(),
    /** Reference list of custom playlists */
    custom: z.array(beeReference).optional(),
  })
  .transform((data) => data.custom ?? [])
  .or(PlaylistsSchema)

export const UserPlaylistsSchema = PlaylistsSchema

// types
export type UserPlaylistsRaw = z.infer<typeof UserPlaylistsRawSchema>
export type UserPlaylists = z.infer<typeof UserPlaylistsSchema>
