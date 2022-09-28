import type { Video } from "../.."
import type { EthernaGatewayClient } from "../../clients"
import { extractReference } from "../../utils"
import type { SwarmResourceStatus } from "./types"

interface EthernaResourcesHandlerOptions {
  gatewayClient: EthernaGatewayClient
}

export default class EthernaResourcesHandler {
  resourcesStatus?: SwarmResourceStatus[]
  video: Video
  private gatewayClient: EthernaGatewayClient

  constructor(video: Video, opts: EthernaResourcesHandlerOptions) {
    this.video = video
    this.gatewayClient = opts.gatewayClient
  }

  async fetchOffers() {
    const references = EthernaResourcesHandler.videoReferences(this.video)
    const responses = await Promise.allSettled(
      references.map(reference => this.gatewayClient.resources.fetchOffers(reference))
    )

    this.resourcesStatus = []

    for (const [index, reference] of references.entries()) {
      const response = responses[index]!
      this.resourcesStatus.push({
        reference,
        isOffered: response.status === "fulfilled" && response.value.length > 0,
        offeredBy: response.status === "fulfilled" ? response.value : [],
      })
    }
  }

  async offerResources() {
    const references = EthernaResourcesHandler.videoReferences(this.video)
    await Promise.allSettled(
      references.map(reference => this.gatewayClient.resources.offer(reference))
    )
  }

  async unofferResources() {
    const references = EthernaResourcesHandler.videoReferences(this.video)
    await Promise.allSettled(
      references.map(reference => this.gatewayClient.resources.cancelOffer(reference))
    )
  }

  getReferenceStatus(reference: string): SwarmResourceStatus | null {
    return this.resourcesStatus?.find(status => status.reference === reference) ?? null
  }

  static videoReferences(video: Video) {
    const thumbnailSources = Object.values(video.thumbnail?.sources ?? {}) as string[]
    return [
      video.reference,
      ...video.sources.map(source => source.reference),
      ...thumbnailSources.map(src => extractReference(src)),
    ]
  }

  static videoReferenceType(
    video: Video,
    reference: string
  ): "metadata" | "video" | "thumb" | null {
    // is metadata?
    if (reference === video.reference) return "metadata"
    // is video source?
    const videoSource = video.sources.find(source => source.reference === reference)
    if (videoSource) return "video"
    // is thumb image source?
    const thumbSource = Object.entries(video.thumbnail?.sources ?? {}).find(
      ([_, thumbReference]) => thumbReference === reference
    )
    if (thumbSource) return "thumb"
    // not found!
    return null
  }

  static videoReferenceLabel(video: Video, reference: string) {
    const type = EthernaResourcesHandler.videoReferenceType(video, reference)
    switch (type) {
      case "metadata":
        return "Video metadata"
      case "video":
        return `Source ${video.sources.find(source => source.reference === reference)!.quality}`
      case "thumb":
        return `Thumbnail ${
          Object.entries(video.thumbnail?.sources ?? {}).find(
            ([_, thumbReference]) => thumbReference === reference
          )![0]
        }`
      default:
        return reference.slice(0, 8)
    }
  }
}
