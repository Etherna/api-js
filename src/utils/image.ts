export {}

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
export const resizeImage = async (
  imageBlob: File | Blob,
  toWidth: number,
  quality = 90
): Promise<Blob> => {
  const image = await createImage(imageBlob)

  const ratio = toWidth / image.width
  const width = Math.floor(toWidth)
  const height = Math.floor(image.height * ratio)

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext("2d")!
  ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, width, height)

  URL.revokeObjectURL(image.src)

  if (typeof canvas.toBlob !== "undefined") {
    return new Promise(res => canvas.toBlob(blob => res(blob!), imageBlob.type, quality / 100))
  } else if (typeof canvas.msToBlob !== "undefined") {
    return canvas.msToBlob()
  }

  throw new Error("Cannot create blob from canvas")
}

const createImage = (blob: File | Blob) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const image = new Image()
    image.src = URL.createObjectURL(blob)
    image.onload = () => res(image)
    image.onerror = error => rej(error)
  })
