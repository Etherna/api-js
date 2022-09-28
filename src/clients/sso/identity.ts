import type EthernaSSOClient from "."
import type { SSOIdentity } from ".."

export default class IdentityClient {
  constructor(private instance: EthernaSSOClient) {}

  /**
   * Get current SSO user
   */
  async fetchCurrentIdentity() {
    const resp = await this.instance.request.get<SSOIdentity>(`/identity`, {
      withCredentials: true,
    })

    if (typeof resp.data !== "object") {
      throw new Error("Cannot fetch identity")
    }

    return resp.data
  }
}
