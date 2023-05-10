import type { BatchId, PostageBatch } from ".."

export type GatewayCurrentUser = {
  etherAddress: string
  etherPreviousAddresses: string[]
  username: string
}

export type GatewayCredit = {
  isUnlimited: boolean
  balance: number
}

export type GatewayBatchPreview = {
  batchId: string
  ownerNodeId: string
}

export type GatewayBatch = Omit<PostageBatch, "batchID"> & {
  id: BatchId
  amountPaid: number
  normalisedBalance: number
}

export type GatewayChainState = {
  block: number
  currentPrice: number
  sourceNodeId: string
  timeStamp: string
  totalAmount: number
}

export type GatewayPin = {
  freePinningEndOfLife: string
  isPinned: boolean
  isPinningInProgress: boolean
  isPinningRequired: boolean
}

export type GatewayWelcomeStatus = {
  isFreePostageBatchConsumed: boolean
}
