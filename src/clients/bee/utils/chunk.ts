import { bmtHash } from "./bmt"
import { flexBytesAtOffset, serializeBytes } from "./bytes"
import { CAC_PAYLOAD_OFFSET, MAX_SPAN_LENGTH, SPAN_SIZE } from "./contants"

import type { Chunk } from "../types"

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
    payload: () => flexBytesAtOffset(data, CAC_PAYLOAD_OFFSET),
    address: () => bmtHash(data),
  }
}

/**
 * Create a span for storing the length of the chunk
 *
 * The length is encoded in 64-bit little endian.
 *
 * @param length The length of the span
 */
export function makeSpan(length: number): Uint8Array {
  if (length <= 0) {
    throw new Error("invalid length for span")
  }

  if (length > MAX_SPAN_LENGTH) {
    throw new Error("invalid length (> MAX_SPAN_LENGTH)")
  }

  const span = new Uint8Array(SPAN_SIZE)
  const dataView = new DataView(span.buffer)
  const littleEndian = true
  const lengthLower32 = length & 0xffffffff

  dataView.setUint32(0, lengthLower32, littleEndian)

  return span
}
