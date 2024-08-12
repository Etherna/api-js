import { BaseMantarayManifest } from "./base-manifest"
import { EthernaSdkError, throwSdkError } from "@/classes"
import { EmptyAddress, MANIFEST_DETAILS_PATH } from "@/consts"
import { ProfileDetailsSchema, ProfilePreviewSchema } from "@/schemas/profile-schema"
import {
  bytesReferenceToReference,
  fetchAddressFromEns,
  fetchEnsFromAddress,
  isEnsAddress,
  isEthAddress,
} from "@/utils"

import type {
  BaseManifestOptions,
  BaseManifestUploadOptions,
  BaseMantarayManifestDownloadOptions,
} from "./base-manifest"
import type { ImageProcessor } from "@/processors/image-processor"
import type { ProfileDetails, ProfilePreview } from "@/schemas/profile-schema"
import type { EnsAddress, EthAddress } from "@/types/eth"
import type { BatchId, Reference } from "@/types/swarm"

export interface Profile {
  reference: Reference
  address: EthAddress
  ensName: EnsAddress | null
  preview: ProfilePreview
  details: ProfileDetails
}

export const PROFILE_TOPIC = "EthernaUserProfile"

type Init = EthAddress | EnsAddress | { preview: ProfilePreview; details: ProfileDetails }

export class ProfileManifest extends BaseMantarayManifest {
  private _address: EthAddress = EmptyAddress
  private _ensName: EnsAddress | null = null

  override _preview: ProfilePreview = {
    address: EmptyAddress,
    avatar: null,
    name: "",
  }
  override _details: ProfileDetails = {
    cover: null,
    playlists: [],
  }

  constructor(init: Init, options: BaseManifestOptions) {
    super(init, options)

    if (typeof init === "object") {
      this.setPreviewProxy(init.preview)
      this.setDetailsProxy(init.details)
    } else {
      this.setPreviewProxy(this._preview)
      this.setDetailsProxy(this._details)

      if (isEthAddress(init)) {
        this._address = init
      } else if (isEnsAddress(init)) {
        this._ensName = init
      }
    }
  }

  public get address() {
    return this._address
  }

  public get ensName() {
    return this._ensName
  }

  public override get preview() {
    return this._preview
  }

  public override get details() {
    return this._details
  }

  public override async download(options: BaseMantarayManifestDownloadOptions): Promise<Profile> {
    try {
      if (this.address === EmptyAddress && this.ensName) {
        this._address = (await fetchAddressFromEns(this.ensName)) ?? EmptyAddress
        this._preview.address = this.address
      }

      if (this.address === EmptyAddress) {
        throw new EthernaSdkError("INVALID_ARGUMENT", "Address or ENS name is required")
      }

      const ensPromise = this.ensName
        ? Promise.resolve(this.ensName)
        : fetchEnsFromAddress(this.address)

      const feed = this.beeClient.feed.makeFeed(PROFILE_TOPIC, this.address, "epoch")
      const reader = this.beeClient.feed.makeReader(feed)
      const { reference } = await reader.download({
        headers: {
          // "x-etherna-reason": "profile-feed",
          ...options.headers,
        },
        signal: options.signal,
        timeout: options.timeout,
      })

      const shouldDownloadPreview = options.mode === "preview" || options.mode === "full"
      const shouldDownloadDetails = options.mode === "details" || options.mode === "full"

      const previewPromise = shouldDownloadPreview
        ? this.beeClient.bzz
            .download(reference, {
              headers: {
                // "x-etherna-reason": "profile-preview",
                ...options.headers,
              },
              signal: options.signal,
              timeout: options.timeout,
              onDownloadProgress: options.onDownloadProgress,
            })
            .then((resp) => ProfilePreviewSchema.parse(resp.data.json()))
        : Promise.resolve(this.preview)
      const detailsPromise = shouldDownloadDetails
        ? this.beeClient.bzz
            .downloadPath(reference, MANIFEST_DETAILS_PATH, {
              headers: {
                // "x-etherna-reason": "profile-preview",
                ...options.headers,
              },
              signal: options.signal,
              timeout: options.timeout,
              onDownloadProgress: options.onDownloadProgress,
            })
            .then((resp) => ProfileDetailsSchema.parse(resp.data.json()))
        : Promise.resolve(this.details)

      this._reference = reference
      this._preview = await previewPromise
      this._details = await detailsPromise
      this._ensName = await ensPromise
      this._hasLoadedPreview = shouldDownloadPreview
      this._hasLoadedDetails = shouldDownloadDetails
      this._isDirty = false

      return {
        reference: this.reference,
        address: this.address,
        ensName: this.ensName,
        preview: this.preview,
        details: this.details,
      }
    } catch (error) {
      throwSdkError(error)
    }
  }

  public override async upload(options?: BaseManifestUploadOptions): Promise<Profile> {
    try {
      await Promise.all([
        this.prepareForUpload(options?.batchId, options?.batchLabelQuery),
        this.loadNode(),
      ])

      // after 'prepareForUpload' batchId must be defined
      const batchId = this.batchId as BatchId

      // ensure data is not malformed
      this._preview = ProfilePreviewSchema.parse(this.preview)
      this._details = ProfileDetailsSchema.parse(this.details)

      // update data
      this.updateNodeDefaultEntries()
      this.enqueueData(new TextEncoder().encode(JSON.stringify(this.preview)), {
        ...options,
        batchId,
      })
      this.enqueueData(new TextEncoder().encode(JSON.stringify(this.details)), {
        ...options,
        batchId,
      })

      // save mantary node
      this._reference = await this.node
        .save(async (data) => {
          return this.enqueueData(data, {
            ...options,
            batchId,
          })
        })
        .then(bytesReferenceToReference)
      await this.queue.drain()

      // update feed
      const feed = this.beeClient.feed.makeFeed(PROFILE_TOPIC, this.address, "epoch")
      const writer = this.beeClient.feed.makeWriter(feed)
      await writer.upload(this.reference, {
        batchId,
        deferred: options?.deferred,
        encrypt: options?.encrypt,
        pin: options?.pin,
        tag: options?.tag,
        signal: options?.signal,
        headers: {
          // "x-etherna-reason": "profile-feed-update",
        },
      })

      return {
        reference: this.reference,
        address: this.address,
        ensName: this.ensName,
        preview: this.preview,
        details: this.details,
      }
    } catch (error) {
      throwSdkError(error)
    }
  }

  public async addAvatar(imageProcessor: ImageProcessor) {
    this.addImageFromProcessor(imageProcessor)
    this.preview.avatar = imageProcessor.image
  }

  public async addCover(imageProcessor: ImageProcessor) {
    this.addImageFromProcessor(imageProcessor)
    this.details.cover = imageProcessor.image
  }

  public removeAvatar() {
    for (const source of this.preview.avatar?.sources ?? []) {
      if (source.path) {
        this.removeFile(source.path)
      }
    }
    this.preview.avatar = null
  }

  public removeCover() {
    for (const source of this.details.cover?.sources ?? []) {
      if (source.path) {
        this.removeFile(source.path)
      }
    }
    this.details.cover = null
  }

  private addImageFromProcessor(imageProcessor: ImageProcessor) {
    if (!imageProcessor.image) {
      throw new Error("Image not processed. Run 'process' method first")
    }

    this.enqueueProcessor(imageProcessor)
    this.removeAvatar()

    imageProcessor.processorOutputs.forEach((output) => {
      this.addFile(output.entryAddress, output.path, output.metadata)
    })
  }
}
