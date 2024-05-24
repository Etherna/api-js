import type { EthernaIndexClient } from "."
import type { RequestOptions } from ".."

export class IndexModeration {
  constructor(private instance: EthernaIndexClient) {}

  /**
   * Delete any comment
   * @param id Id of the comment
   * @param opts Request options
   */
  async deleteComment(id: string, opts?: RequestOptions) {
    await this.instance.request.delete(`/moderation/comments/${id}`, {
      ...this.instance.prepareAxiosConfig(opts),
    })

    return true
  }

  /**
   * Delete any video
   * @param id Id of the video
   * @param opts Request options
   */
  async deleteVideo(id: string, opts?: RequestOptions) {
    await this.instance.request.delete(`/moderation/videos/${id}`, {
      ...this.instance.prepareAxiosConfig(opts),
    })

    return true
  }
}
