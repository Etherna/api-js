import { BUCKET_DEPTH, STAMPS_DEPTH_MIN } from "@/consts"
import { fromBigEndian, referenceToBytesReference } from "@/utils"

import type { BucketId, Reference } from "@/types/swarm"

export class BucketCalculator {
  bucketCollisions = new Map<BucketId, number>()
  maxBucketCount = 0

  get minDepth(): number {
    return Math.max(Math.ceil(Math.log2(this.maxBucketCount)) + BUCKET_DEPTH, STAMPS_DEPTH_MIN)
  }

  static getBucketId(reference: Reference): BucketId {
    const byteReference = referenceToBytesReference(reference)
    return fromBigEndian(byteReference.slice(0, 4)) >>> (32 - BUCKET_DEPTH)
  }

  add(reference: Reference) {
    const bucketId = BucketCalculator.getBucketId(reference)

    const currentCollisions = this.bucketCollisions.get(bucketId) || 0

    this.bucketCollisions.set(bucketId, currentCollisions + 1)

    if (currentCollisions > this.maxBucketCount) {
      this.maxBucketCount = currentCollisions
    }
  }

  remove(reference: Reference) {
    const bucketId = BucketCalculator.getBucketId(reference)

    if (this.bucketCollisions.has(bucketId)) {
      this.bucketCollisions.set(bucketId, (this.bucketCollisions.get(bucketId) ?? 0) - 1)
    }

    if (this.bucketCollisions.get(bucketId) === 0) {
      this.bucketCollisions.delete(bucketId)
    }

    this.maxBucketCount = 0

    this.bucketCollisions.forEach((value) => {
      if (value > this.maxBucketCount) {
        this.maxBucketCount = value
      }
    })
  }
}
