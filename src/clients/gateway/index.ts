import type { AxiosInstance } from "axios"
import axios from "axios"

import { composeUrl } from "../../utils/urls"
import PostageClient from "./postage"
import ResourcesClient from "./resources"
import SystemClient from "./system"
import UsersClient from "./users"

export interface GatewayClientOptions {
  url: string
  apiPath: string
  loginPath?: string
  logoutPath?: string
}

export default class EthernaGatewayClient {
  url: string
  request: AxiosInstance
  loginPath: string
  logoutPath: string

  resources: ResourcesClient
  users: UsersClient
  system: SystemClient
  postage: PostageClient

  static maxBatchDepth = 20

  /**
   * Init an gateway client
   *
   * @param options Client options
   */
  constructor(options: GatewayClientOptions) {
    this.url = composeUrl(options.url, options.apiPath)

    this.request = axios.create({ baseURL: this.url })
    this.resources = new ResourcesClient(this)
    this.users = new UsersClient(this)
    this.system = new SystemClient(this)
    this.postage = new PostageClient(this)
    this.loginPath = composeUrl(options.url, options.loginPath || "/account/login")
    this.logoutPath = composeUrl(options.url, options.logoutPath || "/account/logout")
  }

  /**
   * Redirect to login page
   *
   * @param returnUrl Redirect url after login (default = null)
   */
  loginRedirect(returnUrl: string | null = null) {
    const retUrl = encodeURIComponent(returnUrl || window.location.href)
    window.location.href = this.loginPath + `?ReturnUrl=${retUrl}`
  }

  /**
   * Redirect to logout page
   *
   * @param returnUrl Redirect url after logout (default = null)
   */
  logoutRedirect(returnUrl: string | null = null) {
    const retUrl = encodeURIComponent(returnUrl || window.location.href)
    window.location.href = this.logoutPath + `?ReturnUrl=${retUrl}`
  }
}
