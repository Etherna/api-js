import type { Reference } from "../../clients"

export type SwarmResourcePinStatus = {
  reference: Reference
  isPinned: boolean
  freePinningEndOfLife?: string
  isPinningInProgress?: boolean
  isPinningRequired?: boolean
}
