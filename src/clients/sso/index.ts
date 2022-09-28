import axios from "axios"
import type { AxiosInstance } from "axios"

import { composeUrl } from "../../utils/urls"
import IdentityClient from "./identity"

export interface SSOClientOptions {
  url: string
  apiPath: string
  loginPath?: string
  logoutPath?: string
}

export default class EthernaSSOClient {
  url: string
  request: AxiosInstance
  loginPath: string
  logoutPath: string

  identity: IdentityClient

  /**
   * Init an index client
   * @param options Client options
   */
  constructor(options: SSOClientOptions) {
    this.url = composeUrl(options.url, options.apiPath)

    this.request = axios.create({ baseURL: this.url })
    this.identity = new IdentityClient(this)
    this.loginPath = composeUrl(options.url, options.loginPath || "/account/login")
    this.logoutPath = composeUrl(options.url, options.logoutPath || "/account/logout")
  }

  /**
   * Redirect to login page
   * @param returnUrl Redirect url after login (default = null)
   */
  loginRedirect(returnUrl: string | null = null) {
    const retUrl = encodeURIComponent(returnUrl || window.location.href)
    window.location.href = this.loginPath + `?ReturnUrl=${retUrl}`
  }

  /**
   * Redirect to logout page
   * @param returnUrl Redirect url after logout (default = null)
   */
  logoutRedirect(returnUrl: string | null = null) {
    const retUrl = encodeURIComponent(returnUrl || window.location.href)
    window.location.href = this.logoutPath + `?ReturnUrl=${retUrl}`
  }
}
