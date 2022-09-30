import type { Video } from "../.."
import type { EthernaGatewayClient } from "../../clients"
import { extractReference } from "../../utils"
import type { SwarmResourceStatus } from "./types"

interface EthernaResourcesHandlerOptions {
  gatewayClient: EthernaGatewayClient
}

interface EthernaResourcesFetchOptions {
  withByWhom?: boolean
}

export default class EthernaResourcesHandler {
  resourcesStatus?: SwarmResourceStatus[]
  videos: Video[]
  private gatewayClient: EthernaGatewayClient

  constructor(videos: Video[], opts: EthernaResourcesHandlerOptions) {
    this.videos = videos
    this.gatewayClient = opts.gatewayClient
  }

  async fetchOffers(opts?: EthernaResourcesFetchOptions) {
    const fetchByWhom = opts?.withByWhom ?? true

    const references = this.videos
      .map(video => EthernaResourcesHandler.videoReferences(video))
      .flat()
      .filter((reference, index, self) => self.indexOf(reference) === index)

    this.resourcesStatus = []

    if (fetchByWhom) {
      const responses = await Promise.allSettled(
        references.map(reference => this.gatewayClient.resources.fetchOffers(reference))
      )

      for (const [index, reference] of references.entries()) {
        const response = responses[index]!
        this.resourcesStatus.push({
          reference,
          isOffered: response.status === "fulfilled" && response.value.length > 0,
          offeredBy: response.status === "fulfilled" ? response.value : [],
        })
      }
    } else {
      const results = await this.gatewayClient.resources.fetchAreOffered(references)

      for (const [reference, isOffered] of Object.entries(results)) {
        this.resourcesStatus.push({
          reference,
          isOffered,
          offeredBy: [],
        })
      }
    }
  }

  async offerResources() {
    const references = this.videos
      .map(video => EthernaResourcesHandler.videoReferences(video))
      .flat()
    await Promise.allSettled(
      references.map(reference => this.gatewayClient.resources.offer(reference))
    )
  }

  async unofferResources() {
    const references = this.videos
      .map(video => EthernaResourcesHandler.videoReferences(video))
      .flat()
    await Promise.allSettled(
      references.map(reference => this.gatewayClient.resources.cancelOffer(reference))
    )
  }

  getReferenceStatus(reference: string): SwarmResourceStatus | null {
    return this.resourcesStatus?.find(status => status.reference === reference) ?? null
  }

  getVideoReferencesStatus(video: Video): SwarmResourceStatus[] {
    const videoReferences = EthernaResourcesHandler.videoReferences(video)
    return (this.resourcesStatus ?? []).filter(status => videoReferences.includes(status.reference))
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
