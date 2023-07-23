import { keccak256Hash, toBigEndianFromBigInt64 } from "../handlers/mantaray/utils"

export default class EpochIndex {
  public static readonly maxLevel = 32n // valid from 01/01/1970 to 16/03/2242
  public static readonly minLevel = 0n
  public static readonly maxStart = 2n ** (this.maxLevel + 1n) - 1n // 16/03/2242
  public static readonly maxUnixTimeStamp = (1n << (this.maxLevel + 1n)) - 1n
  public static readonly minUnixTimeStamp = 0n

  /** Epoch start in seconds */
  start: bigint
  /** Epoch level (32 to 0) */
  level: number

  constructor(start: number | bigint, level: number | bigint) {
    if (BigInt(start) >= BigInt(1) << (EpochIndex.maxLevel + 1n)) {
      throw new Error("'start' is too big")
    }
    if (level > EpochIndex.maxLevel) {
      throw new Error("'level' is too big")
    }

    this.level = Number(level)
    //normalize start clearing less relevent bits
    this.start = (BigInt(start) >> BigInt(level)) << BigInt(level)
  }

  // props
  public get isLeft(): boolean {
    return (BigInt(this.start) & BigInt(this.length)) === BigInt(0)
  }
  public get isRight(): boolean {
    return !this.isLeft
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

  public ContainsTime(at: Date | number | bigint) {
    at = BigInt(at instanceof Date ? at.getTime() : at)
    return at >= this.start && at < this.start + this.length
  }

  public getChildAt(at: number | bigint): EpochIndex {
    if (this.level === 0) throw new Error("'level' must be greater than 0")
    if (at < this.start || at >= this.start + this.length) throw new Error("'at' is out of range")

    at = BigInt(at)
    let childStart = this.start
    let childLength = this.length >> 1n

    if ((at & childLength) > 0) childStart |= childLength

    return new EpochIndex(childStart, this.level - 1)
  }

  public getNext(at: number | bigint) {
    if (BigInt(at) < this.start) throw new Error("'at' must be greater  or equal than 'start'")

    return this.start + this.length > at
      ? this.getChildAt(at)
      : EpochIndex.lowestCommonAncestor(this.start, at).getChildAt(at)
  }

  public getParent(): EpochIndex {
    if (BigInt(this.level) === EpochIndex.maxLevel) throw new Error("'level' is too big")

    let parentLevel = this.level + 1
    let parentStart = (this.start >> BigInt(parentLevel)) << BigInt(parentLevel)
    return new EpochIndex(parentStart, parentLevel)
  }

  public isEqual(other: EpochIndex): boolean {
    return this.start === other.start && this.level === other.level
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
      if (BigInt(level) > EpochIndex.maxLevel) throw new Error("Epochs are too far apart")
    }
    const start = (t1 >> BigInt(level)) << BigInt(level)
    return new EpochIndex(start, level)
  }

  public toString(): string {
    return `${this.start}/${this.level}`
  }
}
