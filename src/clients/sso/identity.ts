import { throwSdkError } from "@/classes/error"

import type { EthernaSSOClient } from "."
import type { SSOIdentity } from "./types"

export class IdentityClient {
  constructor(private instance: EthernaSSOClient) {}

  /**
   * Get current SSO user
   */
  async fetchCurrentIdentity() {
    try {
      const resp = await this.instance.request.get<SSOIdentity>(`/identity`, {
        ...this.instance.prepareAxiosConfig(),
      })

      return resp.data
    } catch (error) {
      throwSdkError(error)
    }
  }
}
