import type { RequestOptions } from ".."
import type EthernaGatewayClient from "./index"

export default class ResourcesClient {
  constructor(private instance: EthernaGatewayClient) {}

  /**
   * Check if a resource is offered
   *
   * @param reference Hash of the resource
   * @param opts Request options
   * @returns True if has offers
   */
  async fetchIsOffered(reference: string, opts?: RequestOptions) {
    const resp = await this.instance.request.get<boolean>(`/resources/${reference}/isoffered`, {
      ...this.instance.prepareAxiosConfig(opts),
    })

    if (typeof resp.data !== "boolean") {
      throw new Error("Cannot fetch byte price")
    }

    return resp.data
  }

  /**
   * Check if multiple resources are offered
   *
   * @param references Hashes of the resources
   * @param opts Request options
   * @returns Addresses of users that are offering the resource
   */
  async fetchAreOffered(references: string[], opts?: RequestOptions) {
    const resp = await this.instance.request.post<Record<string, boolean>>(
      `/resources/areoffered`,
      references,
      {
        ...this.instance.prepareAxiosConfig(opts),
      }
    )

    if (typeof resp.data !== "object") {
      throw new Error("Cannot fetch byte price")
    }

    return resp.data
  }

  /**
   * Get all resource offers
   *
   * @param reference Hash of the resource
   * @param opts Request options
   * @returns Addresses of users that are offering the resource
   */
  async fetchOffers(reference: string, opts?: RequestOptions) {
    const resp = await this.instance.request.get<string[]>(`/resources/${reference}/offers`, {
      ...this.instance.prepareAxiosConfig(opts),
    })

    if (typeof resp.data !== "object") {
      throw new Error("Cannot fetch byte price")
    }

    return resp.data
  }

  /**
   * Offer a resource
   *
   * @param reference Hash of the resource
   * @param opts Request options
   * @returns True if successfull
   */
  async offer(reference: string, opts?: RequestOptions) {
    await this.instance.request.post(`/resources/${reference}/offers`, undefined, {
      ...this.instance.prepareAxiosConfig(opts),
    })

    return true
  }

  /**
   * Cancel a resource offer
   *
   * @param reference Hash of the resource
   * @param opts Request options
   * @returns True if successfull
   */
  async cancelOffer(reference: string, opts?: RequestOptions) {
    await this.instance.request.delete(`/resources/${reference}/offers`, {
      ...this.instance.prepareAxiosConfig(opts),
    })

    return true
  }
}
