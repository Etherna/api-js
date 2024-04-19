import { extractVideoReferences, isEmptyReference } from "../../utils/references"

import type { Video } from "../.."
import type { BeeClient, EthernaGatewayClient, Reference, RequestOptions } from "../../clients"
import type { SwarmResourcePinStatus } from "./types"

interface EthernaResourcesHandlerOptions {
  client: EthernaGatewayClient | BeeClient
}

interface EthernaPinningFetchOptions {
  withByWhom?: boolean
}

export class EthernaPinningHandler {
  pinStatus?: SwarmResourcePinStatus[]
  references: Reference[]
  private client: EthernaGatewayClient | BeeClient

  constructor(videos: Video[], opts: EthernaResourcesHandlerOptions)
  constructor(references: Reference[], opts: EthernaResourcesHandlerOptions)
  constructor(input: (Video | Reference)[], opts: EthernaResourcesHandlerOptions) {
    this.references = input
      .map(input => (typeof input === "string" ? [input] : extractVideoReferences(input)))
      .flat()
      .filter(
        (reference, index, self) =>
          self.indexOf(reference) === index && !isEmptyReference(reference)
      )
    this.client = opts.client
  }

  isGatewayClient(client: EthernaGatewayClient | BeeClient): client is EthernaGatewayClient {
    return (client as EthernaGatewayClient).resources !== undefined
  }

  async fetchPins(opts?: EthernaPinningFetchOptions) {
    const fetchByWhom = opts?.withByWhom ?? false

    this.pinStatus = []

    const responses = await Promise.allSettled(
      this.references.map(reference =>
        this.isGatewayClient(this.client)
          ? fetchByWhom
            ? this.client.resources.fetchPinUsers(reference)
            : this.client.resources.fetchIsPinned(reference)
          : this.client.pins.isPinned(reference)
      )
    )

    for (const [index, reference] of this.references.entries()) {
      const response = responses[index]!
      const pinStatus: SwarmResourcePinStatus = {
        reference,
        isPinned: false,
      }

      if (response.status === "fulfilled") {
        if (typeof response.value === "boolean") {
          pinStatus.isPinned = response.value
        } else if (Array.isArray(response.value)) {
          pinStatus.pinnedBy = response.value as Reference[]
          pinStatus.isPinned = response.value.length > 0
        } else {
          pinStatus.isPinned = response.value.isPinned
          pinStatus.isPinningInProgress = response.value.isPinningInProgress
          pinStatus.isPinningRequired = response.value.isPinningRequired
          pinStatus.freePinningEndOfLife = response.value.freePinningEndOfLife
        }
      }

      this.pinStatus.push(pinStatus)
    }
  }

  async pinResources(opts?: RequestOptions) {
    await Promise.allSettled(
      this.references.map(reference =>
        this.isGatewayClient(this.client)
          ? this.client.resources.pin(reference, opts)
          : this.client.pins.pin(reference, opts)
      )
    )
  }

  async unpinResources(opts?: RequestOptions) {
    await Promise.allSettled(
      this.references.map(reference =>
        this.isGatewayClient(this.client)
          ? this.client.resources.unpin(reference, opts)
          : this.client.pins.unpin(reference, opts)
      )
    )
  }

  getVideoReferencesStatus(video: Video): SwarmResourcePinStatus[] {
    const videoReferences = extractVideoReferences(video)
    return (this.pinStatus ?? []).filter(status => videoReferences.includes(status.reference))
  }

  getReferenceStatus(reference: string): SwarmResourcePinStatus | null {
    return this.pinStatus?.find(status => status.reference === reference) ?? null
  }

  getVideoPinStatus(video: Video): SwarmResourcePinStatus[] {
    const videoReferences = extractVideoReferences(video)
    return (this.pinStatus ?? []).filter(status => videoReferences.includes(status.reference))
  }
}
