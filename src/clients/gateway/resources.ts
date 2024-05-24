import type { RequestOptions } from ".."
import type { EthernaGatewayClient } from "./index"
import type { GatewayPin } from "./types"

export class ResourcesClient {
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

  /**
   * Get a resource pinning status
   *
   * @param reference Hash of the resource
   * @param opts Request options
   * @returns Pin status object
   */
  async fetchIsPinned(reference: string, opts?: RequestOptions) {
    const resp = await this.instance.request.get<GatewayPin>(`/resources/${reference}/pin`, {
      ...this.instance.prepareAxiosConfig(opts),
    })

    if (typeof resp.data !== "object") {
      throw new Error("Cannot fetch pin status")
    }

    return resp.data
  }

  /**
   * Fetch the users pinning a resource
   *
   * @param reference Hash of the resource
   * @param opts Request options
   * @returns List of addresses
   */
  async fetchPinUsers(reference: string, opts?: RequestOptions) {
    const resp = await this.instance.request.get<string[]>(`/resources/${reference}/pin/users`, {
      ...this.instance.prepareAxiosConfig(opts),
    })

    if (!Array.isArray(resp.data)) {
      throw new Error("Cannot fetch pin users")
    }

    return resp.data
  }

  /**
   * Pin a resource
   *
   * @param reference Hash of the resource
   * @param opts Request options
   * @returns True if successfull
   */
  async pin(reference: string, opts?: RequestOptions) {
    await this.instance.request.post(`/resources/${reference}/pin`, undefined, {
      ...this.instance.prepareAxiosConfig(opts),
    })

    return true
  }

  /**
   * Unpin resource offer
   *
   * @param reference Hash of the resource
   * @param opts Request options
   * @returns True if successfull
   */
  async unpin(reference: string, opts?: RequestOptions) {
    await this.instance.request.delete(`/resources/${reference}/pins`, {
      ...this.instance.prepareAxiosConfig(opts),
    })

    return true
  }
}
