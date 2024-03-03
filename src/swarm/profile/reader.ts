import { ProfileDeserializer } from "../../serializers"
import Cache from "../../utils/cache"
import BaseReader from "../base-reader"

import type { Profile, ProfileRaw } from "../.."
import type { BeeClient, EthAddress, EnsAddress } from "../../clients"
import type { ReaderDownloadOptions, ReaderOptions } from "../base-reader"
import { fetchAddressFromEns, fetchEnsFromAddress, isEnsAddress, isEthAddress } from "../../utils"

export type ProfileWithEns = Profile & { ens: EnsAddress | null }

interface ProfileReaderOptions extends ReaderOptions {
  prefetchData?: Profile
}

export const PROFILE_TOPIC = "EthernaUserProfile"

export const ProfileCache = new Cache<string, ProfileWithEns>()

export default class ProfileReader extends BaseReader<
  ProfileWithEns | null,
  EthAddress,
  ProfileRaw
> {
  address: EthAddress
  ensAddress: EnsAddress | null = null

  private beeClient: BeeClient

  constructor(address: EthAddress | EnsAddress, opts: ProfileReaderOptions) {
    const ethAddress = isEthAddress(address) ? address : opts.prefetchData?.address ?? "0x0"
    const ensAddress = isEnsAddress(address) ? address : null

    super(ethAddress, opts)
    this.beeClient = opts.beeClient
    this.address = ethAddress
    this.ensAddress = ensAddress
  }

  async download(opts?: ReaderDownloadOptions): Promise<ProfileWithEns | null> {
    if (ProfileCache.has(this.address)) return ProfileCache.get(this.address)!

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
      const feed = this.beeClient.feed.makeFeed(PROFILE_TOPIC, this.address, "sequence")
      const reader = this.beeClient.feed.makeReader(feed)
      const { reference } = await reader.download({
        headers: {
          // "x-etherna-reason": "profile-feed",
        },
      })
      const profileResp = await this.beeClient.bzz.download(reference, {
        headers: {
          // "x-etherna-reason": "profile",
        },
        maxResponseSize: opts?.maxResponseSize,
        onDownloadProgress: opts?.onDownloadProgress,
      })

      const rawProfile = profileResp.data.text()
      const profile = {
        ...new ProfileDeserializer(this.beeClient.url).deserialize(rawProfile),
        ens: this.ensAddress,
      }

      ProfileCache.set(this.address, profile)

      this.rawResponse = profileResp.data.json<ProfileRaw>()

      return profile
    } catch (error) {
      console.error(error)
      return null
    }
  }

  emptyProfile(): ProfileWithEns {
    return {
      address: this.address,
      ens: this.ensAddress,
      name: "",
      description: "",
      batchId: null,
      avatar: null,
      cover: null,
    }
  }
}
