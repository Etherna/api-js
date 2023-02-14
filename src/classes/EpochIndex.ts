import { keccak256Hash, toBigEndianFromUint32 } from "../handlers/mantaray/utils"

export default class EpochIndex {
  static maxLevel = 32 // valid from 01/01/1970 to 16/03/2242

  /** Epoch start in seconds */
  start: number
  /** Epoch level (32 to 0) */
  level: number

  constructor(start: number, level: number) {
    if (start >= 1 << (EpochIndex.maxLevel + 1)) {
      throw new Error("'start' is too big")
    }
    if (level > EpochIndex.maxLevel) {
      throw new Error("'level' is too big")
    }

    //normalize start clearing less relevent bits
    start = (start >> level) << level

    this.level = level
    this.start = start
  }

  // props
  public get isLeft(): boolean {
    return (this.start & this.length) === 0
  }
  public get length(): number {
    return 1 << this.level
  }
  public get marshalBinary(): Uint8Array {
    const epochBytes = toBigEndianFromUint32(this.start)
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
  public getChildAt(at: number): EpochIndex {
    if (this.level === 0) throw new Error("'level' must be greater than 0")
    if (at < this.start || at >= this.start + this.length) throw new Error("'at' is out of range")

    var childStart = this.start
    var childLength = this.length >> 1

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
    var parentStart = (this.start >> parentLevel) << parentLevel
    return new EpochIndex(parentStart, parentLevel)
  }

  // static methods

  /**
   * Calculates the lowest common ancestor epoch given two unix times
   * @param t0
   * @param t1
   * @returns  Lowest common ancestor epoch index
   */
  public static lowestCommonAncestor(t0: number, t1: number): EpochIndex {
    let level = 0
    while (t0 >> level != t1 >> level) {
      level++
      if (level > EpochIndex.maxLevel) throw new Error("Epochs are too far apart")
    }
    const start = (t1 >> level) << level
    return new EpochIndex(start, level)
  }

  public toString(): string {
    return `${this.start}/${this.level}`
  }
}
