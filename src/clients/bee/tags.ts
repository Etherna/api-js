import type { BeeClient } from "."
import type { RequestOptions } from "../types"
import type { Tag } from "./types"

const tagsEndpoint = "/tags"

export class Tags {
  constructor(private instance: BeeClient) {}

  async downloadAll(options?: RequestOptions) {
    const resp = await this.instance.request.get<{ tags: Tag[] }>(tagsEndpoint, {
      headers: options?.headers,
      timeout: options?.timeout,
      signal: options?.signal,
    })
    return resp.data
  }

  async download(uid: number, options?: RequestOptions) {
    const resp = await this.instance.request.get<Tag>(`${tagsEndpoint}/${uid}`, {
      headers: options?.headers,
      timeout: options?.timeout,
      signal: options?.signal,
    })
    return resp.data
  }

  async create(address: string, options?: RequestOptions) {
    const resp = await this.instance.request.post<Tag>(
      tagsEndpoint,
      {
        address,
      },
      {
        headers: options?.headers,
        timeout: options?.timeout,
        signal: options?.signal,
      }
    )
    return resp.data
  }

  async delete(uid: number, options?: RequestOptions) {
    await this.instance.request.delete(`${tagsEndpoint}/${uid}`, {
      headers: options?.headers,
      timeout: options?.timeout,
      signal: options?.signal,
    })
  }
}
