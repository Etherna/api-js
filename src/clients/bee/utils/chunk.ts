import { makeChunk } from "@fairdatasociety/bmt-js"
import { makeSpan } from "@fairdatasociety/bmt-js/src/span"

import { serializeBytes } from "./bytes"

import type { Chunk } from "@fairdatasociety/bmt-js/src"

/**
 * Creates a content addressed chunk and verifies the payload size.
 *
 * @param payloadBytes the data to be stored in the chunk
 */
export function makeContentAddressedChunk(payloadBytes: Uint8Array): Chunk {
  const span = makeSpan(payloadBytes.length)
  const data = serializeBytes(span, payloadBytes)
  const chunk = makeChunk(data)

  return chunk
}
