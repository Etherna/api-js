import { bmtHash } from "./bmt"
import { serializeBytes } from "./bytes"
import { CAC_PAYLOAD_OFFSET } from "./contants"

import type { Chunk } from "../types"
import { makeSpan } from "@fairdatasociety/bmt-js/src/span"

/**
 * Creates a content addressed chunk and verifies the payload size.
 *
 * @param payloadBytes the data to be stored in the chunk
 */
export function makeContentAddressedChunk(payloadBytes: Uint8Array): Chunk {
  const span = makeSpan(payloadBytes.length)
  const data = serializeBytes(span, payloadBytes)

  return {
    data,
    span: () => span,
    payload: () => data.slice(CAC_PAYLOAD_OFFSET),
    address: () => bmtHash(data),
  }
}
