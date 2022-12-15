import { beeReference } from "../../schemas/base"
import { ImageRawSchema } from "../../schemas/image"
import { blurHashToDataURL } from "../../utils/blurhash"
import { getBzzUrl } from "../../utils/bzz"

import type { Image } from "../.."

export type ImageDeserializerOptions = {
  /** Base path reference */
  reference: string
}

export default class ImageDeserializer {
  constructor(private beeUrl: string) {}

  deserialize(item: object, opts?: ImageDeserializerOptions): Image {
    const imageRaw = ImageRawSchema.parse(item)
    const sources = (Object.keys(imageRaw.sources) as (keyof typeof imageRaw.sources)[])
      .sort((a, b) => parseInt(b) - parseInt(a))
      .reduce<Image["sources"]>(
        (srcs, size) => ({
          ...srcs,
          [size]: beeReference.safeParse(imageRaw.sources![size]!).success
            ? getBzzUrl(this.beeUrl, imageRaw.sources![size]!)
            : getBzzUrl(this.beeUrl, opts?.reference ?? "", imageRaw.sources![size]!),
        }),
        {}
      )

    return {
      aspectRatio: imageRaw.aspectRatio,
      blurhash: imageRaw.blurhash,
      blurredBase64: blurHashToDataURL(imageRaw.blurhash),
      sources: sources,
      url: Object.values(sources)[0]!,
    }
  }
}
