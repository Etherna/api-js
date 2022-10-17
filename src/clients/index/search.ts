import type EthernaIndexClient from "."
import type { RequestOptions } from ".."
import type { IndexVideo } from ".."

export default class IndexSearch {
  constructor(private instance: EthernaIndexClient) {}

  /**
   * Search videos
   * @param query Search query
   * @param page Page offset (default = 0)
   * @param take Count of users to get (default = 25)
   * @param opts Request options
   */
  async fetchVideos(query: string, page = 0, take = 25, opts?: RequestOptions) {
    const resp = await this.instance.request.get<IndexVideo[]>("/search/query", {
      params: { query, page, take },
      headers: opts?.headers,
      signal: opts?.signal,
      timeout: opts?.timeout,
    })

    if (!Array.isArray(resp.data)) {
      throw new Error("Cannot fetch videos")
    }

    return resp.data
  }

  /**
   * Re-index a video
   * @param opts Request options
   */
  async reindexVideo(opts?: RequestOptions) {
    const resp = await this.instance.request.post<IndexVideo>("/search/videos/reindex", null, {
      headers: opts?.headers,
      signal: opts?.signal,
      timeout: opts?.timeout,
    })

    if (!Array.isArray(resp.data)) {
      throw new Error("Cannot fetch videos")
    }

    return resp.data
  }
}
