import type { Reference } from "../../clients"

export type SwarmResourceStatus = {
  reference: Reference
  isOffered: boolean
  offeredBy: string[]
}
