import { ProfileDeserializer } from "../../serializers"
import Cache from "../../utils/cache"
import BaseReader from "../base-reader"

import type { Profile, ProfileRaw } from "../.."
import type { BeeClient, EthAddress } from "../../clients"
import type { ReaderDownloadOptions, ReaderOptions } from "../base-reader"

interface ProfileReaderOptions extends ReaderOptions {
  prefetchData?: Profile
}

export const PROFILE_TOPIC = "EthernaUserProfile"

export const ProfileCache = new Cache<string, Profile>()

export default class ProfileReader extends BaseReader<Profile | null, EthAddress, ProfileRaw> {
  address: EthAddress

  private beeClient: BeeClient

  constructor(address: EthAddress, opts: ProfileReaderOptions) {
    super(address, opts)
    this.beeClient = opts.beeClient
    this.address = address
  }

  async download(opts?: ReaderDownloadOptions): Promise<Profile | null> {
    if (ProfileCache.has(this.address)) return ProfileCache.get(this.address)!
    if (!this.address || this.address === "0x0") return null

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
      const profile = new ProfileDeserializer(this.beeClient.url).deserialize(rawProfile)

      ProfileCache.set(this.address, profile)

      this.rawResponse = profileResp.data.json<ProfileRaw>()

      return profile
    } catch (error) {
      console.error(error)
      return null
    }
  }

  emptyProfile(): Profile {
    return {
      address: this.address,
      name: "",
      description: "",
      batchId: null,
      avatar: null,
      cover: null,
    }
  }
}
