import { blurHashToDataURL } from "../../../src/utils"

import type { Image, ImageRaw } from "../../../src"

export const beeUrl = "http://localhost:1633"

export const blurhash = "L1TSUA?bfQ?b~qj[fQj[fQfQfQfQ"

export const blurhashDataURL = blurHashToDataURL(blurhash)

export const testImageRaw: ImageRaw = {
  aspectRatio: 1.6,
  blurhash,
  sources: {
    "100w": "1234567890123456789012345678901234567890123456789012345678901234",
    "200w": "0123456789012345678901234567890123456789012345678901234567890123",
  },
}

export const testImageParsed: Image = {
  aspectRatio: 1.6,
  blurhash,
  blurredBase64: blurhashDataURL,
  sources: {
    "100w":
      "http://localhost:1633/bzz/1234567890123456789012345678901234567890123456789012345678901234",
    "200w":
      "http://localhost:1633/bzz/0123456789012345678901234567890123456789012345678901234567890123",
  },
  url: "http://localhost:1633/bzz/0123456789012345678901234567890123456789012345678901234567890123",
}
