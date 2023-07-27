import { describe, expect, it } from "vitest"

import { EpochIndex } from "../../src/classes"

describe("epoch index", () => {
  it.concurrent("should throw when start or level is out of range", () => {
    expect(() => {
      new EpochIndex(EpochIndex.maxStart + 1n, 0)
    }).toThrow()

    expect(() => {
      new EpochIndex(0n, EpochIndex.maxLevel + 1n)
    }).toThrow()
  })

  it.concurrent.each([
    [0n, 0, 0n],
    [2_147_483_648n, 31, 2_147_483_648n],
    [3_456_789_012n, 31, 2_147_483_648n],
    [0n, 32, 0n],
    [2_147_483_648n, 32, 0n],
    [4_294_967_296n, 32, 4_294_967_296n],
    [8_589_934_591n, 32, 4_294_967_296n],
  ])("should normalize start %i at %i", (start, level, expected) => {
    const index = new EpochIndex(start, level)
    expect(index.start).toEqual(expected)
  })

  it.concurrent.each([
    [0n, 0, true],
    [1n, 0, false],
    [2n, 1, false],
    [4n, 1, true],
    [0n, 32, true],
    [4_294_967_296n, 32, false],
  ])("should validate if %i at %i is %s", (start, level, expected) => {
    const index = new EpochIndex(start, level)
    expect(index.isLeft).toEqual(expected)
  })

  it.concurrent.each([
    [0n, 0, 0n, 0],
    [1n, 0, 0n, 0],
    [2n, 1, 0n, 1],
    [4n, 1, 4n, 1],
    [0n, 32, 0n, 32],
    [4_294_967_296n, 32, 0n, 32],
  ])("should validate left index for %i at %i", (start, level, expectedStart, expectedLevel) => {
    const index = new EpochIndex(start, level)
    const leftIndex = index.left
    expect(leftIndex.start).toEqual(expectedStart)
    expect(leftIndex.level).toEqual(expectedLevel)
  })

  it.concurrent.each([
    [0n, 0, 1n, 0],
    [1n, 0, 1n, 0],
    [2n, 1, 2n, 1],
    [4n, 1, 6n, 1],
    [0n, 32, 4_294_967_296n, 32],
    [4_294_967_296n, 32, 4_294_967_296n, 32],
  ])("should validate right index for %i at %i", (start, level, expectedStart, expectedLevel) => {
    const index = new EpochIndex(start, level)
    const rightIndex = index.right
    expect(rightIndex.start).toEqual(expectedStart)
    expect(rightIndex.level).toEqual(expectedLevel)
  })

  it.concurrent.each([
    [0n, 0, 1n],
    [0n, 1, 2n],
    [0n, 32, 4_294_967_296n],
  ])("should have the right length for %i at %i", (start, level, expected) => {
    const index = new EpochIndex(start, level)
    expect(index.length).toEqual(expected)
  })

  it.concurrent.each([
    [
      0n,
      0,
      new Uint8Array([
        173, 49, 94, 32, 157, 214, 37, 22, 171, 140, 125, 28, 45, 140, 60, 32, 101, 37, 80, 30, 190,
        249, 29, 18, 195, 68, 49, 249, 234, 37, 83, 113,
      ]),
    ],
    [
      0n,
      1,
      new Uint8Array([
        251, 40, 138, 229, 98, 70, 144, 153, 126, 77, 233, 207, 177, 166, 218, 44, 127, 113, 59,
        174, 156, 119, 11, 133, 184, 56, 90, 25, 174, 90, 175, 133,
      ]),
    ],
    [
      0n,
      32,
      new Uint8Array([
        42, 40, 146, 107, 120, 198, 38, 173, 183, 162, 73, 162, 62, 151, 105, 191, 3, 139, 82, 68,
        126, 96, 84, 48, 134, 167, 151, 249, 179, 6, 28, 112,
      ]),
    ],
    [
      4_294_967_296n,
      0,
      new Uint8Array([
        10, 81, 169, 21, 123, 21, 96, 75, 132, 136, 101, 165, 120, 209, 156, 5, 176, 74, 30, 5, 191,
        84, 113, 247, 122, 4, 144, 222, 33, 151, 100, 113,
      ]),
    ],
    [
      4_294_967_296n,
      1,
      new Uint8Array([
        3, 48, 42, 58, 75, 159, 28, 60, 34, 143, 230, 13, 57, 78, 229, 146, 36, 135, 120, 28, 76,
        130, 175, 49, 184, 192, 11, 103, 45, 126, 227, 135,
      ]),
    ],
    [
      4_294_967_296n,
      32,
      new Uint8Array([
        138, 221, 60, 55, 69, 133, 200, 248, 94, 216, 56, 133, 121, 93, 5, 7, 253, 249, 194, 232,
        213, 22, 134, 6, 183, 249, 62, 225, 177, 8, 9, 103,
      ]),
    ],
  ])("should infer the correct matshall binary for %i at %i", (start, level, expected) => {
    const index = new EpochIndex(start, level)
    expect(index.marshalBinary).toEqual(expected)
  })

  it.concurrent.each([
    [2n, 1, new Date(1 * 1000)],
    [2n, 1, new Date(4 * 1000)],
  ])("should throw when get child at main level for %i at %i, %i", (start, level, at) => {
    expect(() => {
      const index = new EpochIndex(start, level)
      index.getChildAt(at)
    }).toThrow()
  })

  it.concurrent.each([
    [2n, 1, new Date(2 * 1000), 2n, 0],
    [2n, 1, new Date(3 * 1000), 3n, 0],
    [0n, 32, new Date(2000000000 * 1000), 0n, 31],
    [0n, 32, new Date(3000000000 * 1000), 2_147_483_648n, 31],
    [4_294_967_296n, 32, new Date(6000000000 * 1000), 4_294_967_296n, 31],
    [4_294_967_296n, 32, new Date(7000000000 * 1000), 6_442_450_944n, 31],
  ])(
    "should get child at main level for %i at %i, %i",
    (start, level, at, expectedStart, expectedLevel) => {
      const index = new EpochIndex(start, level)
      const childIndex = index.getChildAt(at)
      expect(childIndex.start).toEqual(expectedStart)
      expect(childIndex.level).toEqual(expectedLevel)
    }
  )

  it.concurrent("should throw when next index is not higher than start", () => {
    expect(() => {
      const index = new EpochIndex(2n, 1)
      index.getNext(new Date(1 * 1000))
    }).toThrow()
  })

  it.concurrent.each([
    [2n, 1, new Date(2 * 1000), 2n, 0],
    [2n, 1, new Date(3 * 1000), 3n, 0],
    [2n, 1, new Date(4 * 1000), 4n, 2],
  ])("should get next index for %i at %i, %i", (start, level, at, expectedStart, expectedLevel) => {
    const index = new EpochIndex(start, level)
    const nextIndex = index.getNext(at)
    expect(nextIndex.start).toEqual(expectedStart)
    expect(nextIndex.level).toEqual(expectedLevel)
  })

  it.concurrent("should throw when parent is higher than max level", () => {
    expect(() => {
      const index = new EpochIndex(0n, 32)
      index.getParent()
    }).toThrow()
  })

  it.concurrent.each([
    [2n, 1, 0n, 2],
    [4n, 1, 4n, 2],
  ])("should get parent index for %i at %i", (start, level, expectedStart, expectedLevel) => {
    const index = new EpochIndex(start, level)
    const parentIndex = index.getParent()
    expect(parentIndex.start).toEqual(expectedStart)
    expect(parentIndex.level).toEqual(expectedLevel)
  })

  it.concurrent.each([
    [0n, 8_589_934_591n],
    [4_294_967_295n, 4_294_967_296n],
  ])("should throw lowest common anchestor is out of range for (%i, %i)", (t0, t1) => {
    expect(() => {
      EpochIndex.lowestCommonAncestor(t0, t1)
    }).toThrow()
  })

  it.concurrent.each([
    [0n, 0n, 0n, 0],
    [0n, 1n, 0n, 1],
    [0n, 2n, 0n, 2],
    [1n, 2n, 0n, 2],
    [1n, 3n, 0n, 2],
    [5n, 6n, 4n, 2],
  ])("should get common anchestor index for (%i, %i)", (t0, t1, expectedStart, expectedLevel) => {
    const commonIndex = EpochIndex.lowestCommonAncestor(t0, t1)
    expect(commonIndex.start).toEqual(expectedStart)
    expect(commonIndex.level).toEqual(expectedLevel)
  })
})
