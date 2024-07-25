import type { ImageType } from "../schemas/image"

declare global {
  interface HTMLCanvasElement {
    msToBlob(): Blob
  }
}

/**
 * Resize an image
 *
 * @param imageBlob Image file to resize
 * @param toWidth Scaled width
 * @param quality Image quality (0-100)
 * @returns The resized image blob
 */
export async function resizeImage(
  imageBlob: File | Blob,
  toWidth: number,
  quality = 90,
): Promise<Blob> {
  const image = await createImage(imageBlob)

  const ratio = toWidth / image.width
  const width = Math.floor(toWidth)
  const height = Math.floor(image.height * ratio)

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, width, height)

  URL.revokeObjectURL(image.src)

  if (typeof canvas.toBlob !== "undefined") {
    return new Promise((res) =>
      canvas.toBlob((blob) => res(blob as Blob), imageBlob.type, quality / 100),
    )
  } else if (typeof canvas.msToBlob !== "undefined") {
    return canvas.msToBlob()
  }

  throw new Error("Cannot create blob from canvas")
}

/**
 * Get the image type from the file name
 *
 * @param fileName The file name
 * @returns The image type
 */
export function isImageTypeSupported(type: ImageType) {
  switch (type) {
    case "jpeg":
    case "png":
      return true
    case "webp":
      return isWebpSupported()
    case "avif":
      return isAvifSupported()
    default:
      return false
  }
}

/**
 * Check if the browser supports the AVIF image format
 *
 * @returns true if AVIF is supported, false otherwise
 */
export function isAvifSupported() {
  const canvas = document.createElement("canvas")
  return canvas.toDataURL("image/avif").indexOf("data:image/avif") === 0
}

/**
 * Check if the browser supports the WebP image format
 *
 * @returns true if WebP is supported, false otherwise
 */
export function isWebpSupported() {
  const canvas = document.createElement("canvas")
  return canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0
}

function createImage(blob: File | Blob) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const image = new Image()
    image.src = URL.createObjectURL(blob)
    image.onload = () => res(image)
    image.onerror = (error) => rej(error)
  })
}
