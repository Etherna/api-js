/**
 * Validates input and converts to Uint8Array
 *
 * @param data any string, ArrayBuffer or Uint8Array
 */
export function prepareData(
  data: string | File | Uint8Array,
): Blob | ReadableStream<Uint8Array> | never {
  if (typeof data === "string") return new Blob([data], { type: "text/plain" })

  if (data instanceof Uint8Array) {
    return new Blob([data], { type: "application/octet-stream" })
  }

  if (data instanceof File) {
    return data
  }

  throw new TypeError("unknown data type")
}
