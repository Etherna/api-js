import axios from "axios"

import { composeUrl } from "@/utils"

import type { RequestOptions } from "@/types/clients"
import type { AxiosInstance, AxiosRequestConfig } from "axios"

export interface BaseClientOptions {
  apiPath?: string
  accessToken?: string
}

export class BaseClient {
  baseUrl: string
  apiUrl: string
  request: AxiosInstance
  apiRequest: AxiosInstance
  accessToken?: string

  /**
   * @param options Client options
   */
  constructor(baseUrl: string, options?: BaseClientOptions) {
    this.baseUrl = baseUrl
    this.apiUrl = composeUrl(baseUrl, options?.apiPath)
    this.request = axios.create({ baseURL: this.baseUrl })
    this.apiRequest = axios.create({ baseURL: this.apiUrl })
    this.accessToken = options?.accessToken
  }

  updateAccessToken(accessToken: string | undefined) {
    this.accessToken = accessToken
  }

  prepareAxiosConfig(opts?: RequestOptions): AxiosRequestConfig {
    const authHeader = this.accessToken
      ? {
          Authorization: `Bearer ${this.accessToken}`,
        }
      : {}
    return {
      headers: {
        ...authHeader,
        ...opts?.headers,
      },
      signal: opts?.signal,
      timeout: opts?.timeout,
    }
  }
}
