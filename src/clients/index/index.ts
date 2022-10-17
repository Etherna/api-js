import axios from "axios"
import type { AxiosInstance } from "axios"

import { composeUrl } from "../../utils/urls"
import IndexComments from "./comments"
import IndexModeration from "./moderation"
import IndexSearch from "./search"
import IndexSystem from "./system"
import IndexUsers from "./users"
import IndexVideos from "./videos"

export interface IndexClientOptions {
  url: string
  apiPath: string
  loginPath?: string
  logoutPath?: string
}

export default class EthernaIndexClient {
  url: string
  request: AxiosInstance
  loginPath: string
  logoutPath: string

  comments: IndexComments
  moderation: IndexModeration
  search: IndexSearch
  system: IndexSystem
  videos: IndexVideos
  users: IndexUsers

  /**
   * Init an index client
   * @param options Client options
   */
  constructor(options: IndexClientOptions) {
    this.url = composeUrl(options.url, options.apiPath)

    this.request = axios.create({ baseURL: this.url })
    this.comments = new IndexComments(this)
    this.moderation = new IndexModeration(this)
    this.search = new IndexSearch(this)
    this.system = new IndexSystem(this)
    this.videos = new IndexVideos(this)
    this.users = new IndexUsers(this)
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
