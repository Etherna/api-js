import { wrapBytesWithHelpers } from "./utils/bytes"
import { prepareData } from "./utils/data"
import { extractFileUploadHeaders } from "./utils/headers"

import type BeeClient from "."
import type { RequestOptions } from ".."
import type { ReferenceResponse, RequestDownloadOptions, RequestUploadOptions } from "./types"

const bytesEndpoint = "/bytes"

export default class Bytes {
  constructor(private instance: BeeClient) {}

  url(reference: string) {
    return `${this.instance.url}${bytesEndpoint}/${reference}`
  }

  async download(hash: string, options?: RequestDownloadOptions) {
    const resp = await this.instance.request.get<ArrayBuffer>(`${bytesEndpoint}/${hash}`, {
      responseType: "arraybuffer",
      headers: options?.headers,
      timeout: options?.timeout,
      signal: options?.signal,
      onDownloadProgress: e => {
        if (options?.onDownloadProgress) {
          const progress = Math.round((e.loaded / e.total) * 100)
          options.onDownloadProgress(progress)
        }
      },
    })

    return wrapBytesWithHelpers(new Uint8Array(resp.data))
  }

  async upload(data: Uint8Array | File | string, options: RequestUploadOptions) {
    const resp = await this.instance.request.post<ReferenceResponse>(
      `${bytesEndpoint}`,
      prepareData(data),
      {
        headers: {
          ...extractFileUploadHeaders(options),
        },
        timeout: options?.timeout,
        signal: options?.signal,
        onUploadProgress: e => {
          if (options?.onUploadProgress) {
            const progress = Math.round((e.loaded / e.total) * 100)
            options.onUploadProgress(progress)
          }
        },
      }
    )

    return {
      reference: resp.data.reference,
      tagUid: resp.headers["swarm-tag"],
    }
  }
}
