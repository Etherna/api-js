import { ImageRawSchema } from "../../schemas/image"
import { blurHashToDataURL } from "../../utils/blurhash"
import { getBzzUrl } from "../../utils/bzz"

import type { Image } from "../.."

export default class ImageDeserializer {
  constructor(private beeUrl: string) {}

  deserialize(item: object): Image {
    const imageRaw = ImageRawSchema.parse(item)
    const sources = Object.keys(imageRaw.sources)
      .sort((a, b) => parseInt(b) - parseInt(a))
      .reduce<Image["sources"]>(
        (srcs, size) => ({
          ...srcs,
          [size]: getBzzUrl(this.beeUrl, imageRaw.sources![size as keyof typeof imageRaw.sources]!),
        }),
        {}
      )

    return {
      aspectRatio: imageRaw.aspectRatio,
      blurhash: imageRaw.blurhash,
      blurredBase64: blurHashToDataURL(imageRaw.blurhash),
      sources: sources,
      src: Object.values(sources)[0]!,
    }
  }
}
