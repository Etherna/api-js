import type EthernaIndexClient from "."
import type { RequestOptions } from ".."
import type {
  IndexVideo,
  IndexVideoComment,
  IndexVideoManifest,
  IndexVideoValidation,
  VoteValue,
} from ".."

export default class IndexVideos {
  abortController?: AbortController

  constructor(private instance: EthernaIndexClient) {}

  /**
   * Create a new video on the index
   *
   * @param hash Hash of the manifest/feed with the video metadata
   * @param encryptionKey Encryption key
   * @param opts Request options
   * @returns Video id
   */
  async createVideo(hash: string, encryptionKey?: string, opts?: RequestOptions) {
    const resp = await this.instance.request.post<string>(
      `/videos`,
      {
        manifestHash: hash,
        encryptionKey,
        encryptionType: encryptionKey ? "AES256" : "Plain",
      },
      {
        withCredentials: true,
        headers: opts?.headers,
        signal: opts?.signal,
        timeout: opts?.timeout,
      }
    )

    if (typeof resp.data !== "string") {
      throw new Error("Cannot create the video")
    }

    return resp.data
  }

  /**
   * Get video information by id
   *
   * @param id Video id on Index
   * @param opts Request options
   * @returns The video object
   */
  async fetchVideoFromId(id: string, opts?: RequestOptions) {
    const resp = await this.instance.request.get<IndexVideo>(`/videos/${id}`, {
      headers: opts?.headers,
      signal: opts?.signal,
      timeout: opts?.timeout,
    })

    if (typeof resp.data !== "object") {
      throw new Error("Cannot fetch the video")
    }

    return resp.data
  }

  /**
   * Get video information
   *
   * @param hash Video hash on Swarm
   * @param opts Request options
   * @returns Video information
   */
  async fetchVideoFromHash(hash: string, opts?: RequestOptions) {
    const resp = await this.instance.request.get<IndexVideo>(`/videos/manifest/${hash}`, {
      headers: opts?.headers,
      signal: opts?.signal,
      timeout: opts?.timeout,
    })

    if (typeof resp.data !== "object") {
      throw new Error("Cannot fetch the video")
    }

    return resp.data
  }

  /**
   * Get a list of recent videos uploaded on the platform
   *
   * @param page Page offset (default = 0)
   * @param take Number of videos to fetch (default = 25)
   * @param opts Request options
   * @returns The list of videos
   */
  async fetchLatestVideos(page = 0, take = 25, opts?: RequestOptions) {
    const resp = await this.instance.request.get<IndexVideo[]>(`/videos/latest`, {
      params: { page, take },
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
   * Get video hash validation status
   *
   * @param hash Video hash on Swarm
   * @param opts Request options
   * @returns Validation status
   */
  async fetchHashValidation(hash: string, opts?: RequestOptions) {
    const resp = await this.instance.request.get<IndexVideoValidation>(
      `/videos/manifest/${hash}/validation`,
      {
        headers: opts?.headers,
        signal: opts?.signal,
        timeout: opts?.timeout,
      }
    )

    if (typeof resp.data !== "object") {
      throw new Error("Cannot fetch the hash validation")
    }

    return resp.data
  }

  /**
   * Update a video information
   *
   * @param id Id of the video on Index
   * @param newHash New manifest hash with video metadata
   * @param opts Request options
   * @returns Video id
   */
  async updateVideo(id: string, newHash: string, opts?: RequestOptions) {
    const resp = await this.instance.request.put<IndexVideoManifest>(`/videos/${id}`, null, {
      params: {
        newHash,
      },
      withCredentials: true,
      headers: opts?.headers,
      signal: opts?.signal,
      timeout: opts?.timeout,
    })

    if (typeof resp.data !== "object") {
      throw new Error("Cannot update the video")
    }

    return resp.data
  }

  /**
   * Get video validations list
   *
   * @param id Video id on Index
   * @param opts Request options
   * @returns List of validations
   */
  async fetchValidations(id: string, opts?: RequestOptions) {
    const resp = await this.instance.request.get<IndexVideoValidation[]>(
      `/videos/${id}/validations`,
      {
        headers: opts?.headers,
        signal: opts?.signal,
        timeout: opts?.timeout,
      }
    )

    if (Array.isArray(resp.data)) {
      throw new Error("Cannot fetch the video validations")
    }

    return resp.data
  }

  /**
   * Delete a video from the index
   *
   * @param id Id of the video
   * @param opts Request options
   * @returns Success state
   */
  async deleteVideo(id: string, opts?: RequestOptions) {
    await this.instance.request.delete(`/videos/${id}`, {
      withCredentials: true,
      headers: opts?.headers,
      signal: opts?.signal,
      timeout: opts?.timeout,
    })

    return true
  }

  /**
   * Fetch the video comments
   *
   * @param id Id of the video
   * @param page Page offset (default = 0)
   * @param take Number of comments to fetch (default = 25)
   * @param opts Request options
   * @returns The list of comments
   */
  async fetchComments(id: string, page = 0, take = 25, opts?: RequestOptions) {
    const resp = await this.instance.request.get<IndexVideoComment[]>(`/videos/${id}/comments`, {
      params: { page, take },
      withCredentials: true,
      headers: opts?.headers,
      signal: opts?.signal,
      timeout: opts?.timeout,
    })

    if (!Array.isArray(resp.data)) {
      throw new Error("Cannot fetch comments")
    }

    return resp.data
  }

  /**
   * Post a new comment to a video
   *
   * @param id Id of the video
   * @param message Message string with markdown
   * @param opts Request options
   * @returns The comment object
   */
  async postComment(id: string, message: string, opts?: RequestOptions) {
    const resp = await this.instance.request.post<IndexVideoComment>(
      `/videos/${id}/comments`,
      `"${message}"`,
      {
        withCredentials: true,
        headers: {
          accept: "text/plain",
          "content-type": "application/json",
          ...opts?.headers,
        },
        signal: opts?.signal,
        timeout: opts?.timeout,
      }
    )

    return resp.data
  }

  /**
   * Give a up/down vote to the video
   *
   * @param id Id of the video
   * @param vote Up / Down / Neutral vote
   * @param opts Request options
   */
  async vote(id: string, vote: VoteValue, opts?: RequestOptions) {
    const resp = await this.instance.request.post<IndexVideoComment>(`/videos/${id}/votes`, null, {
      params: {
        value: vote,
      },
      withCredentials: true,
      headers: opts?.headers,
      signal: opts?.signal,
      timeout: opts?.timeout,
    })

    return resp.data
  }

  /**
   * Report a video
   *
   * @param id Id of the video
   * @param manifestReference Reference of the manifest to report
   * @param code Report code
   * @param opts Request options
   */
  async reportVideo(id: string, manifestReference: string, code: string, opts?: RequestOptions) {
    const resp = await this.instance.request.post(
      `/videos/${id}/manifest/${manifestReference}/reports`,
      null,
      {
        params: {
          description: code,
        },
        withCredentials: true,
        headers: opts?.headers,
        signal: opts?.signal,
        timeout: opts?.timeout,
      }
    )

    return resp.data
  }
}
