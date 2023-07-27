import { describe, expect, it, vi } from "vitest"

import { EpochFeed, EpochIndex, FeedChunk } from "../../src/classes"
import { BeeClient } from "../../src/clients"
import { toEthAccount } from "../../src/utils/bytes"

import type { EthAddress, Reference } from "../../src/clients"

type EpochFeedTest = {
  description: string
  account: EthAddress
  topic: Uint8Array
  at: Date
  startingChunk: FeedChunk
  expectedResult: FeedChunk
  mockedChunks: {
    [key: Reference]: Uint8Array
  }
}

type EpochFeedOfflineTest = {
  description: string
  at: Date
  knownNearEpoch: EpochIndex | null
  expectedResult: EpochIndex
}

type EpochFeedOnlineTest = {
  description: string
  account: EthAddress
  at: Date
  index: EpochIndex
  topic: Uint8Array
  expectedResult: FeedChunk | null
  mockedChunks: {
    [key: Reference]: Uint8Array
  }
}

describe("epoch feed", () => {
  const bee = new BeeClient("http://localhost:1633")
  const epochFeed = new EpochFeed(bee)
  const accountBytes = new Uint8Array([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  ])
  const account = toEthAccount(accountBytes)
  const topic = new Uint8Array([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
    26, 27, 28, 29, 30, 31,
  ])

  const startingEpochIndex_4_0 = new EpochIndex(4n, 0)
  const startingEpochIndex_4_1 = new EpochIndex(4n, 1)
  const startingEpochIndex_4_1_Parent = startingEpochIndex_4_1.getParent()
  const startingEpochIndex_4_2 = new EpochIndex(4n, 2)
  const startingEpochIndex_5_0 = new EpochIndex(5n, 0)
  const startingEpochIndex_6_1 = new EpochIndex(6n, 1)
  const startingEpochIndex_6_1_Left = startingEpochIndex_6_1.left
  const startingEpochIndex_0_Max = new EpochIndex(0n, EpochIndex.maxLevel)
  const chunkReference_4_0 = FeedChunk.buildReferenceHash(account, topic, startingEpochIndex_4_0)
  const chunkReference_4_1 = FeedChunk.buildReferenceHash(account, topic, startingEpochIndex_4_1)
  const chunkReference_4_1_Parent = FeedChunk.buildReferenceHash(
    account,
    topic,
    startingEpochIndex_4_1_Parent
  )
  const chunkReference_4_2 = FeedChunk.buildReferenceHash(account, topic, startingEpochIndex_4_2)
  const chunkReference_5_0 = FeedChunk.buildReferenceHash(account, topic, startingEpochIndex_5_0)
  const chunkReference_6_1 = FeedChunk.buildReferenceHash(account, topic, startingEpochIndex_6_1)
  const chunkReference_6_1_Left = FeedChunk.buildReferenceHash(
    account,
    topic,
    startingEpochIndex_6_1_Left
  )
  const chunkReference_0_Max = FeedChunk.buildReferenceHash(
    account,
    topic,
    startingEpochIndex_0_Max
  )
  const chunkTimestamp_0_4 = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 4]) //1970-01-01 00:00:04
  const chunkTimestamp_0_5 = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 5]) //1970-01-01 00:00:05
  const chunkTimestamp_0_7 = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 7]) //1970-01-01 00:00:07
  const arbitraryPayload = new Uint8Array([1, 2, 3])
  const chunkPayload_0_4 = new Uint8Array([...chunkTimestamp_0_4, ...arbitraryPayload])
  const chunkPayload_0_5 = new Uint8Array([...chunkTimestamp_0_5, ...arbitraryPayload])
  const chunkPayload_0_7 = new Uint8Array([...chunkTimestamp_0_7, ...arbitraryPayload])

  const beforeDateTests: EpochFeedTest[] = [
    {
      description: "starting chunk epoch index is at max resolution (level 0)",
      account,
      at: new Date(6 * 1000),
      topic,
      startingChunk: new FeedChunk(startingEpochIndex_4_0, chunkPayload_0_5, chunkReference_4_0),
      expectedResult: new FeedChunk(startingEpochIndex_4_0, chunkPayload_0_5, chunkReference_4_0),
      mockedChunks: {},
    },
    {
      description: "chunk with child epoch at date is valid and at max resolution",
      account,
      at: new Date(6 * 1000),
      topic,
      startingChunk: new FeedChunk(startingEpochIndex_4_1, chunkPayload_0_4, chunkReference_4_1),
      expectedResult: new FeedChunk(startingEpochIndex_4_0, chunkPayload_0_4, chunkReference_4_0),
      mockedChunks: {
        [chunkReference_4_0]: chunkPayload_0_4,
      },
    },
    {
      description: "chunk with left brother of child epoch at date is valid and at max resolution",
      account,
      at: new Date(5 * 1000),
      topic,
      startingChunk: new FeedChunk(startingEpochIndex_4_1, chunkPayload_0_4, chunkReference_4_1),
      expectedResult: new FeedChunk(startingEpochIndex_4_0, chunkPayload_0_4, chunkReference_4_0),
      mockedChunks: {
        [chunkReference_4_0]: chunkPayload_0_4,
      },
    },
    {
      description: "chunk on child at date epoch is left and doesn't exist",
      account,
      at: new Date(5 * 1000),
      topic,
      startingChunk: new FeedChunk(startingEpochIndex_4_2, chunkPayload_0_4, chunkReference_4_2),
      expectedResult: new FeedChunk(startingEpochIndex_4_2, chunkPayload_0_4, chunkReference_4_2),
      mockedChunks: {},
    },
    {
      description: "chunk on child at date and its left brother epochs don't exist",
      account,
      at: new Date(6 * 1000),
      topic,
      startingChunk: new FeedChunk(startingEpochIndex_4_2, chunkPayload_0_4, chunkReference_4_2),
      expectedResult: new FeedChunk(startingEpochIndex_4_2, chunkPayload_0_4, chunkReference_4_2),
      mockedChunks: {},
    },
    {
      description:
        "chunk on child at date (right) is successive to date, and chunk on its left brother epoch doesn't exist",
      account,
      at: new Date(6 * 1000),
      topic,
      startingChunk: new FeedChunk(startingEpochIndex_4_2, chunkPayload_0_4, chunkReference_4_2),
      expectedResult: new FeedChunk(startingEpochIndex_4_2, chunkPayload_0_4, chunkReference_4_2),
      mockedChunks: {
        [chunkReference_6_1]: chunkPayload_0_7,
      },
    },
  ]

  const offlineTests: EpochFeedOfflineTest[] = [
    {
      description: "null known near epoch, date on left epoch at max level",
      at: new Date(10 * 1000),
      knownNearEpoch: null,
      expectedResult: new EpochIndex(0n, 32),
    },
    {
      description: "null known near epoch, date on right epoch at max level",
      at: new Date(5_000_000_000 * 1000),
      knownNearEpoch: null,
      expectedResult: new EpochIndex(4_294_967_296n, 32),
    },
    {
      description: "known near epoch prior to date",
      at: new Date(7 * 1000),
      knownNearEpoch: new EpochIndex(5n, 0),
      expectedResult: new EpochIndex(4n, 2),
    },
    {
      description: "known near epoch after date",
      at: new Date(8 * 1000),
      knownNearEpoch: new EpochIndex(14n, 1),
      expectedResult: new EpochIndex(8n, 3),
    },
    {
      description: "known near epoch contains date",
      at: new Date(10 * 1000),
      knownNearEpoch: new EpochIndex(8n, 2),
      expectedResult: new EpochIndex(8n, 2),
    },
  ]

  const onlineTests: EpochFeedOnlineTest[] = [
    {
      description: "chunk exists and is prior to date",
      account,
      topic,
      at: new Date(6 * 1000),
      index: startingEpochIndex_4_2,
      expectedResult: new FeedChunk(startingEpochIndex_4_2, chunkPayload_0_5, chunkReference_4_2),
      mockedChunks: {
        [chunkReference_4_2]: chunkPayload_0_5,
      },
    },
    {
      description: "chunk not exists and index was left at max level",
      account,
      topic,
      at: new Date(6 * 1000),
      index: new EpochIndex(0n, EpochIndex.maxLevel),
      expectedResult: null,
      mockedChunks: {},
    },
    {
      description: "chunk exists but with successive date and index was left at max level",
      account,
      topic,
      at: new Date(6 * 1000),
      index: startingEpochIndex_0_Max,
      expectedResult: null,
      mockedChunks: {
        [chunkReference_0_Max]: chunkPayload_0_7,
      },
    },
    {
      description: "valid chunk is found at left, starting chunk is not found",
      account,
      topic,
      at: new Date(6 * 1000),
      index: startingEpochIndex_6_1,
      expectedResult: new FeedChunk(
        startingEpochIndex_6_1_Left,
        chunkPayload_0_5,
        chunkReference_6_1_Left
      ),
      mockedChunks: {
        [chunkReference_6_1_Left]: chunkPayload_0_5,
      },
    },
    {
      description: "valid chunk is found at left, starting chunk is successive to date",
      account,
      topic,
      at: new Date(6 * 1000),
      index: startingEpochIndex_6_1,
      expectedResult: new FeedChunk(
        startingEpochIndex_6_1_Left,
        chunkPayload_0_5,
        chunkReference_6_1_Left
      ),
      mockedChunks: {
        [chunkReference_6_1]: chunkPayload_0_7,
        [chunkReference_6_1_Left]: chunkPayload_0_5,
      },
    },
    {
      description: "valid chunk is found at parent, starting chunk is not found",
      account,
      topic,
      at: new Date(6 * 1000),
      index: startingEpochIndex_4_1,
      expectedResult: new FeedChunk(
        startingEpochIndex_4_1_Parent,
        chunkPayload_0_5,
        chunkReference_4_1_Parent
      ),
      mockedChunks: {
        [chunkReference_4_1_Parent]: chunkPayload_0_5,
      },
    },
    {
      description: "valid chunk is found at parent, starting chunk is successive to date",
      account,
      topic,
      at: new Date(6 * 1000),
      index: startingEpochIndex_4_1,
      expectedResult: new FeedChunk(
        startingEpochIndex_4_1_Parent,
        chunkPayload_0_5,
        chunkReference_4_1_Parent
      ),
      mockedChunks: {
        [chunkReference_4_1]: chunkPayload_0_7,
        [chunkReference_4_1_Parent]: chunkPayload_0_5,
      },
    },
  ]

  it.concurrent.each(beforeDateTests)(
    "should find last epoch feed before date ($description)",
    async test => {
      vi.spyOn(bee.chunk, "download").mockImplementation(async (hash: string) => {
        if (hash in test.mockedChunks) return test.mockedChunks[hash] as any
        throw new Error("Chunk not found")
      })

      const result = await epochFeed["findLastEpochChunkBeforeDate"](
        test.account,
        test.topic,
        test.at,
        test.startingChunk
      )

      expect(result.index).toEqual(test.expectedResult.index)
      expect(result.payload).toEqual(test.expectedResult.payload)
      expect(result.reference).toEqual(test.expectedResult.reference)
    }
  )

  it.concurrent.each(offlineTests)(
    "should find starting epoch feed offline ($description)",
    async test => {
      const result = epochFeed["findStartingEpochOffline"](test.knownNearEpoch, test.at)

      expect(result).toEqual(test.expectedResult)
    }
  )

  it.concurrent.each(onlineTests)(
    "should try find starting epoch feed online ($description)",
    async test => {
      vi.spyOn(bee.chunk, "download").mockImplementation(async (hash: string) => {
        if (hash in test.mockedChunks) return test.mockedChunks[hash] as any
        throw new Error("Chunk not found")
      })

      const result = await epochFeed["tryFindStartingEpochChunkOnline"](
        test.account,
        test.topic,
        test.at,
        test.index
      )

      expect(result).toEqual(test.expectedResult)
    }
  )

  it.concurrent.each([false, true])("should try find chunk (exists: %s)", async exists => {
    const reference =
      "aeef03dde6685d5a1c9ae5af374cce84b25aab391222801d8c4dc5d108929592" as Reference
    const index = new EpochIndex(2n, 1)

    const payload = new Uint8Array([0, 0, 0, 1, 2, 3, 4, 5, 6, 7])

    vi.spyOn(bee.chunk, "download").mockImplementation(async (hash: string) => {
      if (exists) return payload as any
      throw new Error("Chunk not found")
    })

    const result = await epochFeed.tryGetFeedChunk(reference, index)

    if (exists) {
      expect(result).not.toBeNull()
      expect(result!.index).toEqual(index)
      expect(result!.payload).toEqual(payload)
      expect(result!.reference).toEqual(reference)
    } else {
      expect(result).toBeNull()
    }
  })
})
