import type { EthernaGatewayClient } from "."
import type { RequestOptions } from ".."

export class PostageClient {
  constructor(private instance: EthernaGatewayClient) {}

  /**
   * Topup batch (increase TTL)
   *
   * @param batchId Id of the swarm batch
   * @param byAmount Amount to add to the batch
   * @param opts Request options
   */
  async topupBatch(batchId: string, byAmount: number | string, opts?: RequestOptions) {
    await this.instance.request.patch(`/postage/batches/${batchId}/topup/${byAmount}`, null, {
      ...this.instance.prepareAxiosConfig(opts),
    })

    return true
  }
}
