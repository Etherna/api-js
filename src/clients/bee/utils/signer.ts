import { etc, getPublicKey, signAsync, Signature } from "@noble/secp256k1"

import { keccak256Hash } from "../../../utils"
import { makeHexString } from "./hex"

import type { EthAddress, Signer } from "../types"

const UNCOMPRESSED_RECOVERY_ID = 27

/**
 * Creates a singer object that can be used when the private key is known.
 *
 * @param privateKey The private key
 */
export function makePrivateKeySigner(privateKey: string): Signer {
  const pubKey = getPublicKey(privateKey, false)
  const address = publicKeyToAddress(pubKey)

  return {
    sign: digest => defaultSign(digest, etc.hexToBytes(privateKey)),
    address,
  }
}

/**
 * The default signer function that can be used for integrating with
 * other applications (e.g. wallets).
 *
 * @param data      The data to be signed
 * @param privateKey  The private key used for signing the data
 */
export async function defaultSign(
  data: Uint8Array | string,
  privateKey: Uint8Array
): Promise<string> {
  // fix nodejs crypto
  if (typeof window === "undefined") {
    const hmac = await import("@noble/hashes/hmac").then(mod => mod.hmac)
    const sha256 = await import("@noble/hashes/sha256").then(mod => mod.sha256)

    etc.hmacSha256Sync = (k, ...m) => hmac(sha256, k, etc.concatBytes(...m))
    etc.hmacSha256Async = (k, ...m) => Promise.resolve(etc.hmacSha256Sync!(k, ...m))
  }

  const hashedDigest = hashWithEthereumPrefix(
    typeof data === "string" ? new TextEncoder().encode(data) : data
  )
  const sig = await signAsync(hashedDigest, privateKey, {})
  const rawSig = sig.toCompactRawBytes()

  const signature = new Uint8Array([...rawSig, sig.recovery! + UNCOMPRESSED_RECOVERY_ID])

  return etc.bytesToHex(signature)
}

/**
 * Recovers the ethereum address from a given signature.
 *
 * Can be used for verifying a piece of data when the public key is
 * known.
 *
 * @param signature The signature
 * @param digest    The digest of the data
 *
 * @returns the recovered address
 */
export function recoverAddress(signature: Uint8Array, digest: Uint8Array): Uint8Array {
  const recoveryParam = signature[64]! - UNCOMPRESSED_RECOVERY_ID
  const hash = hashWithEthereumPrefix(digest)
  const r = etc.bytesToNumberBE(signature.slice(0, 32))
  const s = etc.bytesToNumberBE(signature.slice(32, 64))
  const sign = new Signature(r, s, recoveryParam)
  const recPubKey = sign.recoverPublicKey(hash)
  const address = makeHexString(publicKeyToAddress(recPubKey.toRawBytes(false)))

  return etc.hexToBytes(address)
}

function publicKeyToAddress(pubKey: Uint8Array): EthAddress {
  const addressBytes = keccak256Hash(pubKey.slice(1)).slice(12)
  const address = etc.bytesToHex(addressBytes).replace(/^0x/, "")
  return `0x${address}`
}

function hashWithEthereumPrefix(data: Uint8Array): Uint8Array {
  const ethereumSignedMessagePrefix = `\x19Ethereum Signed Message:\n${data.length}`
  const prefixBytes = new TextEncoder().encode(ethereumSignedMessagePrefix)

  return keccak256Hash(prefixBytes, data)
}
