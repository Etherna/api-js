import {
  decodePath,
  getNodesWithPrefix as getNodesWithPrefixString,
  keccak256Hash,
} from "../../utils"
import { toHexString } from "../../utils/bytes"
import { NodeType } from "./types"
import {
  checkReference,
  common,
  encryptDecrypt,
  equalBytes,
  findIndexOfArray,
  flattenBytesArray,
  fromBigEndian,
  IndexBytes,
  toBigEndianFromUint16,
} from "./utils"

import type {
  Bytes,
  BytesReference,
  MarshalVersion,
  MetadataMapping,
  StorageLoader,
  StorageSaver,
} from "./types"

const PATH_SEPARATOR = "/"
const PATH_SEPARATOR_BYTE = 47
const PADDING_BYTE = 0x0a

export type ForkMapping = { [key: number]: MantarayFork }
type RecursiveSaveReturnType = { reference: BytesReference; changed: boolean }

const nodeForkSizes = {
  nodeType: 1,
  prefixLength: 1,
  /** Bytes length before `reference` */
  preReference: 32,
  metadata: 2,
  header: (): number => nodeForkSizes.nodeType + nodeForkSizes.prefixLength, // 2
  prefixMaxSize: (): number => nodeForkSizes.preReference - nodeForkSizes.header(), // 30
} as const

const nodeHeaderSizes = {
  obfuscationKey: 32,
  versionHash: 31,
  /** Its value represents how long is the `entry` in bytes */
  refBytes: 1,
  full: (): number => {
    return nodeHeaderSizes.obfuscationKey + nodeHeaderSizes.versionHash + nodeHeaderSizes.refBytes
  },
} as const

class NotFoundError extends Error {
  constructor(remainingPathBytes: Uint8Array, checkedPrefixBytes?: Uint8Array) {
    const remainingPath = new TextDecoder().decode(remainingPathBytes)
    const prefixInfo = checkedPrefixBytes
      ? `Prefix on lookup: ${new TextDecoder().decode(checkedPrefixBytes)}`
      : "No fork on the level"
    super(
      `Path has not found in the manifest. Remaining path on lookup: ${remainingPath}. ${prefixInfo}`
    )
  }
}

class EmptyPathError extends Error {
  constructor() {
    super("Empty path")
  }
}

class UndefinedField extends Error {
  constructor(field: string) {
    super(`"${field}" field is not initialized.`)
  }
}

class PropertyIsUndefined extends Error {
  constructor() {
    super(`Property does not exist in the object`)
  }
}

class NotImplemented extends Error {
  constructor() {
    super("Not Implemented")
  }
}

export class MantarayFork {
  /**
   * @param prefix the non-branching part of the subpath
   * @param node in memory structure that represents the Node
   */
  constructor(
    public prefix: Uint8Array,
    public node: MantarayNode
  ) {}

  private createMetadataPadding(metadataSizeWithSize: number): Uint8Array {
    let padding = new Uint8Array(0)

    if (metadataSizeWithSize < nodeHeaderSizes.obfuscationKey) {
      const paddingLength = nodeHeaderSizes.obfuscationKey - metadataSizeWithSize
      padding = new Uint8Array(paddingLength)
      for (let i = 0; i < padding.length; i++) {
        padding[i] = PADDING_BYTE
      }
    } else if (metadataSizeWithSize > nodeHeaderSizes.obfuscationKey) {
      const paddingLength =
        nodeHeaderSizes.obfuscationKey - (metadataSizeWithSize % nodeHeaderSizes.obfuscationKey)
      padding = new Uint8Array(paddingLength)
      for (let i = 0; i < padding.length; i++) {
        padding[i] = PADDING_BYTE
      }
    }

    return padding
  }

  public serialize(): Uint8Array {
    const nodeType = this.node.type

    const prefixLengthBytes = new Uint8Array(1)
    prefixLengthBytes[0] = this.prefix.length

    const prefixBytes = new Uint8Array(nodeForkSizes.prefixMaxSize())
    prefixBytes.set(this.prefix)

    const entry: BytesReference | undefined = this.node.contentAddress

    if (!entry) throw Error("cannot serialize MantarayFork because it does not have contentAddress")

    const data = new Uint8Array([nodeType, ...prefixLengthBytes, ...prefixBytes, ...entry])

    if (this.node.IsWithMetadataType()) {
      const jsonString = JSON.stringify(this.node.metadata)
      const metadataBytes = new TextEncoder().encode(jsonString)

      const metadataSizeWithSize = metadataBytes.length + nodeForkSizes.metadata
      const padding = this.createMetadataPadding(metadataSizeWithSize)

      const metadataBytesSize = toBigEndianFromUint16(metadataBytes.length + padding.length)

      return new Uint8Array([...data, ...metadataBytesSize, ...metadataBytes, ...padding])
    }

    return data
  }

  public static deserialize(
    data: Uint8Array,
    obfuscationKey: Bytes<32>,
    options?: {
      withMetadata?: {
        refBytesSize: number
        metadataByteSize: number
      }
    }
  ): MantarayFork {
    const nodeType = data[0]!
    const prefixLength = data[1]!

    if (prefixLength === 0 || prefixLength > nodeForkSizes.prefixMaxSize()) {
      throw Error(
        `Prefix length of fork is greater than ${nodeForkSizes.prefixMaxSize()}. Got: ${prefixLength}`
      )
    }

    const headerSize = nodeForkSizes.header()
    const prefix = data.slice(headerSize, headerSize + prefixLength)
    const node = new MantarayNode()
    node.obfuscationKey = obfuscationKey

    const withMetadata = options?.withMetadata

    if (withMetadata) {
      const { refBytesSize, metadataByteSize } = withMetadata

      if (metadataByteSize > 0) {
        node.entry = data.slice(
          nodeForkSizes.preReference,
          nodeForkSizes.preReference + refBytesSize
        ) as Bytes<32> | Bytes<64>

        const startMetadata = nodeForkSizes.preReference + refBytesSize + nodeForkSizes.metadata
        const metadataBytes = data.slice(startMetadata, startMetadata + metadataByteSize)

        const jsonString = new TextDecoder().decode(metadataBytes)
        node.metadata = JSON.parse(jsonString) as any
      }
    } else {
      node.entry = data.slice(nodeForkSizes.preReference) as Bytes<32> | Bytes<64>
    }
    node.type = nodeType

    return new MantarayFork(prefix, node)
  }
}

export class MantarayNode {
  /** Used with NodeType type */
  private _type?: number
  private _obfuscationKey?: Bytes<32>
  /** reference of a loaded manifest node. if undefined, the node can be handled as `dirty` */
  private _contentAddress?: BytesReference
  /** reference of an content that the manifest refers to */
  private _entry?: BytesReference
  private _metadata?: MetadataMapping
  /** Forks of the manifest. Has to be initialized with `{}` on load even if there were no forks */
  public forks?: ForkMapping

  /// Setters/getters

  // @ts-ignore
  public get contentAddress(): BytesReference | undefined {
    return this._contentAddress
  }
  public set contentAddress(contentAddress: BytesReference) {
    checkReference(contentAddress)

    this._contentAddress = contentAddress
  }
  // @ts-ignore
  public get entry(): BytesReference | undefined {
    return this._entry
  }
  public set entry(entry: BytesReference) {
    checkReference(entry)

    this._entry = entry

    if (!equalBytes(entry, new Uint8Array(entry.length))) this.makeValue()

    this.makeDirty()
  }
  // @ts-ignore
  public get type(): number {
    if (this._type === undefined) throw PropertyIsUndefined

    if (this._type > 255) throw 'Property "type" in Node is greater than 255'

    return this._type
  }
  public set type(type: number) {
    if (type > 255) throw Error(`Node type representation cannot be greater than 255`)

    this._type = type
  }
  // @ts-ignore
  public get obfuscationKey(): Bytes<32> | undefined {
    return this._obfuscationKey
  }
  public set obfuscationKey(obfuscationKey: Bytes<32>) {
    if (!(obfuscationKey instanceof Uint8Array)) {
      throw new Error("Given obfuscationKey is not an Uint8Array instance.")
    }

    if (obfuscationKey.length !== 32) {
      throw new Error(`Wrong obfuscationKey length. Entry only can be 32 length in bytes`)
    }

    this._obfuscationKey = obfuscationKey
    this.makeDirty()
  }
  // @ts-ignore
  public get metadata(): MetadataMapping | undefined {
    return this._metadata
  }
  public set metadata(metadata: MetadataMapping) {
    this._metadata = metadata
    this.makeWithMetadata()

    // TODO: when the mantaray node is a pointer by its metadata then
    // the node has to be with `value` type even though it has zero address
    // should get info why is `withMetadata` as type is not enough
    if (metadata["website-index-document"] || metadata["website-error-document"]) {
      this.makeValue()
    }
    this.makeDirty()
  }

  public get readable(): object {
    return {
      type: this._type,
      entry: this._entry ? toHexString(this._entry) : undefined,
      contentAddress: this._contentAddress ? toHexString(this._contentAddress) : undefined,
      metadata: this._metadata,
      forks: Object.keys(this.forks || {}).reduce(
        (acc, key) => ({
          ...acc,
          [new TextDecoder().decode(new Uint8Array([+key]))]: {
            prefix: new TextDecoder().decode(this.forks![+key]!.prefix),
            node: this.forks![+key]!.node.readable,
          },
        }),
        {}
      ),
    }
  }

  /// Node type related functions
  /// dirty flag is not necessary to be set

  public isValueType(): boolean {
    if (!this._type) throw PropertyIsUndefined
    const typeMask = this._type & NodeType.value

    return typeMask === NodeType.value
  }

  public isEdgeType(): boolean {
    if (!this._type) throw PropertyIsUndefined
    const typeMask = this._type & NodeType.edge

    return typeMask === NodeType.edge
  }

  public isWithPathSeparatorType(): boolean {
    if (!this._type) throw PropertyIsUndefined
    const typeMask = this._type & NodeType.withPathSeparator

    return typeMask === NodeType.withPathSeparator
  }

  public IsWithMetadataType(): boolean {
    if (!this._type) throw PropertyIsUndefined
    const typeMask = this._type & NodeType.withMetadata

    return typeMask === NodeType.withMetadata
  }

  private makeValue() {
    if (!this._type) this._type = NodeType.value
    this._type |= NodeType.value
  }

  private makeEdge() {
    if (!this._type) this._type = NodeType.edge
    this._type |= NodeType.edge
  }

  private makeWithPathSeparator() {
    if (!this._type) this._type = NodeType.withPathSeparator
    this._type |= NodeType.withPathSeparator
  }

  private makeWithMetadata() {
    if (!this._type) this._type = NodeType.withMetadata
    this._type |= NodeType.withMetadata
  }

  private makeNotWithPathSeparator() {
    if (!this._type) throw PropertyIsUndefined
    this._type = (NodeType.mask ^ NodeType.withPathSeparator) & this._type
  }

  private updateWithPathSeparator(path: Uint8Array) {
    // TODO: it is not clear why the `withPathSeparator` is not related to the first path element -> should get info about it
    // if (new TextDecoder().decode(path).includes(PATH_SEPARATOR)) {
    if (new TextDecoder().decode(path).slice(1).includes(PATH_SEPARATOR)) {
      this.makeWithPathSeparator()
    } else {
      this.makeNotWithPathSeparator()
    }
  }

  /// BL methods

  /**
   *
   * @param path path sting represented in bytes. can be 0 length, then `entry` will be the current node's entry
   * @param entry
   * @param metadata
   * @param storage
   */
  public addFork(path: Uint8Array, entry: BytesReference, metadata: MetadataMapping = {}): void {
    if (path.length === 0) {
      this.entry = entry

      if (Object.keys(metadata).length > 0) {
        this.metadata = metadata
      }
      this.makeDirty()

      return
    }

    if (this.isDirty() && !this.forks) this.forks = {}

    if (!this.forks) throw Error(`Fork mapping is not defined in the manifest`)

    const fork = this.forks[path[0]!]!

    if (!fork) {
      const newNode = new MantarayNode()

      if (this._obfuscationKey) {
        newNode.obfuscationKey = this._obfuscationKey
      }

      if (path.length > nodeForkSizes.prefixMaxSize()) {
        const prefix = path.slice(0, nodeForkSizes.prefixMaxSize())
        const rest = path.slice(nodeForkSizes.prefixMaxSize())
        newNode.addFork(rest, entry, metadata)
        newNode.updateWithPathSeparator(prefix)
        this.forks[path[0]!] = new MantarayFork(prefix, newNode)
        this.makeDirty()
        this.makeEdge()

        return
      }

      newNode.entry = entry

      if (Object.keys(metadata).length > 0) {
        newNode.metadata = metadata
      }

      newNode.updateWithPathSeparator(path)
      this.forks[path[0]!] = new MantarayFork(path, newNode)
      this.makeDirty()
      this.makeEdge()

      return
    }

    const commonPath = common(fork.prefix, path)
    const restPath = fork.prefix.slice(commonPath.length)
    let newNode = fork.node

    if (restPath.length > 0) {
      // move current common prefix node
      newNode = new MantarayNode()
      newNode.obfuscationKey = this._obfuscationKey || (new Uint8Array(32) as Bytes<32>)

      fork.node.updateWithPathSeparator(restPath)
      newNode.forks = {}
      newNode.forks[restPath[0]!] = new MantarayFork(restPath, fork.node)
      newNode.makeEdge()

      // if common path is full path new node is value type
      if (path.length === commonPath.length) {
        newNode.makeValue()
      }
    }

    // NOTE: special case on edge split
    // newNode will be the common path edge node
    // TODO: change it on Bee side! -> newNode is the edge (parent) node of the newly created path, so `commonPath` should be passed instead of `path`
    // newNode.updateWithPathSeparator(path)
    newNode.updateWithPathSeparator(commonPath)
    // newNode's prefix is a subset of the given `path`, here the desired fork will be added with the truncated path
    newNode.addFork(path.slice(commonPath.length), entry, metadata)
    this.forks[path[0]!] = new MantarayFork(commonPath, newNode)
    this.makeEdge()

    this.makeDirty()
  }

  /**
   * Gives back a MantarayFork under the given path
   *
   * @param path valid path within the MantarayNode
   * @returns MantarayFork with the last unique prefix and its node
   * @throws error if there is no node under the given path
   */
  public getForkAtPath(path: Uint8Array): MantarayFork {
    if (path.length === 0) throw EmptyPathError

    if (!this.forks) throw Error(`Fork mapping is not defined in the manifest`)

    const fork = this.forks[path[0]!]

    if (!fork) throw new NotFoundError(path)

    const prefixIndex = findIndexOfArray(path, fork.prefix)

    if (prefixIndex === -1) throw new NotFoundError(path, fork.prefix)

    const rest = path.slice(fork.prefix.length)

    if (rest.length === 0) return fork

    return fork.node.getForkAtPath(rest)
  }

  /**
   * Check if node exists under the given path
   *
   * @param path valid path within the MantarayNode
   * @returns True if exists, false otherwise
   */
  public hasForkAtPath(path: Uint8Array): boolean {
    if (path.length === 0) throw EmptyPathError

    if (!this.forks) return false

    const fork = this.forks[path[0]!]

    if (!fork) return false

    const prefixIndex = findIndexOfArray(path, fork.prefix)

    if (prefixIndex === -1) return false

    const rest = path.slice(fork.prefix.length)

    if (rest.length === 0) return true

    return fork.node.hasForkAtPath(rest)
  }

  /**
   * Get all forks with a path prefix
   * @param prefix path prefix
   * @returns List of forks
   */
  public getNodesWithPrefix(prefix: Uint8Array): MantarayNode[] {
    return getNodesWithPrefixString(this, decodePath(prefix))
  }

  /**
   * Removes a path from the node
   *
   * @param path Uint8Array of the path of the node intended to remove
   */
  public removePath(path: Uint8Array): void {
    if (path.length === 0) throw EmptyPathError

    if (!this.forks) throw Error(`Fork mapping is not defined in the manifest`)

    const fork = this.forks[path[0]!]

    if (!fork) throw new NotFoundError(path)

    const prefixIndex = findIndexOfArray(path, fork.prefix)

    if (prefixIndex === -1) throw new NotFoundError(path, fork.prefix)

    const rest = path.slice(fork.prefix.length)

    if (rest.length === 0) {
      // full path matched
      this.makeDirty()
      delete this.forks[path[0]!]

      return
    }

    fork.node.removePath(rest)
  }

  public async load(storageLoader: StorageLoader, reference: BytesReference): Promise<void> {
    if (!reference) throw Error("Reference is undefined at manifest load")

    await this.recursiveLoad(storageLoader, reference)

    this.contentAddress = reference
  }

  /**
   * Saves dirty flagged ManifestNodes and its forks recursively
   * @returns Reference of the top manifest node.
   */
  public async save(storageSaver: StorageSaver): Promise<BytesReference> {
    const { reference } = await this.recursiveSave(storageSaver)

    return reference
  }

  public isDirty(): boolean {
    return this._contentAddress === undefined
  }

  public makeDirty(): void {
    this._contentAddress = undefined
  }

  public serialize(): Uint8Array {
    if (!this._obfuscationKey) this.obfuscationKey = new Uint8Array(32) as Bytes<32>

    if (!this.forks) {
      if (!this._entry) throw new UndefinedField("entry")
      this.forks = {} //if there were no forks initialized it is not indended to be
    }

    if (!this._entry) this._entry = new Uint8Array(32) as Bytes<32> // at directoties

    /// Header
    const version: MarshalVersion = "0.2"
    const versionBytes: Bytes<31> = serializeVersion(version)
    const referenceLengthBytes: Bytes<1> = serializeReferenceLength(this._entry)

    /// Entry is already in byte version

    /// ForksIndexBytes
    const index = new IndexBytes()
    for (const forkIndex of Object.keys(this.forks)) {
      index.setByte(Number(forkIndex))
    }
    const indexBytes = index.getBytes

    /// Forks
    const forkSerializations: Uint8Array[] = []

    index.forEach(byte => {
      const fork = this.forks![byte]

      if (!fork) throw Error(`Fork indexing error: fork has not found under ${byte} index`)
      forkSerializations.push(fork.serialize())
    })

    const bytes = new Uint8Array([
      ...this._obfuscationKey!,
      ...versionBytes,
      ...referenceLengthBytes,
      ...this._entry,
      ...indexBytes,
      ...flattenBytesArray(forkSerializations),
    ])

    /// Encryption
    /// perform XOR encryption on bytes after obfuscation key
    encryptDecrypt(this._obfuscationKey!, bytes, this._obfuscationKey!.length)

    return bytes
  }

  public deserialize(data: Uint8Array): void {
    const nodeHeaderSize = nodeHeaderSizes.full()

    if (data.length < nodeHeaderSize) {
      throw Error(
        `The serialised input is too short, received = ${data.length}, expected >= ${nodeHeaderSize}`
      )
    }

    this._obfuscationKey = new Uint8Array(
      data.slice(0, nodeHeaderSizes.obfuscationKey)
    ) as Bytes<32>
    // perform XOR decryption on bytes after obfuscation key
    encryptDecrypt(this._obfuscationKey, data, this._obfuscationKey.length)

    const versionHash = data.slice(
      nodeHeaderSizes.obfuscationKey,
      nodeHeaderSizes.obfuscationKey + nodeHeaderSizes.versionHash
    )

    if (equalBytes(versionHash, serializeVersion("0.1"))) throw NotImplemented
    else if (equalBytes(versionHash, serializeVersion("0.2"))) {
      const refBytesSize = data[nodeHeaderSize - 1]!
      let entry = data.slice(nodeHeaderSize, nodeHeaderSize + refBytesSize)

      // FIXME: in Bee. if one uploads a file on the bzz endpoint, the node under `/` gets 0 refsize
      if (refBytesSize === 0) {
        entry = new Uint8Array(32)
      }
      this.entry = entry as BytesReference
      let offset = nodeHeaderSize + refBytesSize
      const indexBytes = data.slice(offset, offset + 32) as Bytes<32>

      // Currently we don't persist the root nodeType when we marshal the manifest, as a result
      // the root nodeType information is lost on Unmarshal. This causes issues when we want to
      // perform a path 'Walk' on the root. If there is at least 1 fork, the root node type
      // is an edge, so we will deduce this information from index byte array
      if (!equalBytes(indexBytes, new Uint8Array(32))) {
        this.makeEdge()
      }
      this.forks = {}
      const indexForks = new IndexBytes()
      indexForks.setBytes = indexBytes
      offset += 32

      indexForks.forEach(byte => {
        let fork: MantarayFork

        if (data.length < offset + nodeForkSizes.nodeType) {
          throw Error(`There is not enough size to read nodeType of fork at offset ${offset}`)
        }

        const nodeType = data.slice(offset, offset + nodeForkSizes.nodeType)
        let nodeForkSize = nodeForkSizes.preReference + refBytesSize

        if (nodeTypeIsWithMetadataType(nodeType[0]!)) {
          if (
            data.length <
            offset + nodeForkSizes.preReference + refBytesSize + nodeForkSizes.metadata
          ) {
            throw Error(`Not enough bytes for metadata node fork at byte ${byte}`)
          }

          const metadataByteSize = fromBigEndian(
            data.slice(offset + nodeForkSize, offset + nodeForkSize + nodeForkSizes.metadata)
          )
          nodeForkSize += nodeForkSizes.metadata + metadataByteSize

          fork = MantarayFork.deserialize(
            data.slice(offset, offset + nodeForkSize),
            this._obfuscationKey!,
            {
              withMetadata: { refBytesSize, metadataByteSize },
            }
          )
        } else {
          if (data.length < offset + nodeForkSizes.preReference + refBytesSize) {
            throw Error(`There is not enough size to read fork at offset ${offset}`)
          }

          fork = MantarayFork.deserialize(
            data.slice(offset, offset + nodeForkSize),
            this._obfuscationKey!
          )
        }

        this.forks![byte] = fork

        offset += nodeForkSize
      })
    } else {
      throw Error("Wrong mantaray version")
    }
  }

  private async recursiveLoad(
    storageLoader: StorageLoader,
    reference: BytesReference
  ): Promise<BytesReference | undefined> {
    const data = await storageLoader(reference)
    this.deserialize(data)

    if (!this.forks) return this._entry

    for (const fork in this.forks) {
      const contentAddress = this.forks[fork]!.node._entry

      if (!contentAddress) throw Error("contentAddress is not defined")

      const entry = await this.forks[fork]!.node.recursiveLoad(storageLoader, contentAddress)

      if (!entry) throw Error("entry is not defined")

      this.forks[fork]!.node.contentAddress = contentAddress
      this.forks[fork]!.node.entry = entry
    }

    return this._entry
  }

  private async recursiveSave(storageSaver: StorageSaver): Promise<RecursiveSaveReturnType> {
    // save forks first recursively
    const savePromises: Promise<RecursiveSaveReturnType>[] = []

    if (!this.forks) this.forks = {} // there were no intention to define fork(s)
    for (const fork of Object.values(this.forks)) {
      savePromises.push(fork.node.recursiveSave(storageSaver))
    }
    const savedReturns = await Promise.all(savePromises)

    if (this._contentAddress && savedReturns.every(v => !v.changed)) {
      return { reference: this._contentAddress, changed: false }
    }

    // save the actual manifest as well
    const data = this.serialize()
    const reference = await storageSaver(data)

    this.contentAddress = reference

    return { reference, changed: true }
  }
}

function nodeTypeIsWithMetadataType(nodeType: number): boolean {
  return (nodeType & NodeType.withMetadata) === NodeType.withMetadata
}

/** Checks for separator character in the node and its descendants prefixes */
export function checkForSeparator(node: MantarayNode): boolean {
  for (const fork of Object.values(node.forks || {})) {
    const pathIncluded = fork.prefix.some(v => v === PATH_SEPARATOR_BYTE)

    if (pathIncluded) return true

    if (checkForSeparator(fork.node)) return true
  }

  return false
}

/**
 * The hash length has to be 31 instead of 32 that comes from the keccak hash function
 */
function serializeVersion(version: MarshalVersion): Bytes<31> {
  const versionName = "mantaray"
  const versionSeparator = ":"
  const hashBytes = keccak256Hash(versionName + versionSeparator + version)

  return hashBytes.slice(0, 31) as Bytes<31>
}

function serializeReferenceLength(entry: BytesReference): Bytes<1> {
  const referenceLength = entry.length

  if (referenceLength !== 32 && referenceLength !== 64) {
    throw new Error(`Wrong referenceLength. It can be only 32 or 64. Got: ${referenceLength}`)
  }
  const bytes = new Uint8Array(1)
  bytes[0] = referenceLength

  return bytes as Bytes<1>
}

/** loads all nodes recursively */
export async function loadAllNodes(
  storageLoader: StorageLoader,
  node: MantarayNode
): Promise<void> {
  if (!node.forks) return

  for (const fork of Object.values(node.forks)) {
    if (fork.node.entry) await fork.node.load(storageLoader, fork.node.entry)
    await loadAllNodes(storageLoader, fork.node)
  }
}

/**
 * Throws an error if the given nodes properties are not equal
 *
 * @param a Mantaray node to compare
 * @param b Mantaray node to compare
 * @param accumulatedPrefix accumulates the prefix during the recursion
 * @throws Error if the two nodes properties are not equal recursively
 */
export const equalNodes = (
  a: MantarayNode,
  b: MantarayNode,
  accumulatedPrefix = ""
): void | never => {
  // node type comparisation
  if (a.type !== b.type) {
    throw Error(
      `Nodes do not have same type at prefix "${accumulatedPrefix}"\na: ${a.type} <-> b: ${b.type}`
    )
  }

  // node metadata comparisation
  if (!a.metadata !== !b.metadata) {
    throw Error(
      `One of the nodes do not have metadata defined. \n a: ${a.metadata} \n b: ${b.metadata}`
    )
  } else if (a.metadata && b.metadata) {
    let aMetadata, bMetadata: string
    try {
      aMetadata = JSON.stringify(a.metadata)
      bMetadata = JSON.stringify(b.metadata)
    } catch (e) {
      throw Error(
        `Either of the nodes has invalid JSON metadata. \n a: ${a.metadata} \n b: ${b.metadata}`
      )
    }

    if (aMetadata !== bMetadata) {
      throw Error(`The node's metadata are different. a: ${aMetadata} \n b: ${bMetadata}`)
    }
  }

  // node entry comparisation
  if (a.entry === b.entry) {
    throw Error(`Nodes do not have same entries. \n a: ${a.entry} \n b: ${a.entry}`)
  }

  if (!a.forks) return

  // node fork comparisation
  const aKeys = Object.keys(a.forks)

  if (!b.forks || aKeys.length !== Object.keys(b.forks).length) {
    throw Error(
      `Nodes do not have same fork length on equality check at prefix ${accumulatedPrefix}`
    )
  }

  for (const key of aKeys) {
    const aFork: MantarayFork = a.forks[Number(key)]!
    const bFork: MantarayFork = b.forks[Number(key)]!
    const prefix = aFork.prefix
    const prefixString = new TextDecoder().decode(prefix)

    if (!equalBytes(prefix, bFork.prefix)) {
      throw Error(
        `Nodes do not have same prefix under the same key "${key}" at prefix ${accumulatedPrefix}`
      )
    }

    equalNodes(aFork.node, bFork.node, accumulatedPrefix + prefixString)
  }
}
