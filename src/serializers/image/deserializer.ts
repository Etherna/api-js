import { beeReference } from "../../schemas/base"
import { ImageRawSchema } from "../../schemas/image"
import { blurHashToDataURL } from "../../utils/blurhash"
import { getBzzUrl } from "../../utils/bzz"

import type { Image, ImageSource } from "../.."
import type { Reference } from "../../clients"

export type ImageDeserializerOptions = {
  /** Base path reference */
  reference?: Reference
}

export class ImageDeserializer {
  constructor(private beeUrl: string) {}

  deserialize(item: object, opts?: ImageDeserializerOptions): Image {
    const imageRaw = ImageRawSchema.parse(item)
    const rawSources = imageRaw.sources
    const sources = rawSources
      .map(source => ({
        ...source,
        url: beeReference.safeParse(source.reference!).success
          ? getBzzUrl(this.beeUrl, source.reference!)
          : getBzzUrl(this.beeUrl, opts?.reference ?? "", source.path!),
      }))
      .sort((a: ImageSource, b: ImageSource) => b.width - a.width)

    return {
      aspectRatio: imageRaw.aspectRatio,
      blurhash: imageRaw.blurhash,
      blurredBase64: blurHashToDataURL(imageRaw.blurhash),
      sources: sources,
      url: Object.values(sources)[0]!.url,
    }
  }
}
