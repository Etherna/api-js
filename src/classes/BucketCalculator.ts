import { Reference } from "../clients"
import { fromBigEndian } from "../handlers/mantaray/utils"
import { BUCKET_DEPTH, referenceToBytesReference, STAMPS_DEPTH_MIN } from "../utils"

export class BucketCalculator {
  bucketCollisions: Record<string, number> = {}
  maxBucketCount = 0

  constructor() {}

  get minDepth(): number {
    return Math.max(Math.ceil(Math.log2(this.maxBucketCount)) + BUCKET_DEPTH, STAMPS_DEPTH_MIN)
  }

  static getBucketId(reference: Reference): number {
    const byteReference = referenceToBytesReference(reference)
    return fromBigEndian(byteReference.slice(0, 4)) >>> (32 - BUCKET_DEPTH)
  }

  add(reference: Reference) {
    const bucketId = BucketCalculator.getBucketId(reference)

    if (!this.bucketCollisions[bucketId]) {
      this.bucketCollisions[bucketId] = 0
    }

    this.bucketCollisions[bucketId]++

    if (this.bucketCollisions[bucketId] > this.maxBucketCount) {
      this.maxBucketCount = this.bucketCollisions[bucketId]
    }
  }

  remove(reference: Reference) {
    const bucketId = BucketCalculator.getBucketId(reference)

    if (this.bucketCollisions[bucketId]) {
      this.bucketCollisions[bucketId]--
    }

    if (this.bucketCollisions[bucketId] === 0) {
      delete this.bucketCollisions[bucketId]
    }

    this.maxBucketCount = 0

    for (const key in this.bucketCollisions) {
      if (this.bucketCollisions[key] > this.maxBucketCount) {
        this.maxBucketCount = this.bucketCollisions[key]
      }
    }
  }
}
