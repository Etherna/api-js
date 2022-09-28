import type { Image, ImageRaw } from "../.."
import type { BeeClient } from "../../clients"
import { ImageDeserializer, ImageSerializer } from "../../serializers"
import { extractReference } from "../../utils"

interface ImageReaderOptions {
  beeClient: BeeClient
}

export default class ImageReader {
  imageRaw: ImageRaw
  image: Image

  constructor(image: ImageRaw | Image, opts: ImageReaderOptions) {
    if ("src" in image) {
      this.image = image
      this.imageRaw = new ImageSerializer().serialize(image)
    } else {
      this.imageRaw = image
      this.image = new ImageDeserializer(opts.beeClient.url).deserialize(image)
    }
  }

  static getOriginalSourceReference(
    image: Image | ImageRaw | null | undefined
  ): string | undefined {
    const source = Object.entries(image?.sources ?? {}).sort(
      (a, b) => parseInt(b[0]) - parseInt(a[0])
    )[0]
    const isParsed = "src" in (image ?? {})
    if (isParsed && source?.[1]) {
      return extractReference(source[1])
    }
    return source?.[1] ?? undefined
  }
}
