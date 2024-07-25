import type { Bytes } from "@/types/utils"

/**
 * Verify if passed data are Bytes and if the array has "length" number of bytes under given offset.
 *
 * @param data
 * @param offset
 * @param length
 */
export function hasBytesAtOffset(
  data: unknown,
  offset: number,
  length: number,
): boolean {
  if (!(data instanceof Uint8Array)) {
    throw new TypeError("Data has to an Uint8Array!")
  }

  const offsetBytes = data.slice(offset, offset + length)
  return offsetBytes.length === length
}

/**
 * Returns a new byte array filled with zeroes with the specified length
 *
 * @param length The length of data to be returned
 */
export function makeBytes(length: number): Uint8Array {
  return new Uint8Array(length)
}

/**
 * Helper function for serialize byte arrays
 *
 * @param arrays Any number of byte array arguments
 */
export function serializeBytes(...arrays: Uint8Array[]): Uint8Array {
  const length = arrays.reduce((prev, curr) => prev + curr.length, 0)
  const buffer = new Uint8Array(length)
  let offset = 0
  arrays.forEach((arr) => {
    buffer.set(arr, offset)
    offset += arr.length
  })

  return buffer
}

/**
 * Returns true if two byte arrays are equal
 *
 * @param a Byte array to compare
 * @param b Byte array to compare
 */
export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

/**
 * Overwrites `a` bytearrays elements with elements of `b` starts from `i`
 *
 * @param a Byte array to overwrite
 * @param b Byte array to copy
 * @param i Start index
 */
export function overwriteBytes(a: Uint8Array, b: Uint8Array, i = 0): void {
  if (a.length < b.length + i) {
    throw Error(
      `Cannot copy bytes because the base byte array length is lesser (${a.length}) than the others (${b.length})`,
    )
  }

  for (let index = 0; index < b.length; index++) {
    const byte = b[index]
    if (byte !== undefined) {
      a[index + i] = byte
    }
  }
}

/**
 * Flattens the given array that consist of Uint8Arrays.
 */
export function flattenBytesArray(bytesArray: Uint8Array[]): Uint8Array {
  if (bytesArray.length === 0) return new Uint8Array(0)

  const bytesLength = bytesArray
    .map((v) => v.length)
    .reduce((sum, v) => (sum += v))
  const flattenBytes = new Uint8Array(bytesLength)
  let nextWriteIndex = 0
  for (const b of bytesArray) {
    overwriteBytes(flattenBytes, b, nextWriteIndex)
    nextWriteIndex += b.length
  }

  return flattenBytes
}

/**
 * Checks if the given bytes array has the specified length.
 *
 * @param bytes The bytes array to check
 * @param length The expected length of the bytes array
 */
export function checkBytes<Length extends number>(
  bytes: unknown,
  length: number,
): asserts bytes is Bytes<Length> {
  if (!(bytes instanceof Uint8Array))
    throw Error("Cannot set given bytes, because is not an Uint8Array type")

  if (bytes.length !== 32) {
    throw Error(
      `Cannot set given bytes, because it does not have ${length} length. Got ${bytes.length}`,
    )
  }
}
