import type { ImageRaw, ImageRawSources } from "../.."
import type { BeeClient, Reference } from "../../clients"
import { ImageSerializer } from "../../serializers"
import { imageToBlurhash } from "../../utils/blurhash"
import { bufferToDataURL, fileToBuffer } from "../../utils/buffer"
import { resizeImage } from "../../utils/image"
import type { WriterUploadOptions } from "../base-writer"

interface ImageWriterOptions {
  beeClient: BeeClient
  responsiveSizes?: number[]
}

export default class ImageWriter {
  private beeClient: BeeClient
  private responsiveSizes: number[]
  private file: File
  private preGenerateImages?: Awaited<ReturnType<typeof this.generateImages>>

  static defaultResponsiveSizes = [480, 768, 1024, 1280, 1800]
  static avatarResponsiveSizes = [128, 256, 512]
  static thumbnailResponsiveSizes = [480, 960, 1280]

  constructor(file: File, opts: ImageWriterOptions) {
    this.beeClient = opts.beeClient
    this.responsiveSizes = opts.responsiveSizes ?? ImageWriter.defaultResponsiveSizes
    this.file = file
  }

  /**
   * Upload the image(s) data on swarm
   *
   * @param options Upload options
   * @returns The raw image object
   */
  async upload(options?: WriterUploadOptions): Promise<ImageRaw> {
    const { blurhash, imageAspectRatio, responsiveSourcesData } =
      this.preGenerateImages ?? (await this.generateImages())

    const batchId = await this.beeClient.stamps.fetchBestBatchId()

    // upload files and retrieve the new reference
    let results: Reference[] = []
    let multipleCompletion = 0
    const responsiveSources = Object.entries(responsiveSourcesData)
    for (const [size, data] of responsiveSources) {
      const result = await this.beeClient.bzz.upload(data, {
        batchId,
        onUploadProgress: completion => {
          if (options?.onUploadProgress) {
            multipleCompletion += completion
            options.onUploadProgress(multipleCompletion / responsiveSources.length)
          }
        },
        signal: options?.signal,
        contentType: this.file.type,
        headers: {
          // "x-etherna-reason": `image-source-${size}-upload`,
        },
      })
      results.push(result.reference)
    }

    // clear memory
    this.preGenerateImages = undefined

    const sources: ImageRawSources = Object.keys(responsiveSourcesData).reduce(
      (obj, size, i) => ({
        ...obj,
        [size]: this.beeClient.bzz.url(results[i]!),
      }),
      {}
    )

    const imageRaw = new ImageSerializer().serialize({
      aspectRatio: imageAspectRatio,
      blurhash,
      sources,
      blurredBase64: "",
      src: this.beeClient.bzz.url(results[0]!),
    })

    return imageRaw
  }

  /**
   * Generate a Data URL string from the file
   */
  async getFilePreview(): Promise<string> {
    return await bufferToDataURL(await fileToBuffer(this.file))
  }

  /**
   * Pregenerate images and return the total size of the images,
   * used to calculate the best postage batch
   */
  async pregenerateImages(): Promise<number> {
    this.preGenerateImages = await this.generateImages()
    return Object.values(this.preGenerateImages.responsiveSourcesData).reduce(
      (acc, cur) => acc + cur.length,
      0
    )
  }

  // Private methods

  /**
   * Generate the preview, base64 and responsive images from the selected file
   */
  private async generateImages() {
    const originalImageData = await fileToBuffer(this.file)
    const imageSize = await this.getFileImageSize(originalImageData)

    const blurhash = await imageToBlurhash(originalImageData, imageSize.width, imageSize.height)
    const imageAspectRatio = imageSize.width / imageSize.height

    const responsiveSourcesData: { [size: `${number}w`]: Uint8Array } = {
      [`${imageSize.width}w`]: new Uint8Array(originalImageData),
    }

    const inferiorSizes = this.responsiveSizes.filter(size => size < imageSize.width)
    if (inferiorSizes.length < 2 && inferiorSizes[0] !== imageSize.width) {
      inferiorSizes.push(imageSize.width)
    }
    for (const size of inferiorSizes) {
      const blob = await this.imageToResponsiveSize(this.file, size)
      responsiveSourcesData[`${size}w`] = new Uint8Array(await blob?.arrayBuffer())
    }

    return {
      blurhash,
      imageAspectRatio,
      responsiveSourcesData,
    }
  }

  getFileImageSize(buffer: ArrayBuffer) {
    return new Promise<{ width: number; height: number }>(async (resolve, reject) => {
      try {
        const dataURL = await bufferToDataURL(buffer)
        const img = new Image()
        img.onload = function () {
          resolve({
            width: img.width,
            height: img.height,
          })
        }
        img.onerror = reject
        img.src = dataURL
      } catch (error: any) {
        reject(error)
      }
    })
  }

  async imageToResponsiveSize(image: File | Blob, width: number) {
    return await resizeImage(image, width, 95)
  }
}
