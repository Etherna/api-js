import { z } from "zod"

import { beeReference, nonEmptyRecord } from "./base"

export const imageSize = z.custom<`${number}w`>(val => /^\d+w$/g.test(val as string))

export const imageType = z.enum(["jpeg", "png", "webp", "avif", "jpeg-xl"]).default("jpeg")

export const ImageRawLegacySourcesSchema = nonEmptyRecord(
  /** Image size with related bee reference */
  imageSize,
  /** Bee reference or path */
  z.string()
).transform(data => {
  const sources: ImageRawSource[] = []
  for (const [size, reference] of Object.entries(data)) {
    sources.push({ width: parseInt(size), type: "jpeg", reference })
  }
  return sources
})

export const ImageRawSourceBaseSchema = z.object({
  /** Image scaled width */
  width: z.number(),
  /** Image type */
  type: imageType,
  /** Image path */
  path: z.string().optional(),
  /** Image reference */
  reference: beeReference.optional(),
})

export const ImageRawSourceSchema = ImageRawSourceBaseSchema.transform(data => {
  if ("reference" in data && data.path) {
    delete data.reference
  }
  return data
})

export const ImageSourceSchema = ImageRawSourceBaseSchema.extend({
  /** Image URL */
  url: z.string().url(),
})

export const ImageRawSourcesSchema = z.array(
  ImageRawSourceSchema.superRefine((data, ctx) => {
    if (!data.reference && !data.path) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either reference or path must be defined",
      })
    }
  })
)

export const ImageSourcesSchema = z.array(
  ImageSourceSchema.superRefine((data, ctx) => {
    if (!data.reference && !data.path) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either reference or path must be defined",
      })
    }
  })
)

export const ImageRawSchema = z.object({
  /** Image aspect ratio (width / height) */
  aspectRatio: z.number(),
  /** Blurhash value  */
  blurhash: z.string(),
  /** References of image in different resolutions */
  sources: ImageRawSourcesSchema.or(ImageRawLegacySourcesSchema),
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
  url: z.string().url(),
})

// Types
export type ImageSize = z.infer<typeof imageSize>
export type ImageType = z.infer<typeof imageType>
export type ImageRawSource = z.infer<typeof ImageRawSourceSchema>
export type ImageSource = z.infer<typeof ImageSourceSchema>
export type ImageSources = z.infer<typeof ImageSourcesSchema>
export type ImageRawLegacySources = z.infer<typeof ImageRawLegacySourcesSchema>
export type ImageRawSources = z.infer<typeof ImageRawSourcesSchema>
export type ImageRaw = z.infer<typeof ImageRawSchema>
export type Image = z.infer<typeof ImageSchema>
