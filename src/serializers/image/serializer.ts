import type { ImageRaw, ImageRawSources, Image } from "../.."
import { ImageSchema } from "../../schemas/image"
import { extractReference } from "../../utils/bzz"

export default class ImageSerializer {
  constructor() {}

  serialize(item: Image): ImageRaw {
    const image = ImageSchema.parse(item)

    const aspectRatio = image.aspectRatio
    const blurhash = image.blurhash
    const sources: ImageRawSources = Object.keys(image.sources).reduce(
      (acc, key) => ({
        ...acc,
        [key]: extractReference(image.sources[key as keyof typeof image.sources]!),
      }),
      {}
    )

    const imageRaw: ImageRaw = {
      aspectRatio,
      blurhash,
      sources,
    }

    return imageRaw
  }
}
