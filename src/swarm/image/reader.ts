import { ImageDeserializer, ImageSerializer } from "../../serializers"

import type { Image, ImageRaw } from "../.."
import type { BeeClient } from "../../clients"

interface ImageReaderOptions {
  beeClient: BeeClient
}

export default class ImageReader {
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
}
