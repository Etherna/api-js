import { ImageRawSchema, ImageSchema } from "../../schemas/image"

import type { Image, ImageRaw, ImageRawSources } from "../.."

export class ImageSerializer {
  constructor() {}

  serialize(item: Image): ImageRaw {
    const image = ImageSchema.parse(item)

    const aspectRatio = image.aspectRatio
    const blurhash = image.blurhash
    const sources: ImageRawSources = image.sources.map(source => ({
      type: source.type,
      width: source.width,
      path: source.path,
      reference: source.reference,
    }))

    sources.forEach(src =>
      (Object.keys(src) as (keyof typeof src)[]).forEach(
        key => src[key] === undefined && delete src[key]
      )
    )

    const imageRaw = ImageRawSchema.parse({
      aspectRatio,
      blurhash,
      sources,
    })

    return imageRaw
  }
}
