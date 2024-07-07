import { ImageDeserializer, ImageSerializer } from "../../serializers"
import { isImageTypeSupported } from "../../utils/image"

import type { Image, ImageRaw } from "../.."
import type { BeeClient } from "../../clients"

interface ImageReaderOptions {
  beeClient: BeeClient
}

export class ImageReader {
  imageRaw: ImageRaw
  image: Image

  constructor(image: ImageRaw | Image, opts: ImageReaderOptions) {
    if ("url" in image) {
      this.image = image
      this.imageRaw = new ImageSerializer().serialize(image)
    } else {
      this.imageRaw = image
      this.image = new ImageDeserializer(opts.beeClient.url).deserialize(image)
    }
  }

  static getBestImageUrl(image: Image, width = Number.MAX_SAFE_INTEGER): string {
    return (
      image.sources
        .filter((source) => isImageTypeSupported(source.type))
        .sort((a, b) => b.width - a.width)[0]?.url ?? image.url
    )
  }
}
