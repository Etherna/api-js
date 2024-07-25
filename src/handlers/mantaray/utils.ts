import { bytesEqual, checkBytes } from "@/utils/bytes"

import type { Bytes } from "@/types/utils"

export async function getBzzNodeInfo(
  reference: Reference,
  beeClient: BeeClient,
  signal?: AbortSignal,
): Promise<{ entry: BytesReference; contentType?: string } | null> {
  try {
    const node = new MantarayNode()
    await node.load(async (reference) => {
      const bmtData = await beeClient.bytes.download(toHexString(reference), {
        signal,
      })
      return bmtData
    }, referenceToBytesReference(reference))

    if (signal?.aborted) return null

    const fork = node.getForkAtPath(encodePath(RootPath))
    const metadata = fork?.node.metadata
    const indexEntry = metadata?.[WebsiteIndexDocumentSuffixKey]

    if (!fork?.node.entry) {
      throw new Error("No root fork found")
    }

    const isZero = isZeroBytesReference(fork.node.entry)

    if (isZero && !indexEntry) {
      throw new Error("No root entry found")
    }

    return {
      entry: isZero ? referenceToBytesReference(indexEntry as Reference) : fork.node.entry,
      contentType: fork.node.metadata?.[EntryMetadataContentTypeKey],
    }
  } catch (error) {
    return null
  }
}

/**
 * Finds starting index `searchFor` in `element` Uin8Arrays
 *
 * If `searchFor` is not found in `element` it returns -1
 *
 * @param element
 * @param searchFor
 * @returns starting index of `searchFor` in `element`
 */
export function findIndexOfArray(element: Uint8Array, searchFor: Uint8Array): number {
  for (let i = 0; i <= element.length - searchFor.length; i++) {
    let j = 0
    while (j < searchFor.length) {
      if (element[i + j] !== searchFor[j++]) break
    }

    if (j === searchFor.length) return i
  }

  return -1
}

/**
 * runs a XOR operation on data, encrypting it if it
 * hasn't already been, and decrypting it if it has, using the key provided.
 */
export function encryptDecrypt(
  key: Uint8Array,
  data: Uint8Array,
  startIndex = 0,
  endIndex?: number,
): void {
  // FIXME: in Bee
  if (bytesEqual(key, new Uint8Array(32))) return

  endIndex ||= data.length

  for (let i = startIndex; i < endIndex; i += key.length) {
    const maxChunkIndex = i + key.length
    const encryptionChunkEndIndex = maxChunkIndex <= data.length ? maxChunkIndex : data.length
    const encryptionChunk = data.slice(i, encryptionChunkEndIndex)
    for (let j = 0; j < encryptionChunk.length; j++) {
      encryptionChunk[j] = Number(encryptionChunk[j]) ^ Number(key[j % key.length])
    }
    data.set(encryptionChunk, i)
  }
}

/** It returns the common bytes of the two given byte arrays until the first byte difference */
export function common(a: Uint8Array, b: Uint8Array): Uint8Array {
  let c = new Uint8Array(0)

  for (let i = 0; i < a.length && i < b.length && a[i] === b[i]; i++) {
    c = new Uint8Array([...c, a[i]!])
  }

  return c
}

export class IndexBytes {
  private bytes: Bytes<32>

  public constructor() {
    this.bytes = new Uint8Array(32) as Bytes<32>
  }

  public get getBytes(): Bytes<32> {
    return new Uint8Array([...this.bytes]) as Bytes<32>
  }

  public set setBytes(bytes: Bytes<32>) {
    checkBytes<32>(bytes, 32)

    this.bytes = new Uint8Array([...bytes]) as Bytes<32>
  }

  /**
   *
   * @param byte is number max 255
   */
  public setByte(byte: number): void {
    if (byte > 255) throw Error(`IndexBytes setByte error: ${byte} is greater than 255`)
    this.bytes[Math.floor(byte / 8)] |= 1 << byte % 8
  }

  /**
   * checks the given byte is mapped in the Bytes<32> index
   *
   * @param byte is number max 255
   */
  public checkBytePresent(byte: number): boolean {
    return ((this.bytes[Math.floor(byte / 8)]! >> byte % 8) & 1) > 0
  }

  /** Iterates through on the indexed byte values */
  public forEach(hook: (byte: number) => void): void {
    for (let i = 0; i <= 255; i++) {
      if (this.checkBytePresent(i)) {
        hook(i)
      }
    }
  }
}
