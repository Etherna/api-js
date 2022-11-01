import axios from "axios"

import { composeUrl } from "../utils"

import type { RequestOptions } from "./types"
import type { AxiosInstance, AxiosRequestConfig } from "axios"

export interface BaseClientOptions {
  url: string
  apiPath: string
  accessToken?: string
  loginPath?: string
  logoutPath?: string
}

export default class BaseClient {
  url: string
  baseUrl: string
  request: AxiosInstance
  loginPath: string
  logoutPath: string
  accessToken: string | undefined

  /**
   * @param options Client options
   */
  constructor(options: BaseClientOptions) {
    this.baseUrl = options.url
    this.url = composeUrl(options.url, options.apiPath)
    this.request = axios.create({ baseURL: this.url })
    this.accessToken = options.accessToken
    this.loginPath = composeUrl(options.url, options.loginPath || "/account/login")
    this.logoutPath = composeUrl(options.url, options.logoutPath || "/account/logout")
  }

  prepareAxiosConfig(opts?: RequestOptions): AxiosRequestConfig {
    return {
      headers: {
        ...opts?.headers,
        Authorization: this.accessToken ? `Bearer ${this.accessToken}` : undefined,
      },
      withCredentials: this.accessToken ? false : true,
      signal: opts?.signal,
      timeout: opts?.timeout,
    }
  }

  /**
   * Redirect to login page
   *
   * @param returnUrl Redirect url after login (default = null)
   */
  public loginRedirect(returnUrl: string | null = null) {
    const retUrl = encodeURIComponent(returnUrl || window.location.href)
    window.location.href = this.loginPath + `?ReturnUrl=${retUrl}`
  }

  /**
   * Redirect to logout page
   *
   * @param returnUrl Redirect url after logout (default = null)
   */
  public logoutRedirect(returnUrl: string | null = null) {
    const retUrl = encodeURIComponent(returnUrl || window.location.href)
    window.location.href = this.logoutPath + `?ReturnUrl=${retUrl}`
  }
}
