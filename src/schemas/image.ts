import { z } from "zod"

import { beeReference, nonEmptyRecord } from "./base"

const size = z.custom<`${number}w`>(val => /^\d+w$/g.test(val as string))

export const ImageRawSourcesSchema = nonEmptyRecord(
  /** Image size with related bee reference */
  size,
  /** Bee reference */
  beeReference
)

export const ImageSourcesSchema = nonEmptyRecord(
  /** Image size with related url */
  size,
  /** Image url */
  z.string().url()
)

export const ImageRawSchema = z.object({
  /** Image aspect ratio (width / height) */
  aspectRatio: z.number(),
  /** Blurhash value  */
  blurhash: z.string(),
  /** References of image in different resolutions */
  sources: ImageRawSourcesSchema,
})

export const ImageSchema = z.object({
  /** Image aspect ratio (width / height) */
  aspectRatio: z.number(),
  /** Blurhash value  */
  blurhash: z.string(),
  /** Sources of image in different resolutions */
  sources: ImageSourcesSchema,
  /** Data URL of the blur-hash  */
  blurredBase64: z.string(),
  /** img src url */
  src: z.string().url(),
})

// Types
export type ImageRawSources = z.infer<typeof ImageRawSourcesSchema>
export type ImageRaw = z.infer<typeof ImageRawSchema>
export type Image = z.infer<typeof ImageSchema>
export type ImageSources = z.infer<typeof ImageSourcesSchema>
