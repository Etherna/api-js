import type EthernaIndexClient from "."
import type { RequestOptions } from ".."

export default class IndexComments {
  constructor(private instance: EthernaIndexClient) {}

  /**
   * Delete own comment
   * @param id Id of the comment
   * @param opts Request options
   */
  async deleteComment(id: string, opts?: RequestOptions) {
    await this.instance.request.delete(`/comments/${id}`, {
      ...this.instance.prepareAxiosConfig(opts),
    })

    return true
  }
}
