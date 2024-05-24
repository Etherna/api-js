import {
  ProfileDetailsRaw,
  ProfileDetailsRawSchema,
  ProfilePreviewRawSchema,
} from "../../schemas/profile"
import { ProfileDeserializer } from "../../serializers"
import { fetchAddressFromEns, fetchEnsFromAddress, isEnsAddress, isEthAddress } from "../../utils"
import { Cache } from "../../utils/cache"
import { BaseReader } from "../base-reader"

import type { Profile, ProfileRaw } from "../.."
import type { BeeClient, EnsAddress, EthAddress, Reference } from "../../clients"
import type { ReaderDownloadOptions, ReaderOptions } from "../base-reader"

export type ProfileWithEns = Profile & { ens: EnsAddress | null }

export type ProfileDownloadMode = "preview" | "full"

type PrefetchProfileData = Omit<Profile, "reference">

interface ProfileReaderOptions extends ReaderOptions {
  prefetchData?: PrefetchProfileData
}

interface ProfileReaderDownloadOptions extends ReaderDownloadOptions {
  mode: ProfileDownloadMode
}

export const PROFILE_TOPIC = "EthernaUserProfile"

export const ProfileCache = new Cache<string, ProfileWithEns>()

export class ProfileReader extends BaseReader<ProfileWithEns | null, EthAddress, ProfileRaw> {
  address: EthAddress
  ensAddress: EnsAddress | null = null

  private beeClient: BeeClient

  constructor(address: EthAddress | EnsAddress, opts: ProfileReaderOptions) {
    const ethAddress = isEthAddress(address) ? address : opts.prefetchData?.preview.address ?? "0x0"
    const ensAddress = isEnsAddress(address) ? address : null

    super(ethAddress, opts)
    this.beeClient = opts.beeClient
    this.address = ethAddress
    this.ensAddress = ensAddress
  }

  async download(opts: ProfileReaderDownloadOptions): Promise<ProfileWithEns | null> {
    const cachedProfile = ProfileCache.get(this.address)

    // preview is always available. if mode is full make sure also detals are available
    if (cachedProfile && (opts.mode === "preview" || cachedProfile.details)) return cachedProfile

    const isEmptyAddress = this.address === "0x0"

    if (!this.address || (isEmptyAddress && !this.ensAddress)) return null

    if (isEmptyAddress) {
      const address = await fetchAddressFromEns(this.ensAddress!)

      if (!address) return null

      this.address = address
    }

    if (!this.ensAddress) {
      this.ensAddress = await fetchEnsFromAddress(this.address)
    }

    // Fetch profile from feed
    try {
      const feed = this.beeClient.feed.makeFeed(PROFILE_TOPIC, this.address, "epoch")
      const reader = this.beeClient.feed.makeReader(feed)
      const { reference } = await reader.download({
        headers: {
          // "x-etherna-reason": "profile-feed",
        },
      })
      const profileRaw = await this.downloadProfile(reference, opts)

      if (!profileRaw) return null

      const deserializer = new ProfileDeserializer(this.beeClient.url)
      const profile = {
        reference,
        preview: deserializer.deserializePreview(JSON.stringify(profileRaw.preview), { reference }),
        details: profileRaw?.details
          ? deserializer.deserializeDetails(JSON.stringify(profileRaw.details), { reference })
          : undefined,
        ens: this.ensAddress,
      } satisfies ProfileWithEns

      ProfileCache.set(this.address, profile)

      this.rawResponse = profileRaw

      return profile
    } catch (error) {
      console.error(error)
      return null
    }
  }

  emptyProfile(reference: Reference): ProfileWithEns {
    return {
      reference,
      ens: this.ensAddress,
      preview: {
        name: "",
        address: this.address,
        avatar: null,
        batchId: null,
      },
      details: {
        description: null,
        cover: null,
      },
    }
  }

  private async downloadProfile(
    reference: Reference,
    opts: ProfileReaderDownloadOptions
  ): Promise<ProfileRaw | null> {
    const downloadDetails = opts.mode === "full"
    const [previewResult, detailsResult] = await Promise.allSettled([
      this.beeClient.bzz.download(reference, {
        headers: {
          // "x-etherna-reason": "profile-preview",
        },
        maxResponseSize: opts?.maxResponseSize,
        onDownloadProgress: opts?.onDownloadProgress,
      }),
      downloadDetails
        ? this.beeClient.bzz.downloadPath(reference, "details", {
            headers: {
              // "x-etherna-reason": "profile-details",
            },
            maxResponseSize: opts?.maxResponseSize,
            onDownloadProgress: opts?.onDownloadProgress,
          })
        : Promise.resolve(null),
    ])

    if (previewResult.status === "rejected") {
      return null
    }

    const legacyParsing = ProfilePreviewRawSchema.merge(ProfileDetailsRawSchema).safeParse(
      previewResult.value.data.json()
    )
    const previewParsing = ProfilePreviewRawSchema.safeParse(previewResult.value.data.json())
    const detailsParsing = ProfileDetailsRawSchema.safeParse(
      detailsResult.status === "fulfilled" ? detailsResult.value?.data.json() : null
    )

    if (!previewParsing.success) {
      return null
    }

    const preview = previewParsing.data
    const details = detailsParsing.success
      ? detailsParsing.data
      : legacyParsing.success
        ? ({
            description: legacyParsing.data.description,
            cover: legacyParsing.data.cover,
            birthday: legacyParsing.data.birthday,
            location: legacyParsing.data.location,
            website: legacyParsing.data.website,
          } satisfies ProfileDetailsRaw)
        : undefined

    return {
      preview,
      details,
    } satisfies ProfileRaw
  }
}
