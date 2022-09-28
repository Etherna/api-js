import type { Profile } from "../.."
import type { BeeClient, EthAddress, Reference } from "../../clients"
import { makeHexString } from "../../clients/bee/utils/hex"
import { ProfileSerializer } from "../../serializers"
import type { WriterOptions, WriterUploadOptions } from "../base-writer"
import BaseWriter from "../base-writer"
import { ProfileCache, PROFILE_TOPIC } from "./reader"

interface ProfileWriterOptions extends WriterOptions {}

export default class ProfileWriter extends BaseWriter<Profile> {
  profile: Profile
  beeClient: BeeClient

  constructor(profile: Profile, opts: ProfileWriterOptions) {
    super(profile, opts)

    this.profile = profile
    this.beeClient = opts.beeClient
  }

  async upload(opts?: WriterUploadOptions): Promise<Reference> {
    if (!this.beeClient.signer) throw new Error("Enable your wallet to update your profile")

    const batchId = await this.beeClient.stamps.fetchBestBatchId()
    const rawProfile = new ProfileSerializer().serialize(this.profile)

    // Upload json
    const { reference } = await this.beeClient.bzz.upload(rawProfile, {
      batchId,
      headers: {
        "content-type": "application/json",
        // "x-etherna-reason": "profile-upload",
      },
      signal: opts?.signal,
      onUploadProgress: opts?.onUploadProgress,
    })

    // update feed
    const feed = this.beeClient.feed.makeFeed(
      PROFILE_TOPIC,
      this.profile.address as EthAddress,
      "sequence"
    )
    const writer = this.beeClient.feed.makeWriter(feed)
    await writer.upload(reference, {
      batchId,
      headers: {
        // "x-etherna-reason": "profile-feed-update",
      },
      signal: opts?.signal,
    })

    // update cache
    ProfileCache.set(this.profile.address as EthAddress, this.profile)

    return reference
  }
}
