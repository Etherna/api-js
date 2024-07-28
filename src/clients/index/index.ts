import { BaseClient } from "../base-client"
import { IndexComments } from "./comments"
import { IndexModeration } from "./moderation"
import { IndexSearch } from "./search"
import { IndexSystem } from "./system"
import { IndexUsers } from "./users"
import { IndexVideos } from "./videos"

import type { BaseClientOptions } from "../base-client"

export interface IndexClientOptions extends BaseClientOptions {}

export class EthernaIndexClient extends BaseClient {
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
  constructor(baseUrl: string, options?: IndexClientOptions) {
    super(baseUrl, options)

    this.comments = new IndexComments(this)
    this.moderation = new IndexModeration(this)
    this.search = new IndexSearch(this)
    this.system = new IndexSystem(this)
    this.videos = new IndexVideos(this)
    this.users = new IndexUsers(this)
  }
}
