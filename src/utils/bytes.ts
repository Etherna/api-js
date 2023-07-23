import { etc } from "@noble/secp256k1"

import type { EthAddress } from "../clients"

export function fromHexString(hexString: string): Uint8Array {
  const matches = hexString.match(/.{1,2}/g)
  if (!matches) {
    throw Error(`Invalid hex string: ${hexString}`)
  }
  return Uint8Array.from(matches.map(byte => parseInt(byte, 16)))
}

export function toHexString(bytes: Uint8Array): string {
  return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "")
}

export function toEthAccount(bytes: Uint8Array): EthAddress {
  return `0x${etc.bytesToHex(bytes)}`
}
