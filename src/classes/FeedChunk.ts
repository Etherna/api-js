import { keccak256Hash } from "../handlers/mantaray/utils"
import { buffersEquals } from "../utils/buffer"
import { fromHexString, toHexString } from "../utils/bytes"

import type { Reference } from "../clients"
import type EpochIndex from "./EpochIndex"

export default class FeedChunk {
  public static AccountBytesLength = 20
  public static IdentifierBytesLength = 32
  public static IndexBytesLength = 32
  public static MaxPayloadBytesSize = 4096 //4kB
  public static ReferenceHashRegex = /^[A-Fa-f0-9]{64}$/
  public static TimeStampByteSize = 8
  public static TopicBytesLength = 32
  public static MinPayloadByteSize = this.TimeStampByteSize
  public static MaxContentPayloadBytesSize = this.MaxPayloadBytesSize - this.TimeStampByteSize //creation timestamp

  constructor(
    public index: EpochIndex,
    public payload: Uint8Array,
    public referenceHash: Reference
  ) {
    if (payload.length < FeedChunk.MinPayloadByteSize)
      throw new Error(`Payload can't be shorter than ${FeedChunk.TimeStampByteSize} bytes`)
    if (payload.length > FeedChunk.MaxPayloadBytesSize)
      throw new Error(`Payload can't be longer than ${FeedChunk.MaxPayloadBytesSize} bytes`)

    if (!FeedChunk.ReferenceHashRegex.test(referenceHash)) throw new Error("Not a valid swarm hash")
  }

  // Methods.
  public isEqual(chunk: FeedChunk) {
    return (
      this.referenceHash === chunk.referenceHash &&
      this.index.isEqual(chunk.index) &&
      buffersEquals(this.payload, chunk.payload)
    )
  }

  public getContentPayload() {
    return this.payload.slice(FeedChunk.TimeStampByteSize)
  }

  public getTimeStamp() {
    const timestampBytes = this.payload.slice(0, FeedChunk.TimeStampByteSize)
    const dataView = new DataView(timestampBytes.buffer)
    const timestamp = dataView.getBigUint64(0, true)
    const unixTimeStamp = Number(timestamp) / 1000000 // convert from microseconds to seconds
    return new Date(unixTimeStamp * 1000)
  }

  // Static helpers.
  public static buildChunkPayload(
    contentPayload: Uint8Array,
    timestamp: bigint | null = null
  ): Uint8Array {
    if (contentPayload.length > this.MaxContentPayloadBytesSize)
      throw new Error(
        `Content payload can't be longer than ${this.MaxContentPayloadBytesSize} bytes`
      )

    const chunkPayload = new Uint8Array(this.TimeStampByteSize + contentPayload.length)

    timestamp ??= BigInt(Math.floor(Date.now() / 1000))

    const timestampBytes = new DataView(new ArrayBuffer(this.TimeStampByteSize))
    timestampBytes.setBigUint64(0, BigInt(timestamp), true)

    new Uint8Array(timestampBytes.buffer).copyWithin(0, 0, this.TimeStampByteSize)
    chunkPayload.set(new Uint8Array(timestampBytes.buffer), 0)
    chunkPayload.set(contentPayload, this.TimeStampByteSize)

    return chunkPayload
  }

  public static buildIdentifier(topic: Uint8Array, index: EpochIndex): Uint8Array {
    if (topic.length !== this.TopicBytesLength) throw new Error("Invalid topic length")

    const newArray = new Uint8Array(this.TopicBytesLength + this.IndexBytesLength)
    newArray.set(topic, 0)
    newArray.set(index.marshalBinary, topic.length)

    return keccak256Hash(newArray)
  }

  public static buildReferenceHash(account: string, identifier: Uint8Array): Reference
  public static buildReferenceHash(account: string, topic: Uint8Array, index: EpochIndex): Reference
  public static buildReferenceHash(
    account: string,
    topicOrIdentifier: Uint8Array,
    index?: EpochIndex
  ): Reference {
    if (!index) {
      // check if address is an eth address
      if (!/^0x[0-9a-f]{40}$/i.test(account))
        throw new Error("Value is not a valid ethereum account")

      if (account.length != this.AccountBytesLength) throw new Error("Invalid account length")
      if (topicOrIdentifier.length != this.IdentifierBytesLength)
        throw new Error("Invalid identifier length")

      const newArray = new Uint8Array(this.IdentifierBytesLength + this.AccountBytesLength)
      newArray.set(topicOrIdentifier, 0)
      newArray.set(fromHexString(account.replace(/^0x/, "")), this.IdentifierBytesLength)

      return toHexString(keccak256Hash(newArray)) as Reference
    } else {
      return this.buildReferenceHash(account, this.buildIdentifier(topicOrIdentifier, index))
    }
  }
}
