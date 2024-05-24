import { z } from "zod"

import { beeReference, birthday, ethAddress, slicedString } from "./base"
import { ImageRawSchema, ImageSchema } from "./image"
import { MantarayNodeSchema } from "./mantaray"

import type { Reference } from "../clients"

/**
 * / --> preview
 * /preview
 * /details
 * /avatar/
 *   /480-png
 *   /1280-png
 *   /480-avif
 *   /1280-avif
 * /cover/
 *   /480-png
 *   /1280-png
 *   /480-avif
 *   /1280-avif
 */

export const ProfilePreviewRawSchema = z.object({
  /**  Profile address */
  address: ethAddress,
  /**  Name of the Profile */
  name: slicedString(100, 0),
  /**  User's raw avatar image */
  avatar: ImageRawSchema.nullable(),
  /** batch id used (in preview because will be also used to update playlists) */
  batchId: beeReference.nullable().optional(),
})

export const ProfileDetailsRawSchema = z.object({
  /**  Description of the Profile */
  description: z.string().nullable().optional(),
  /**  User's raw cover image */
  cover: ImageRawSchema.nullable(),
  /** User's location */
  location: z.string().optional(),
  /** User's website */
  website: z.string().optional(),
  /** User's birthday */
  birthday: birthday.optional(),
})

export const ProfilePreviewSchema = z.object({
  /**  Profile address */
  address: ethAddress,
  /**  Name of the Profile */
  name: slicedString(100, 0),
  /**  User's avatar image */
  avatar: ImageSchema.nullable(),
  /** batch id used */
  batchId: beeReference.nullable(),
})

export const ProfileDetailsSchema = z.object({
  /**  Description of the Profile */
  description: z.string().nullable(),
  /**  User's cover image */
  cover: ImageSchema.nullable(),
  /** User's location */
  location: z.string().optional(),
  /** User's website */
  website: z.string().optional(),
  /** User's birthday */
  birthday: birthday.optional(),
})

export const ProfileBuilderSchema = z.object({
  reference: beeReference,
  previewMeta: ProfilePreviewRawSchema,
  detailsMeta: ProfileDetailsRawSchema,
  node: MantarayNodeSchema,
})

// types
export type ProfilePreviewRaw = z.infer<typeof ProfilePreviewRawSchema>
export type ProfileDetailsRaw = z.infer<typeof ProfileDetailsRawSchema>
export type ProfilePreview = z.infer<typeof ProfilePreviewSchema>
export type ProfileDetails = z.infer<typeof ProfileDetailsSchema>

export type Profile = {
  reference: Reference
  preview: ProfilePreview
  details?: ProfileDetails
}
export type ProfileRaw = {
  preview?: ProfilePreviewRaw
  details?: ProfileDetailsRaw
}

export type SerializedProfileBuilder = z.infer<typeof ProfileBuilderSchema>
