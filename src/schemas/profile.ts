import { z } from "zod"

import { beeReference, birthday, ensAddress, ethAddress, slicedString } from "./base"
import { ImageRawSchema, ImageSchema } from "./image"

export const ProfileRawSchema = z.object({
  /**  Profile address */
  address: ethAddress,
  /**  Name of the Profile */
  name: slicedString(100, 1),
  /**  Description of the Profile */
  description: z.string().nullable().optional(),
  /**  User's raw avatar image */
  avatar: ImageRawSchema.nullable(),
  /**  User's raw cover image */
  cover: ImageRawSchema.nullable(),
  /** User's location */
  location: z.string().optional(),
  /** User's website */
  website: z.string().optional(),
  /** User's birthday */
  birthday: birthday.optional(),
  /** batch id used */
  batchId: beeReference.nullable().optional(),
})

export const ProfileSchema = z.object({
  /**  Profile address */
  address: ethAddress,
  /**  Name of the Profile */
  name: slicedString(100, 1),
  /**  Description of the Profile */
  description: z.string().nullable(),
  /**  User's avatar image */
  avatar: ImageSchema.nullable(),
  /**  User's cover image */
  cover: ImageSchema.nullable(),
  /** User's location */
  location: z.string().optional(),
  /** User's website */
  website: z.string().optional(),
  /** User's birthday */
  birthday: birthday.optional(),
  /** batch id used */
  batchId: beeReference.nullable(),
})

// types
export type ProfileRaw = z.infer<typeof ProfileRawSchema>
export type Profile = z.infer<typeof ProfileSchema>
