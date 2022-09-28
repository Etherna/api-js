import type BeeClient from "."
import type { RequestOptions } from "../types"

const pinsEndpoint = "/pins"

export default class Pins {
  constructor(private instance: BeeClient) {}

  async pin(reference: string, options?: RequestOptions) {
    await this.instance.request.post(`${pinsEndpoint}/${reference}`, null, {
      headers: options?.headers,
      timeout: options?.timeout,
      signal: options?.signal,
    })
  }

  async unpin(reference: string, options?: RequestOptions) {
    await this.instance.request.delete(`${pinsEndpoint}/${reference}`, {
      headers: options?.headers,
      timeout: options?.timeout,
      signal: options?.signal,
    })
  }

  /**
   * Check if pinning is enabled on the current host
   *
   * @returns True if pinning is enabled
   */
  async pinEnabled() {
    try {
      const controller = new AbortController()
      await this.instance.request.get(pinsEndpoint, {
        signal: controller.signal,
        onDownloadProgress: p => {
          controller.abort()
        },
      })
      return true
    } catch {
      return false
    }
  }
}
