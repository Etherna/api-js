import axios from "axios"

import { isValidReference } from "../../utils"
import Auth from "./auth"
import Bytes from "./bytes"
import Bzz from "./bzz"
import ChainState from "./chainstate"
import Chunk from "./chunk"
import Feed from "./feeds"
import Pins from "./pins"
import Soc from "./soc"
import Stamps from "./stamps"
import { makePrivateKeySigner } from "./utils/signer"

import type { PostageBatch, Reference, Signer } from "./types"
import type { AxiosInstance } from "axios"

export interface BeeClientOptions {
  signer?: Signer | string
  postageBatches?: PostageBatch[]
  axios?: AxiosInstance
}

export default class BeeClient {
  signer?: Signer
  request: AxiosInstance

  auth: Auth
  bytes: Bytes
  bzz: Bzz
  chainstate: ChainState
  chunk: Chunk
  feed: Feed
  pins: Pins
  soc: Soc
  stamps: Stamps

  postageBatches: PostageBatch[]

  constructor(public url: string, opts?: BeeClientOptions) {
    this.signer =
      typeof opts?.signer === "string" ? makePrivateKeySigner(opts.signer) : opts?.signer
    this.request =
      opts?.axios ??
      axios.create({
        baseURL: url,
      })
    this.auth = new Auth(this)
    this.bytes = new Bytes(this)
    this.bzz = new Bzz(this)
    this.chainstate = new ChainState(this)
    this.chunk = new Chunk(this)
    this.feed = new Feed(this)
    this.pins = new Pins(this)
    this.soc = new Soc(this)
    this.stamps = new Stamps(this)
    this.postageBatches = opts?.postageBatches ?? []
  }

  /**
   * Check if an hash is a valid swarm hash
   *
   * @param hash Hash string
   * @returns True if the hash is valid
   */
  static isValidHash(hash: string): hash is Reference {
    return isValidReference(hash)
  }

  isValidHash(hash: string) {
    return BeeClient.isValidHash(hash)
  }
}
