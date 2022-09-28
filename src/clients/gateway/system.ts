import type EthernaGatewayClient from "."
import type { BatchId, RequestOptions } from ".."
import type { GatewayChainState } from "./types"

export default class SystemClient {
  constructor(private instance: EthernaGatewayClient) {}

  /**
   * Get the current byte price
   *
   * @param opts Request options
   * @returns Dollar price per single byte
   */
  async fetchCurrentBytePrice(opts?: RequestOptions) {
    const resp = await this.instance.request.get<number>(`/system/byteprice`, {
      withCredentials: true,
      headers: opts?.headers,
      signal: opts?.signal,
      timeout: opts?.timeout,
    })

    if (typeof resp.data !== "number") {
      throw new Error("Cannot fetch byte price")
    }

    return resp.data
  }

  /**
   * Get the current chain state
   *
   * @param opts Request options
   * @returns chain state object
   */
  async fetchChainstate(opts?: RequestOptions) {
    const resp = await this.instance.request.get<GatewayChainState>(`/system/chainstate`, {
      withCredentials: true,
      headers: opts?.headers,
      signal: opts?.signal,
      timeout: opts?.timeout,
    })

    if (typeof resp.data !== "object") {
      throw new Error("Cannot fetch chainstate")
    }

    return resp.data
  }

  /**
   * Fetch creation batch id
   *
   * @param referenceId Reference id of the batch
   * @param opts Request options
   * @returns The created batch id if completed
   */
  async fetchPostageBatchRef(referenceId: string, opts?: RequestOptions) {
    const resp = await this.instance.request.get<BatchId>(
      `/system/postagebatchref/${referenceId}`,
      {
        withCredentials: true,
        headers: opts?.headers,
        signal: opts?.signal,
        timeout: opts?.timeout,
      }
    )

    const batchId = resp.data

    return batchId
  }
}
