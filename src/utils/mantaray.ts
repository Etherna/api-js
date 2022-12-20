import { makeChunkedFile } from "@fairdatasociety/bmt-js"

import { MantarayNode } from "../handlers/mantaray"
import { toHexString, fromHexString } from "./bytes"

import type { BeeClient, Reference } from "../clients"
import type { Reference as BytesReference } from "../handlers/mantaray/types"

export const ZeroHashReference = new Uint8Array(64).fill(0) as BytesReference
export const RootPath = "/"
export const WebsiteIndexDocumentSuffixKey = "website-index-document"
export const EntryMetadataContentTypeKey = "Content-Type"
export const EntryMetadataFilenameKey = "Filename"

export function getReferenceFromData(data: Uint8Array): Reference {
  const chunkedFile = makeChunkedFile(data)
  return toHexString(chunkedFile.address()) as Reference
}

export function referenceToBytesReference(ref: Reference): BytesReference {
  return fromHexString(ref) as BytesReference
}

export function bytesReferenceToReference(ref: BytesReference): Reference {
  return toHexString(ref) as Reference
}

export function jsonToReference(content: object): BytesReference {
  return referenceToBytesReference(
    getReferenceFromData(new TextEncoder().encode(JSON.stringify(content)))
  )
}

export function encodePath(path: string): Uint8Array {
  return new TextEncoder().encode(path)
}

export function decodePath(path: Uint8Array): string {
  return new TextDecoder().decode(path)
}

export const isZeroBytesReference = (ref: BytesReference | Reference): boolean => {
  if (typeof ref === "string") {
    return Array.from(ref).every(char => char === "0")
  }
  return ref.every(byte => byte === 0)
}

export async function getBzzNodeInfo(
  reference: Reference,
  beeClient: BeeClient
): Promise<{ entry: BytesReference; contentType?: string } | null> {
  try {
    const node = new MantarayNode()
    await node.load(async reference => {
      const bmtData = await beeClient.bytes.download(toHexString(reference))
      return bmtData
    }, referenceToBytesReference(reference))

    const fork = node.getForkAtPath(encodePath(RootPath))
    const metadata = fork?.node.getMetadata
    const indexEntry = metadata?.[WebsiteIndexDocumentSuffixKey]

    if (!fork?.node.getEntry) {
      throw new Error("No root fork found")
    }

    const isZero = isZeroBytesReference(fork.node.getEntry)

    if (isZero && !indexEntry) {
      throw new Error("No root entry found")
    }

    return {
      entry: isZero ? referenceToBytesReference(indexEntry as Reference) : fork.node.getEntry,
      contentType: fork.node.getMetadata?.[EntryMetadataContentTypeKey],
    }
  } catch (error) {
    return null
  }
}
