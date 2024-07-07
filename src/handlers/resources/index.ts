import { extractVideoReferences } from "../../utils/references"

import type { Video, VideoPreview, VideoSource } from "../.."
import type { EthernaGatewayClient, Reference, RequestOptions } from "../../clients"
import type { SwarmResourceStatus } from "./types"

interface EthernaResourcesHandlerOptions {
  gatewayClient: EthernaGatewayClient
}

interface EthernaResourcesFetchOptions {
  withByWhom?: boolean
}

type AnyVideo = Video | VideoPreview

export class EthernaResourcesHandler {
  resourcesStatus?: SwarmResourceStatus[]
  references: Reference[]
  private gatewayClient: EthernaGatewayClient

  constructor(videos: AnyVideo[], opts: EthernaResourcesHandlerOptions)
  constructor(references: Reference[], opts: EthernaResourcesHandlerOptions)
  constructor(input: (AnyVideo | Reference)[], opts: EthernaResourcesHandlerOptions) {
    this.references = input
      .map((input) => (typeof input === "string" ? [input] : extractVideoReferences(input)))
      .flat()
      .filter((reference, index, self) => self.indexOf(reference) === index)
    this.gatewayClient = opts.gatewayClient
  }

  async fetchOffers(opts?: EthernaResourcesFetchOptions) {
    const fetchByWhom = opts?.withByWhom ?? true

    this.resourcesStatus = []

    if (fetchByWhom) {
      const responses = await Promise.allSettled(
        this.references.map((reference) => this.gatewayClient.resources.fetchOffers(reference)),
      )

      for (const [index, reference] of this.references.entries()) {
        const response = responses[index]!
        this.resourcesStatus.push({
          reference,
          isOffered: response.status === "fulfilled" && response.value.length > 0,
          offeredBy: response.status === "fulfilled" ? response.value : [],
        })
      }
    } else {
      const results = await this.gatewayClient.resources.fetchAreOffered(this.references)

      for (const [reference, isOffered] of Object.entries(results)) {
        this.resourcesStatus.push({
          reference: reference as Reference,
          isOffered,
          offeredBy: [],
        })
      }
    }
  }

  async offerResources(opts?: RequestOptions) {
    await Promise.allSettled(
      this.references.map((reference) => this.gatewayClient.resources.offer(reference, opts)),
    )
  }

  async unofferResources(opts?: RequestOptions) {
    await Promise.allSettled(
      this.references.map((reference) => this.gatewayClient.resources.cancelOffer(reference, opts)),
    )
  }

  getReferenceStatus(reference: string): SwarmResourceStatus | null {
    return this.resourcesStatus?.find((status) => status.reference === reference) ?? null
  }

  getVideoReferencesStatus(video: Video): SwarmResourceStatus[] {
    const videoReferences = extractVideoReferences(video)
    return (this.resourcesStatus ?? []).filter((status) =>
      videoReferences.includes(status.reference),
    )
  }

  static videoReferenceType(
    video: Video,
    reference: string,
  ): "all" | "metadata" | "video" | "thumb" | null {
    // is folder metadata?
    if (reference === video.reference && +video.preview.v >= 2) return "all"
    // is metadata?
    if (reference === video.reference) return "metadata"
    // is video source?
    const videoSource = video.details?.sources.find(
      (source) => source.type === "mp4" && source.reference === reference,
    )
    if (videoSource) return "video"
    // is thumb image source?
    const thumbSource = (video.preview.thumbnail?.sources ?? []).find(
      (source) => source.reference === reference,
    )
    if (thumbSource) return "thumb"
    // not found!
    return null
  }

  static videoReferenceLabel(video: Video, reference: string) {
    const type = EthernaResourcesHandler.videoReferenceType(video, reference)
    switch (type) {
      case "all":
        return "Video"
      case "metadata":
        return "Video metadata"
      case "video":
        return `Source ${
          (
            video.details?.sources.find(
              (source) => source.type === "mp4" && source.reference === reference,
            ) as VideoSource & { type: "mp4" }
          ).quality
        }`
      case "thumb":
        return `Thumbnail ${
          (video.preview.thumbnail?.sources ?? []).find((source) => source.reference === reference)!
            .width
        }w`
      default:
        return reference.slice(0, 8)
    }
  }
}
