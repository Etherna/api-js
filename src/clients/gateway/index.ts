import BaseClient from "../base-client"
import PostageClient from "./postage"
import ResourcesClient from "./resources"
import SystemClient from "./system"
import UsersClient from "./users"

import type { BaseClientOptions } from "../base-client"

export interface GatewayClientOptions extends BaseClientOptions {}

export default class EthernaGatewayClient extends BaseClient {
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
    super(options)

    this.resources = new ResourcesClient(this)
    this.users = new UsersClient(this)
    this.system = new SystemClient(this)
    this.postage = new PostageClient(this)
  }
}
