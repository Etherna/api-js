import { makeChunkedFile } from "@fairdatasociety/bmt-js"

import { toHexString } from "./hex"
import { referenceToBytesReference } from "./reference"

import type { MantarayNode } from "../handlers/mantaray"
import type { BytesReference, Reference } from "@/types/swarm"

export const ZeroHashReference = new Uint8Array(32).fill(0) as BytesReference
export const RootPath = "/"
export const WebsiteIndexDocumentSuffixKey = "website-index-document"
export const WebsiteErrorDocumentPathKey = "website-error-document"
export const EntryMetadataContentTypeKey = "Content-Type"
export const EntryMetadataFilenameKey = "Filename"
export const EntryMetadataFeedOwnerKey = "swarm-feed-owner"
export const EntryMetadataFeedTopicKey = "swarm-feed-topic"
export const EntryMetadataFeedTypeKey = "swarm-feed-type"

/**
 * Get the reference from bytes data
 *
 * @param data The data
 * @returns The reference
 */
export function getReferenceFromData(data: Uint8Array): Reference {
  const chunkedFile = makeChunkedFile(data)
  return toHexString(chunkedFile.address()) as Reference
}

/**
 * Get the reference from json data
 *
 * @param data The data
 * @returns The reference
 */
export function jsonToReference(content: object): BytesReference {
  return textToReference(JSON.stringify(content))
}

/**
 * Get the reference from text data
 *
 * @param data The data
 * @returns The reference
 */
export function textToReference(content: string): BytesReference {
  return referenceToBytesReference(getReferenceFromData(new TextEncoder().encode(content)))
}

/**
 * Encode the path to bytes
 *
 * @param data The path
 * @returns The bytes
 */
export function encodePath(path: string): Uint8Array {
  return new TextEncoder().encode(path)
}

/**
 * Decode the path from bytes
 *
 * @param data The bytes
 * @returns The path
 */
export function decodePath(path: Uint8Array): string {
  return new TextDecoder().decode(path)
}

/**
 * Check if the reference is zero bytes
 *
 * @param ref The reference
 * @returns True if the reference is zero bytes
 */
export function isZeroBytesReference(ref: BytesReference | Reference): boolean {
  if (typeof ref === "string") {
    return Array.from(ref).every((char) => char === "0")
  }
  return ref.every((byte) => byte === 0)
}

/**
 * Get all paths from the mantaray node
 *
 * @param node The mantaray node
 * @returns The paths in a nested object
 */
export function getAllPaths(node: MantarayNode) {
  const paths: Record<string, MantarayNode> = {}

  for (const fork of Object.values(node.forks ?? {})) {
    const prefix = decodePath(fork.prefix)
    const isEnd = !fork.node.forks || Object.keys(fork.node.forks).length === 0

    if (isEnd) {
      paths[prefix] = fork.node
    } else {
      const subPaths = getAllPaths(fork.node)
      for (const [subPath, subNode] of Object.entries(subPaths)) {
        paths[prefix + subPath] = subNode
      }
    }
  }

  return paths
}

/**
 * Find all nodes with a prefix
 *
 * @param node The mantaray node
 * @param prefix The prefix to search for
 * @returns An array of nodes with the prefix
 */
export function getNodesWithPrefix(node: MantarayNode, prefix: string): MantarayNode[] {
  const allPaths = getAllPaths(node)
  const entries = Object.entries(allPaths)
  return entries.filter(([path]) => path.startsWith(prefix)).map(([_, node]) => node)
}
