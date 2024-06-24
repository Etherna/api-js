import type { BeeClient } from "."
import type { RequestOptions } from ".."

const chainstateEndpoint = "/chainstate"

export class ChainState {
  constructor(private instance: BeeClient) {}

  async getCurrentPrice(options?: RequestOptions): Promise<number> {
    const token = this.instance.auth.token

    const resp = await this.instance.request.get(chainstateEndpoint, {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
        ...options?.headers,
      },
      timeout: options?.timeout,
      signal: options?.signal,
    })
    return resp.data.currentPrice ?? 4
  }
}
