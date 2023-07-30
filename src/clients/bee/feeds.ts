import { etc } from "@noble/secp256k1"

import { makeBytes, serializeBytes } from "./utils/bytes"
import { extractUploadHeaders } from "./utils/headers"
import { makeHexString } from "./utils/hex"
import { makeBytesReference } from "./utils/reference"
import { writeUint64BigEndian } from "./utils/uint64"

import type BeeClient from "."
import type {
  EthAddress,
  FeedInfo,
  FeedType,
  FeedUpdateHeaders,
  FeedUpdateOptions,
  FeedUploadOptions,
  Index,
  ReferenceResponse,
} from "./types"
import type { AxiosError, AxiosResponseHeaders, RawAxiosResponseHeaders } from "axios"
import { EpochFeed, EpochIndex, FeedChunk } from "../../classes"
import { toEthAccount } from "../../utils/bytes"
import {
  ZeroHashReference,
  bytesReferenceToReference,
  encodePath,
  getReferenceFromData,
  keccak256Hash,
  referenceToBytesReference,
} from "../../utils"
import { MantarayNode } from "../../handlers"

const feedEndpoint = "/feeds"

export default class Feed {
  constructor(private instance: BeeClient) {}

  makeFeed<T extends FeedType>(
    topicName: string,
    owner: EthAddress,
    type: T = "sequence" as T
  ): FeedInfo<T> {
    return {
      topic: etc.bytesToHex(keccak256Hash(topicName)),
      owner: makeHexString(owner),
      type,
    }
  }

  makeReader<T extends FeedType>(feed: FeedInfo<T>) {
    const instance = this.instance
    return {
      ...feed,
      async download(options?: FeedUpdateOptions) {
        const at = options?.at ?? new Date()

        if (feed.type === "epoch") {
          const epochFeed = new EpochFeed(instance)
          const chunk = await epochFeed.tryFindEpochFeed(
            toEthAccount(feed.owner),
            etc.hexToBytes(feed.topic),
            at,
            options?.index ? EpochIndex.fromString(options.index) : undefined
          )

          if (!chunk) {
            throw new Error("No epoch feed found")
          }

          const reference = etc.bytesToHex(chunk.getContentPayload())

          return {
            reference,
          }
        } else {
          const { data } = await instance.request.get<ReferenceResponse>(
            `${feedEndpoint}/${feed.owner}/${feed.topic}`,
            {
              params: {
                type: feed.type,
                at: at.getTime(),
              },
              headers: options?.headers,
              signal: options?.signal,
              timeout: options?.timeout,
            }
          )

          return {
            reference: data.reference,
          }
        }
      },
    }
  }

  makeWriter<T extends FeedType>(feed: FeedInfo<T>) {
    if (!this.instance.signer) {
      throw new Error("No signer provided")
    }

    if (makeHexString(this.instance.signer.address).toLowerCase() !== feed.owner.toLowerCase()) {
      throw new Error("Signer address does not match feed owner")
    }

    const upload = async (reference: string, options: FeedUploadOptions) => {
      const canonicalReference = makeBytesReference(reference)

      if (feed.type === "epoch") {
        const epochFeed = new EpochFeed(this.instance)
        const chunk = await epochFeed.createNextEpochFeedChunk(
          toEthAccount(feed.owner),
          etc.hexToBytes(feed.topic),
          canonicalReference,
          options.index ? EpochIndex.fromString(options.index) : undefined
        )

        const identifier = FeedChunk.buildIdentifier(etc.hexToBytes(feed.topic), chunk.index)
        const reference = await this.instance.soc.upload(identifier, chunk.payload, options)

        return {
          reference,
          index: chunk.index.toString(),
        }
      } else {
        const nextIndex =
          options.index && options.index !== "latest"
            ? options.index
            : await this.findNextIndex(feed)

        const at = Math.floor((options.at?.getTime() ?? Date.now()) / 1000.0)
        const timestamp = writeUint64BigEndian(at)
        const payloadBytes = serializeBytes(timestamp, canonicalReference)
        const identifier = this.makeFeedIdentifier(feed.topic, nextIndex)

        const reference = await this.instance.soc.upload(identifier, payloadBytes, options)

        return {
          reference,
          index: nextIndex,
        }
      }
    }

    return {
      upload,
    }
  }

  async createRootManifest<T extends FeedType>(feed: FeedInfo<T>, options: FeedUploadOptions) {
    const response = await this.instance.request.post<ReferenceResponse>(
      `${feedEndpoint}/${feed.owner}/${feed.topic}`,
      null,
      {
        params: {
          type: feed.type,
        },
        headers: extractUploadHeaders(options),
        timeout: options?.timeout,
        signal: options?.signal,
      }
    )

    return response.data.reference
  }

  async makeRootManifest<T extends FeedType>(feed: FeedInfo<T>, options: FeedUploadOptions) {
    const node = new MantarayNode()
    node.addFork(encodePath("/"), ZeroHashReference, {
      "swarm-feed-owner": feed.owner.toLowerCase(),
      "swarm-feed-topic": feed.topic,
      "swarm-feed-type": feed.type.replace("^[a-z]", c => c.toUpperCase()),
    })

    const reference = await node.save(async data => {
      return referenceToBytesReference(getReferenceFromData(data))
    })

    return bytesReferenceToReference(reference)
  }

  // Utils
  async fetchLatestFeedUpdate<T extends FeedType>(feed: FeedInfo<T>) {
    const resp = await this.instance.request.get<ReferenceResponse>(
      `${feedEndpoint}/${feed.owner}/${feed.topic}`,
      {
        params: {
          type: feed.type,
        },
      }
    )

    return {
      reference: resp.data.reference,
      ...this.readFeedUpdateHeaders(resp.headers),
    }
  }

  async findNextIndex<T extends FeedType>(feed: FeedInfo<T>) {
    try {
      const feedUpdate = await this.fetchLatestFeedUpdate(feed)

      return makeHexString(feedUpdate.feedIndexNext)
    } catch (e: any) {
      const error = e as AxiosError

      if (error.response?.status === 404) {
        return etc.bytesToHex(makeBytes(8))
      }
      throw e
    }
  }

  private readFeedUpdateHeaders(
    headers: RawAxiosResponseHeaders | AxiosResponseHeaders | Partial<Record<string, string>>
  ): FeedUpdateHeaders {
    const feedIndex = headers["swarm-feed-index"]
    const feedIndexNext = headers["swarm-feed-index-next"]

    if (!feedIndex) {
      throw new Error("Response did not contain expected swarm-feed-index!")
    }

    if (!feedIndexNext) {
      throw new Error("Response did not contain expected swarm-feed-index-next!")
    }

    return {
      feedIndex,
      feedIndexNext,
    }
  }

  private makeFeedIdentifier(topic: string, index: Index | EpochIndex): Uint8Array {
    if (typeof index === "number") {
      return this.makeSequentialFeedIdentifier(topic, index)
    } else if (typeof index === "string") {
      const indexBytes = this.makeFeedIndexBytes(index)
      return this.hashFeedIdentifier(topic, indexBytes)
    } else if (index instanceof EpochIndex) {
      return FeedChunk.buildIdentifier(etc.hexToBytes(topic), index)
    }

    return this.hashFeedIdentifier(topic, index)
  }

  private hashFeedIdentifier(topic: string, index: Uint8Array): Uint8Array {
    return keccak256Hash(etc.hexToBytes(topic), index)
  }

  private makeSequentialFeedIdentifier(topic: string, index: number): Uint8Array {
    const indexBytes = writeUint64BigEndian(index)

    return this.hashFeedIdentifier(topic, indexBytes)
  }

  private makeFeedIndexBytes(s: string): Uint8Array {
    const hex = makeHexString(s)

    return etc.hexToBytes(hex)
  }
}
