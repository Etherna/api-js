import { BaseClient } from "../base-client"
import { IdentityClient } from "./identity"

import type { BaseClientOptions } from "../base-client"

export interface SSOClientOptions extends BaseClientOptions {}

export class EthernaSSOClient extends BaseClient {
  identity: IdentityClient

  /**
   * Init an index client
   * @param options Client options
   */
  constructor(baseUrl: string, options?: SSOClientOptions) {
    super(baseUrl, options)

    this.identity = new IdentityClient(this)
  }
}
