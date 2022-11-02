import type EthernaIndexClient from "."
import type { RequestOptions, IndexCurrentUser, IndexUser, IndexVideo, PaginatedResult } from ".."

export default class IndexUsers {
  constructor(private instance: EthernaIndexClient) {}

  /**
   * Get a list of recent users
   * @param page Page offset (default = 0)
   * @param take Count of users to get (default = 25)
   * @param opts Request options
   */
  async fetchUsers(page = 0, take = 25, opts?: RequestOptions) {
    const resp = await this.instance.request.get<PaginatedResult<IndexUser>>("/users/list2", {
      ...this.instance.prepareAxiosConfig(opts),
      params: { page, take },
    })

    if (typeof resp.data !== "object" || !Array.isArray(resp.data.elements)) {
      throw new Error("Cannot fetch user's videos")
    }

    return resp.data
  }

  /**
   * Get a user info
   * @param address User's address
   * @param opts Request options
   */
  async fetchUser(address: string, opts?: RequestOptions) {
    const resp = await this.instance.request.get<IndexUser>(`/users/${address}`, {
      ...this.instance.prepareAxiosConfig(opts),
    })

    if (typeof resp.data !== "object") {
      throw new Error("Cannot fetch user")
    }

    return resp.data
  }

  /**
   * Fetch user's videos
   * @param address User's address
   * @param page Page offset (default = 0)
   * @param take Count of users to get (default = 25)
   * @param opts Request options
   */
  async fetchVideos(address: string, page = 0, take = 25, opts?: RequestOptions) {
    const resp = await this.instance.request.get<PaginatedResult<IndexVideo>>(
      `/users/${address}/videos2`,
      {
        ...this.instance.prepareAxiosConfig(opts),
        params: { page, take },
      }
    )

    if (typeof resp.data !== "object" || !Array.isArray(resp.data.elements)) {
      throw new Error("Cannot fetch user's videos")
    }

    return resp.data
  }

  /**
   * Get the current logged user's info
   * @param opts Request options
   */
  async fetchCurrentUser(opts?: RequestOptions) {
    const resp = await this.instance.request.get<IndexCurrentUser>(`/users/current`, {
      ...this.instance.prepareAxiosConfig(opts),
    })

    if (typeof resp.data !== "object") {
      throw new Error("Cannot fetch user")
    }

    return resp.data
  }
}
