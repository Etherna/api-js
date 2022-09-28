import { z } from "zod"

import { beeReference } from "./base"

export const UserPlaylistsRawSchema = z.object({
  /** Reference to the channel playlist */
  channel: beeReference.optional(),
  /** Reference to the saved videos playlist */
  saved: beeReference.optional(),
  /** Reference list of custom playlists */
  custom: z.array(beeReference).optional(),
})

export const UserPlaylistsSchema = z.object({
  /** Reference to the channel playlist */
  channel: beeReference.nullable(),
  /** Reference to the saved videos playlist */
  saved: beeReference.nullable(),
  /** Reference list of custom playlists */
  custom: z.array(beeReference),
})

// types
export type UserPlaylistsRaw = z.infer<typeof UserPlaylistsRawSchema>
export type UserPlaylists = z.infer<typeof UserPlaylistsSchema>
