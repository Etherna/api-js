import { etc } from "@noble/secp256k1"

import { EpochFeed, EpochFeedChunk, EpochIndex } from "../../classes"
import { MantarayNode } from "../../handlers"
import {
  bytesReferenceToReference,
  encodePath,
  getReferenceFromData,
  keccak256Hash,
  referenceToBytesReference,
  ZeroHashReference,
} from "../../utils"
import { toEthAccount } from "../../utils/bytes"
import {
  EntryMetadataFeedOwnerKey,
  EntryMetadataFeedTopicKey,
  EntryMetadataFeedTypeKey,
} from "../../utils/mantaray"
import { makeBytes, serializeBytes } from "./utils/bytes"
import { extractUploadHeaders } from "./utils/headers"
import { makeHexString } from "./utils/hex"
import { makeBytesReference } from "./utils/reference"
import { writeUint64BigEndian } from "./utils/uint64"

import type { BeeClient } from "."
import type { RequestOptions } from "../types"
import type {
  EthAddress,
  FeedInfo,
  FeedType,
  FeedUpdateHeaders,
  FeedUpdateOptions,
  FeedUploadOptions,
  Index,
  Reference,
  ReferenceResponse,
  RequestUploadOptions,
} from "./types"
import type { AxiosError, AxiosResponseHeaders, RawAxiosResponseHeaders } from "axios"

const feedEndpoint = "/feeds"

export class Feed {
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

          const reference = etc.bytesToHex(chunk.getContentPayload()) as Reference

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

        const identifier = EpochFeedChunk.buildIdentifier(etc.hexToBytes(feed.topic), chunk.index)
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
    if (feed.type === "epoch") {
      // epoch not yet supported in bee
      const epochRoot = await this.makeRootManifest(feed)
      await epochRoot.save(options)

      return epochRoot.reference
    }

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

  async makeRootManifest<T extends FeedType>(feed: FeedInfo<T>) {
    const node = new MantarayNode()
    node.addFork(encodePath("/"), ZeroHashReference, {
      [EntryMetadataFeedOwnerKey]: feed.owner.toLowerCase(),
      [EntryMetadataFeedTopicKey]: feed.topic,
      [EntryMetadataFeedTypeKey]: feed.type.replace(/^./, c => c.toUpperCase()),
    })
    node.getForkAtPath(encodePath("/")).node["makeValue"]()
    node.getForkAtPath(encodePath("/")).node.entry = ZeroHashReference

    const reference = await node.save(async data => {
      return referenceToBytesReference(getReferenceFromData(data))
    })

    return {
      reference: bytesReferenceToReference(reference),
      save: async (options: RequestUploadOptions) => {
        node.makeDirty()
        await node.save(async data => {
          const { reference } = await this.instance.bytes.upload(data, options)
          return referenceToBytesReference(reference)
        })
      },
    }
  }

  async parseFeedFromRootManifest(reference: Reference, opts?: RequestOptions) {
    const node = new MantarayNode()
    await node.load(async reference => {
      try {
        const data = await this.instance.bytes.download(bytesReferenceToReference(reference), {
          signal: opts?.signal,
          timeout: opts?.timeout,
          headers: opts?.headers,
        })
        return data
      } catch (error) {
        const node = new MantarayNode()
        node.entry = ZeroHashReference
        return node.serialize()
      }
    }, referenceToBytesReference(reference))

    if (opts?.signal?.aborted) {
      throw new Error("Aborted by user")
    }

    const fork = node.getForkAtPath(encodePath("/"))
    const owner = fork.node.metadata?.[EntryMetadataFeedOwnerKey]
    const topic = fork.node.metadata?.[EntryMetadataFeedTopicKey]
    const type = fork.node.metadata?.[EntryMetadataFeedTypeKey].replace(/^./, c => c.toLowerCase())

    if (!owner || owner.length !== 40) {
      throw new Error(`Invalid feed owner: '${owner}'`)
    }
    if (!topic || topic.length !== 64) {
      throw new Error(`Invalid feed topic: '${topic}'`)
    }
    if (!type || !["epoch", "sequence"].includes(type)) {
      throw new Error(`Invalid feed type: '${type}'`)
    }

    return {
      owner: owner,
      topic,
      type: type as FeedType,
    } as FeedInfo<any>
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
      return EpochFeedChunk.buildIdentifier(etc.hexToBytes(topic), index)
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
