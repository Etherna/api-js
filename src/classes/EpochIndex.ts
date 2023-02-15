import { keccak256Hash, toBigEndianFromBigInt64 } from "../handlers/mantaray/utils"

export default class EpochIndex {
  static maxLevel = 32 // valid from 01/01/1970 to 16/03/2242
  static maxStart = 2 ** (this.maxLevel + 1) - 1 // 16/03/2242

  /** Epoch start in seconds */
  start: bigint
  /** Epoch level (32 to 0) */
  level: number

  constructor(start: number | bigint, level: number) {
    if (BigInt(start) >= BigInt(1) << BigInt(EpochIndex.maxLevel + 1)) {
      throw new Error("'start' is too big")
    }
    if (level > EpochIndex.maxLevel) {
      throw new Error("'level' is too big")
    }

    this.level = level
    //normalize start clearing less relevent bits
    this.start = (BigInt(start) >> BigInt(level)) << BigInt(level)
  }

  // props
  public get isLeft(): boolean {
    return (BigInt(this.start) & BigInt(this.length)) === BigInt(0)
  }
  public get length(): bigint {
    return BigInt(1) << BigInt(this.level)
  }
  public get marshalBinary(): Uint8Array {
    const epochBytes = toBigEndianFromBigInt64(this.start)
    const newArray = new Uint8Array([...epochBytes, this.level])
    return keccak256Hash(newArray)
  }
  public get left(): EpochIndex {
    return this.isLeft ? this : new EpochIndex(this.start - this.length, this.level)
  }
  public get right(): EpochIndex {
    return !this.isLeft ? this : new EpochIndex(this.start + this.length, this.level)
  }

  // methods
  public getChildAt(at: number | bigint): EpochIndex {
    if (this.level === 0) throw new Error("'level' must be greater than 0")
    if (at < this.start || at >= this.start + this.length) throw new Error("'at' is out of range")

    at = BigInt(at)
    var childStart = this.start
    var childLength = this.length >> 1n

    if ((at & childLength) > 0) childStart |= childLength

    return new EpochIndex(childStart, this.level - 1)
  }

  public getNext(at: number) {
    if (at < this.start) throw new Error("'at' must be greater  or equal than 'start'")

    return this.start + this.length > at
      ? this.getChildAt(at)
      : EpochIndex.lowestCommonAncestor(this.start, at).getChildAt(at)
  }

  public getParent(): EpochIndex {
    if (this.level === EpochIndex.maxLevel) throw new Error("'level' is too big")

    var parentLevel = this.level + 1
    var parentStart = (this.start >> BigInt(parentLevel)) << BigInt(parentLevel)
    return new EpochIndex(parentStart, parentLevel)
  }

  // static methods

  /**
   * Calculates the lowest common ancestor epoch given two unix times
   * @param t0
   * @param t1
   * @returns  Lowest common ancestor epoch index
   */
  public static lowestCommonAncestor(t0: number | bigint, t1: number | bigint): EpochIndex {
    let level = 0
    t0 = BigInt(t0)
    t1 = BigInt(t1)
    while (t0 >> BigInt(level) != t1 >> BigInt(level)) {
      level++
      if (level > EpochIndex.maxLevel) throw new Error("Epochs are too far apart")
    }
    const start = (t1 >> BigInt(level)) << BigInt(level)
    return new EpochIndex(start, level)
  }

  public toString(): string {
    return `${this.start}/${this.level}`
  }
}
