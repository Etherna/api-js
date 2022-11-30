import { extractVideoReferences } from "../../utils/references"

import type { Video } from "../.."
import type { BeeClient, EthernaGatewayClient, RequestOptions } from "../../clients"
import type { SwarmResourcePinStatus } from "./types"

interface EthernaResourcesHandlerOptions {
  client: EthernaGatewayClient | BeeClient
}

export default class EthernaPinningHandler {
  pinStatus?: SwarmResourcePinStatus[]
  videos: Video[]
  private client: EthernaGatewayClient | BeeClient

  constructor(videos: Video[], opts: EthernaResourcesHandlerOptions) {
    this.videos = videos
    this.client = opts.client
  }

  isGatewayClient(client: EthernaGatewayClient | BeeClient): client is EthernaGatewayClient {
    return (client as EthernaGatewayClient).resources !== undefined
  }

  async fetchPins() {
    const references = this.videos
      .map(video => extractVideoReferences(video))
      .flat()
      .filter((reference, index, self) => self.indexOf(reference) === index)

    this.pinStatus = []

    const responses = await Promise.allSettled(
      references.map(reference =>
        this.isGatewayClient(this.client)
          ? this.client.resources.fetchIsPinned(reference)
          : this.client.pins.isPinned(reference)
      )
    )

    for (const [index, reference] of references.entries()) {
      const response = responses[index]!
      this.pinStatus.push(
        response.status === "fulfilled"
          ? {
              reference,
              ...(typeof response.value === "boolean"
                ? { isPinned: response.value }
                : response.value),
            }
          : {
              reference,
              isPinned: false,
            }
      )
    }
  }

  async pinResources(opts?: RequestOptions) {
    const references = this.videos.map(video => extractVideoReferences(video)).flat()
    await Promise.allSettled(
      references.map(reference =>
        this.isGatewayClient(this.client)
          ? this.client.resources.pin(reference, opts)
          : this.client.pins.pin(reference, opts)
      )
    )
  }

  async unpinResources(opts?: RequestOptions) {
    const references = this.videos.map(video => extractVideoReferences(video)).flat()
    await Promise.allSettled(
      references.map(reference =>
        this.isGatewayClient(this.client)
          ? this.client.resources.unpin(reference, opts)
          : this.client.pins.unpin(reference, opts)
      )
    )
  }

  getReferenceStatus(reference: string): SwarmResourcePinStatus | null {
    return this.pinStatus?.find(status => status.reference === reference) ?? null
  }

  getVideoPinStatus(video: Video): SwarmResourcePinStatus[] {
    const videoReferences = extractVideoReferences(video)
    return (this.pinStatus ?? []).filter(status => videoReferences.includes(status.reference))
  }
}
