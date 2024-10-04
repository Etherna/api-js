import { z } from "zod"

import { Reference } from "../clients"
import { beeReference, nonEmptyRecord } from "./base"

export const imageSize = z.custom<`${number}w`>((val) => /^\d+w$/g.test(val as string))

const baseImageTypes = ["jpeg", "png", "webp", "avif", "jpeg-xl"] as const
const capitalImageTypes = baseImageTypes.map(
  (type) => `${type[0].toUpperCase()}${type.slice(1)}` as const,
)

export const imageType = z
  .enum([...baseImageTypes, ...capitalImageTypes])
  .default("jpeg")
  .transform((data) => data.toLowerCase() as ImageType)

export const ImageRawLegacySourcesSchema = nonEmptyRecord(
  /** Image size with related bee reference */
  imageSize,
  /** Bee reference or path */
  z.string(),
).transform((data) => {
  const sources: ImageRawSource[] = []
  for (const [size, reference] of Object.entries(data)) {
    sources.push({ width: parseInt(size), type: "jpeg", reference: reference as Reference })
  }
  return sources
})

export const ImageRawSourceBaseSchema = z.object({
  /** Image scaled width */
  width: z.number(),
  /** Image type */
  type: imageType.nullable(),
  /** Image path */
  path: z.string().optional(),
  /** Image reference */
  reference: beeReference.optional(),
})

const rawSourceBaseTransform = <T extends z.infer<typeof ImageRawSourceBaseSchema>>(data: T) => {
  if ("reference" in data && data.path) {
    delete data.reference
  }
  if ("path" in data && beeReference.safeParse(data.path).success) {
    data.reference = beeReference.parse(data.path)
    delete data.path
  }

  return {
    ...data,
    type: data.type || "jpeg",
  }
}

export const ImageRawSourceSchema = ImageRawSourceBaseSchema.transform(rawSourceBaseTransform)

export const ImageSourceSchema = ImageRawSourceBaseSchema.extend({
  /** Image URL */
  url: z.string().url(),
}).transform(rawSourceBaseTransform)

export const ImageRawSourcesSchema = z.array(
  ImageRawSourceSchema.superRefine((data, ctx) => {
    if (!data.reference && !data.path) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either reference or path must be defined",
      })
    }
  }),
)

export const ImageSourcesSchema = z.array(
  ImageSourceSchema.superRefine((data, ctx) => {
    if (!data.reference && !data.path) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either reference or path must be defined",
      })
    }
  }),
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
export type ImageType = (typeof baseImageTypes)[number]
export type ImageRawSource = z.infer<typeof ImageRawSourceSchema>
export type ImageSource = z.infer<typeof ImageSourceSchema>
export type ImageSources = z.infer<typeof ImageSourcesSchema>
export type ImageRawLegacySources = z.infer<typeof ImageRawLegacySourcesSchema>
export type ImageRawSources = z.infer<typeof ImageRawSourcesSchema>
export type ImageRaw = z.infer<typeof ImageRawSchema>
export type Image = z.infer<typeof ImageSchema>
