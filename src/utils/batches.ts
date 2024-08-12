import type { PostageBatch } from "@/types/swarm"

/**
 * Get postage batch space utilization (in bytes)
 *
 * @param batch Batch data
 * @returns An object with total, used and available space
 */
export const getBatchSpace = (batch: PostageBatch) => {
  const { utilization, depth, bucketDepth } = batch

  const usage = utilization / 2 ** (depth - bucketDepth)
  const total = 2 ** depth * 4096
  const used = total * usage
  const available = total - used

  return {
    total,
    used,
    available,
  }
}

/**
 * Get batch capacity
 *
 * @param batchOrDepth Batch data or depth
 * @returns Batch total capcity in bytes
 */
export const getBatchCapacity = (batchOrDepth: PostageBatch | number) => {
  const depth = typeof batchOrDepth === "number" ? batchOrDepth : batchOrDepth.depth
  return 2 ** depth * 4096
}

/**
 * Get batch utilization in percentage (0-1)
 *
 * @param batch Batch data
 * @returns Batch percent usage
 */
export const getBatchPercentUtilization = (
  batch: Pick<PostageBatch, "utilization" | "depth" | "bucketDepth">,
) => {
  const { utilization, depth, bucketDepth } = batch
  return utilization / 2 ** (depth - bucketDepth)
}

/**
 * Get the batch expiration day
 *
 * @param batch Batch data
 * @returns Expiration dayjs object
 */
export const getBatchExpiration = (batch: PostageBatch): "unlimited" | Date => {
  if (batch.batchTTL === -1) {
    return "unlimited"
  }
  const date = new Date()
  date.setSeconds(date.getSeconds() + batch.batchTTL)
  return date
}

/**
 * Convert TTL to batch amount
 *
 * @param ttl TTL in seconds
 * @param price Token price
 * @param blockTime Chain blocktime
 * @returns Batch amount
 */
export const ttlToAmount = (ttl: number, price: number, blockTime: number): bigint => {
  return (BigInt(ttl) * BigInt(price)) / BigInt(blockTime)
}

/**
 * Calc batch price from depth & amount
 *
 * @param depth Batch depth
 * @param amount Batch amount
 * @returns Price in BZZ
 */
export const calcBatchPrice = (depth: number, amount: bigint | string): string => {
  const hasInvalidInput = BigInt(amount) <= BigInt(0) || isNaN(depth) || depth < 17 || depth > 255

  if (hasInvalidInput) {
    return "-"
  }

  const tokenDecimals = 16
  const price = BigInt(amount) * BigInt(2 ** depth)

  const readablePrice = +price.toString() / 10 ** tokenDecimals

  return `${readablePrice} BZZ`
}

/**
 * Calculate the batch TTL after a dilute
 *
 * @param currentTTL Current batch TTL
 * @param currentDepth Current batch depth
 * @param newDepth New batch depth
 * @returns The projected batch TTL
 */
export const calcDilutedTTL = (
  currentTTL: number,
  currentDepth: number,
  newDepth: number,
): number => {
  return Math.ceil(currentTTL / 2 ** (newDepth - currentDepth))
}
