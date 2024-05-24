import { ProfileDeserializer } from "../../serializers"
import { fetchEnsFromAddress } from "../../utils"
import { BaseWriter } from "../base-writer"
import { ProfileBuilder } from "./builder"
import { PROFILE_TOPIC, ProfileCache } from "./reader"

import type { BatchId, BeeClient, EthAddress, Reference } from "../../clients"
import type { WriterOptions, WriterUploadOptions } from "../base-writer"

interface ProfileWriterOptions extends WriterOptions {}

export class ProfileWriter extends BaseWriter<ProfileBuilder> {
  profileBuilder: ProfileBuilder
  beeClient: BeeClient

  constructor(profileBuilder: ProfileBuilder, opts: ProfileWriterOptions) {
    super(profileBuilder, opts)

    this.profileBuilder = profileBuilder
    this.beeClient = opts.beeClient
  }

  async upload(opts?: WriterUploadOptions): Promise<Reference> {
    if (!this.beeClient.signer) throw new Error("Enable your wallet to update your profile")

    const batchId = (opts?.batchId ??
      this.profileBuilder.previewMeta.batchId ??
      (await this.beeClient.stamps.fetchBestBatchId())) as BatchId

    // save mantary node
    const reference = await this.profileBuilder.saveNode({
      beeClient: this.beeClient,
      batchId,
      signal: opts?.signal,
    })

    // update feed
    const feed = this.beeClient.feed.makeFeed(
      PROFILE_TOPIC,
      this.profileBuilder.previewMeta.address,
      "epoch"
    )
    const writer = this.beeClient.feed.makeWriter(feed)
    await writer.upload(reference, {
      batchId,
      deferred: opts?.deferred,
      encrypt: opts?.encrypt,
      pin: opts?.pin,
      tag: opts?.tag,
      headers: {
        // "x-etherna-reason": "profile-feed-update",
      },
      signal: opts?.signal,
    })

    let ens = ProfileCache.get(this.profileBuilder.previewMeta.address as EthAddress)?.ens ?? null

    if (!ens) {
      ens = await fetchEnsFromAddress(this.profileBuilder.previewMeta.address)
    }

    // update cache
    const deserializer = new ProfileDeserializer(this.beeClient.url)
    ProfileCache.set(this.profileBuilder.previewMeta.address as EthAddress, {
      reference,
      preview: deserializer.deserializePreview(JSON.stringify(this.profileBuilder.previewMeta), {
        reference,
      }),
      details: deserializer.deserializeDetails(JSON.stringify(this.profileBuilder.detailsMeta), {
        reference,
      }),
      ens,
    })

    return reference
  }
}
