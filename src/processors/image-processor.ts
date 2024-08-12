import { makeChunkedFile } from "@fairdatasociety/bmt-js"

import { BaseProcessor } from "./base-processor"
import { ImageTypeSchema } from "@/schemas/image"
import {
  bytesReferenceToReference,
  fileToBuffer,
  getImageMeta,
  getReferenceFromData,
  imageToBlurhash,
  resizeImage,
} from "@/utils"

import type { ProcessorOutput } from "./base-processor"
import type { Image } from "@/schemas/image"

export interface ImageProcessorOptions {
  sizes: number[] | "avatar" | "cover" | "thumbnail"
  /**
   * The path format for the image
   *
   * - `$size` will be replaced by the image size
   * - `$type` will be replaced by the image type
   *
   * Example: `avatar/$size-$type`
   */
  pathFormat: string
}

const AVATAR_SIZES = [128, 256, 512]
const COVER_SIZES = [480, 768, 1024, 1280, 1800]
const THUMBNAIL_SIZES = [480, 960, 1280]

export class ImageProcessor extends BaseProcessor {
  public image: Image | null = null

  public override async process(options: ImageProcessorOptions): Promise<ProcessorOutput[]> {
    const originalImageData = new Uint8Array(
      this.input instanceof File ? await fileToBuffer(this.input) : this.input,
    )

    const imageMeta = await getImageMeta(originalImageData)
    const originalImageBlob = new Blob([originalImageData], {
      type: `image/${imageMeta.type}`,
    })

    const blurhash = await imageToBlurhash(originalImageData, imageMeta.width, imageMeta.height)
    const aspectRatio = imageMeta.width / imageMeta.height

    const parsePath = (width: number, type: string) =>
      options.pathFormat.replace(/\$size/g, width.toString()).replace(/\$type/g, type)
    const parseFilename = (width: number, type: string) =>
      `${typeof options.sizes === "string" ? options.sizes : "image"}-${width}w-${type}`

    const output = [
      {
        type: ImageTypeSchema.parse(imageMeta.type),
        width: imageMeta.width,
        filename: parseFilename(imageMeta.width, imageMeta.type),
        entryAddress: getReferenceFromData(originalImageData),
        path: parsePath(imageMeta.width, imageMeta.type),
      },
    ]

    const sizes = Array.isArray(options.sizes)
      ? options.sizes
      : (() => {
          switch (options.sizes) {
            case "avatar":
              return AVATAR_SIZES
            case "cover":
              return COVER_SIZES
            case "thumbnail":
              return THUMBNAIL_SIZES
          }
        })()

    const inferiorSizes = sizes.filter((size) => size < imageMeta.width)
    if (inferiorSizes.length < 2 && inferiorSizes[0] !== imageMeta.width) {
      inferiorSizes.push(imageMeta.width)
    }

    for (const size of inferiorSizes) {
      const blob = await resizeImage(originalImageBlob, size, 95)
      const data = new Uint8Array(await blob.arrayBuffer())
      const chunkedFile = makeChunkedFile(data)

      // append to uploader queue
      this.uploader?.append(chunkedFile)
      // add chunks collisions
      chunkedFile
        .bmt()
        .flat()
        .forEach((chunk) => this.stampCalculator.add(bytesReferenceToReference(chunk.address())))

      const type = blob.type.split("/")[1] as string

      output.push({
        type: ImageTypeSchema.parse(type),
        width: size,
        filename: parseFilename(size, type),
        entryAddress: getReferenceFromData(data),
        path: parsePath(size, type),
      })
    }

    const image = {
      blurhash,
      aspectRatio,
      sources: output.map(({ type, width, path }) => ({
        type,
        width,
        path,
      })),
    } satisfies Image

    this.image = image
    this.isProcessed = true

    this.processorOutputs = output.map(({ path, entryAddress, type, filename }) => ({
      path,
      entryAddress,
      metadata: {
        filename,
        contentType: `image/${type}`,
      },
    }))

    return this.processorOutputs
  }
}
