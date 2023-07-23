import { keccak256Hash } from "../handlers/mantaray/utils"
import { buffersEquals } from "../utils/buffer"
import { fromHexString, toHexString } from "../utils/bytes"

import type { Reference } from "../clients"
import type EpochIndex from "./EpochIndex"

// extend UInt8Array / Date / BigInt
declare global {
  interface Uint8Array {
    toUnixTimestamp(): bigint
    toUnixDate(): Date
  }
  interface Date {
    toUnixTimestamp(): bigint
    toBytes(): Uint8Array
  }
  interface BigInt {
    toDate(): Date
  }
}

Uint8Array.prototype.toUnixTimestamp = function () {
  if (this.length !== FeedChunk.TimeStampByteSize) {
    throw new Error("Invalid date time byte array length")
  }

  const fixedDateTimeByteArray = new Uint8Array(this.length)
  fixedDateTimeByteArray.set(this, 0)
  if (new DataView(new ArrayBuffer(1)).getUint8(0) === 0) {
    fixedDateTimeByteArray.reverse()
  }

  const dataView = new DataView(fixedDateTimeByteArray.buffer)

  return dataView.getBigUint64(0, true)
}
Uint8Array.prototype.toUnixDate = function () {
  return new Date(Number(this.toUnixTimestamp() * 1000n))
}
Date.prototype.toBytes = function () {
  const timestamp = BigInt(Math.floor(this.getTime() / 1000))
  const timestampBytes = new Uint8Array(FeedChunk.TimeStampByteSize)
  const dataView = new DataView(timestampBytes.buffer)

  dataView.setBigUint64(0, timestamp, true)

  if (new DataView(new ArrayBuffer(1)).getUint8(0) === 0) {
    timestampBytes.reverse()
  }

  return timestampBytes
}
Date.prototype.toUnixTimestamp = function () {
  return BigInt(Math.floor(this.getTime() / 1000))
}
BigInt.prototype.toDate = function () {
  return new Date(Number(this) * 1000)
}

export default class FeedChunk {
  public static readonly AccountBytesLength = 20
  public static readonly IdentifierBytesLength = 32
  public static readonly IndexBytesLength = 32
  public static readonly MaxPayloadBytesSize = 4096 //4kB
  public static readonly ReferenceHashRegex = /^[A-Fa-f0-9]{64}$/
  public static readonly TimeStampByteSize = 8
  public static readonly TopicBytesLength = 32
  public static readonly MinPayloadByteSize = this.TimeStampByteSize
  public static readonly MaxContentPayloadBytesSize =
    this.MaxPayloadBytesSize - this.TimeStampByteSize //creation timestamp

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

  public getTimestamp() {
    const timestampBytes = this.payload.slice(0, FeedChunk.TimeStampByteSize)
    return timestampBytes.toUnixDate()
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

    /**
     * var chunkPayload = new byte[TimeStampByteSize + contentPayload.Length];
            timestamp ??= (ulong)DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            timestamp.Value.UnixDateTimeToByteArray().CopyTo(chunkPayload, 0);
            contentPayload.CopyTo(chunkPayload, TimeStampByteSize);

            return chunkPayload;
     */

    const date = timestamp?.toDate() ?? new Date()

    const chunkPayload = new Uint8Array(this.TimeStampByteSize + contentPayload.length)
    chunkPayload.set(date.toBytes(), 0)
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
      if (!/^0x[0-9a-f]{40}$/i.test(account)) {
        throw new Error("Value is not a valid ethereum account")
      }

      const accountBytes = fromHexString(account.replace(/^0x/, ""))

      if (accountBytes.length != this.AccountBytesLength) {
        throw new Error("Invalid account length")
      }
      if (topicOrIdentifier.length != this.IdentifierBytesLength) {
        throw new Error("Invalid identifier length")
      }

      const newArray = new Uint8Array(this.IdentifierBytesLength + this.AccountBytesLength)
      newArray.set(topicOrIdentifier, 0)
      newArray.set(accountBytes, this.IdentifierBytesLength)

      return toHexString(keccak256Hash(newArray)) as Reference
    } else {
      return this.buildReferenceHash(account, this.buildIdentifier(topicOrIdentifier, index))
    }
  }
}
