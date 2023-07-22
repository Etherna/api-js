import { etc } from "@noble/secp256k1"

import { makeHexString } from "./hex"

export function makeBytesReference(reference: string): Uint8Array {
  const hexReference = makeHexString(reference)
  return etc.hexToBytes(hexReference)
}
