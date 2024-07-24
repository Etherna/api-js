import { makeChunkedFile } from "@fairdatasociety/bmt-js"
import { immerable } from "immer"

import { MantarayNode as MantarayNodeType } from "../.."
import { Queue } from "../../classes/Queue"
import { MantarayFork, MantarayNode } from "../../handlers/mantaray"
import { beeReference } from "../../schemas/base"
import { imageType } from "../../schemas/image"
import { MantarayNodeSchema } from "../../schemas/mantaray"
import {
  ProfileBuilderSchema,
  ProfileDetailsRawSchema,
  ProfilePreviewRawSchema,
} from "../../schemas/profile"
import { ProfileDeserializer, ProfileSerializer } from "../../serializers"
import { isValidReference } from "../../utils"
import {
  bytesReferenceToReference,
  encodePath,
  EntryMetadataContentTypeKey,
  EntryMetadataFilenameKey,
  getBzzNodeInfo,
  getReferenceFromData,
  isZeroBytesReference,
  jsonToReference,
  referenceToBytesReference,
  RootPath,
  WebsiteIndexDocumentSuffixKey,
  ZeroHashReference,
} from "../../utils/mantaray"

import type { BatchId, BeeClient, EthAddress, Reference } from "../../clients"
import type { BytesReference } from "../../handlers"
import type { ImageRawSource, ImageType } from "../../schemas/image"
import type {
  ProfileDetails,
  ProfileDetailsRaw,
  ProfilePreview,
  ProfilePreviewRaw,
  SerializedProfileBuilder,
} from "../../schemas/profile"

interface ProfileBuilderRequestOptions {
  beeClient: BeeClient
  batchId?: BatchId
  signal?: AbortSignal
}

export const PROFILE_PREVIEW_META_PATH = "preview"
export const PROFILE_DETAILS_META_PATH = "details"

export class ProfileBuilder {
  reference: Reference
  previewMeta: ProfilePreviewRaw
  detailsMeta: ProfileDetailsRaw
  node: MantarayNode

  private queue: Queue

  constructor() {
    this.previewMeta = {
      address: "0x0",
      name: "",
      avatar: null,
      batchId: null,
    }
    this.detailsMeta = {
      description: null,
      cover: null,
      playlists: [],
    }
    this.queue = new Queue()
    this.node = new MantarayNode()
    this.reference = bytesReferenceToReference(ZeroHashReference)

    this.updateNode()
  }

  static Immerable: typeof ProfileBuilder

  static unimmerable(instance: ProfileBuilder): ProfileBuilder {
    const newInstance = new ProfileBuilder()
    newInstance.deserialize(instance.serialize())
    return newInstance
  }

  // methods

  initialize(reference: Reference, previewMeta: ProfilePreview, detailsMeta?: ProfileDetails) {
    this.reference = reference || this.reference
    this.previewMeta = previewMeta
      ? ProfilePreviewRawSchema.parse(
          JSON.parse(new ProfileSerializer().serializePreview(previewMeta)),
        )
      : this.previewMeta
    this.detailsMeta = detailsMeta
      ? ProfileDetailsRawSchema.parse(
          JSON.parse(new ProfileSerializer().serializeDetails(detailsMeta)),
        )
      : this.detailsMeta
    this.previewMeta.address = previewMeta?.address
    this.updateNode()
  }

  async loadNode(opts: ProfileBuilderRequestOptions): Promise<void> {
    if (!isZeroBytesReference(this.reference)) {
      await this.node.load(async (reference) => {
        const data = await opts.beeClient.bytes.download(bytesReferenceToReference(reference), {
          signal: opts.signal,
        })
        return data
      }, referenceToBytesReference(this.reference))
    }

    if (opts.signal?.aborted) return

    const avatarReferences = (this.previewMeta.avatar?.sources ?? [])
      .map((source) => source.reference)
      .filter((ref) => ref && isValidReference(ref)) as Reference[]
    const coverReferences = (this.detailsMeta.cover?.sources ?? [])
      .map((source) => source.reference)
      .filter((ref) => ref && isValidReference(ref)) as Reference[]

    const references = [...avatarReferences, ...coverReferences]

    const bytesReferences = await Promise.all(
      references.map((ref) => getBzzNodeInfo(ref, opts.beeClient, opts.signal)),
    )

    if (opts.signal?.aborted) return

    const mapSource = (type: "avatar" | "cover") => (source: ImageRawSource) => {
      if (source.path) return source

      const referenceIndex = references.findIndex((ref) => ref === source.reference)
      const contentType = bytesReferences[referenceIndex]?.contentType
      const typeParse = imageType.safeParse(contentType?.split("/")[1])
      const imgType = typeParse.success ? typeParse.data : "jpeg"
      const bytesReference = bytesReferences[referenceIndex]?.entry

      if (!bytesReference) {
        throw new Error(`Could not find raw reference for image source: '${source.reference}'`)
      }

      const newSource = this.addImageSource(
        type,
        source.width,
        imgType,
        bytesReferenceToReference(bytesReference),
      )
      return newSource
    }

    if (this.previewMeta.avatar) {
      this.previewMeta.avatar.sources = this.previewMeta.avatar.sources.map(mapSource("avatar"))
    }
    if (this.detailsMeta.cover) {
      this.detailsMeta.cover.sources = this.detailsMeta.cover.sources.map(mapSource("cover"))
    }
  }

  async saveNode(opts: ProfileBuilderRequestOptions): Promise<Reference> {
    const batchId = (this.previewMeta.batchId ?? opts.batchId) as BatchId | undefined

    if (!batchId) throw new Error("BatchId is missing")

    // 1. deserialize with dummy params
    // 2. re-serialize in a raw format
    // validation: raw -> parsed -> raw
    this.previewMeta = JSON.parse(
      new ProfileSerializer().serializePreview(
        new ProfileDeserializer("http://doesntmatter.com").deserializePreview(
          JSON.stringify(this.previewMeta),
          { fallbackBatchId: opts.batchId, reference: this.reference },
        ),
      ),
    ) as ProfilePreviewRaw
    this.detailsMeta = JSON.parse(
      new ProfileSerializer().serializeDetails(
        new ProfileDeserializer("http://doesntmatter.com").deserializeDetails(
          JSON.stringify(this.detailsMeta),
          {
            reference: this.reference,
          },
        ),
      ),
    ) as ProfileDetailsRaw

    this.updateNode()

    this.enqueueData(
      new TextEncoder().encode(JSON.stringify(this.previewMeta)),
      opts.beeClient,
      batchId,
    )
    this.enqueueData(
      new TextEncoder().encode(JSON.stringify(this.detailsMeta)),
      opts.beeClient,
      batchId,
    )

    const reference = await this.node.save(async (data) => {
      return this.enqueueData(data, opts.beeClient, batchId, opts.signal)
    })
    await this.queue.drain()

    this.reference = bytesReferenceToReference(reference)

    return this.reference
  }

  updateName(name: string) {
    this.previewMeta.name = name
    this.updateNode()
  }

  updateBatchId(batchId: BatchId) {
    this.previewMeta.batchId = batchId
    this.updateNode()
  }

  updateDescription(description: string) {
    this.detailsMeta.description = description
    this.updateNode()
  }

  updateBirthday(birthday: string) {
    this.detailsMeta.birthday = birthday
    this.updateNode()
  }

  updateWebsite(website: string) {
    this.detailsMeta.website = website
    this.updateNode()
  }

  updateLocation(location: string) {
    this.detailsMeta.location = location
    this.updateNode()
  }

  addAvatarSource(data: Uint8Array, width: number, type: ImageType) {
    if (!this.previewMeta.avatar) {
      throw new Error("Avatar is missing")
    }

    const source = this.addImageSource("avatar", width, type, getReferenceFromData(data))
    this.previewMeta.avatar.sources.push(source)
  }

  addCoverSource(data: Uint8Array, width: number, type: ImageType) {
    if (!this.detailsMeta.cover) {
      throw new Error("Cover is missing")
    }

    const source = this.addImageSource("cover", width, type, getReferenceFromData(data))
    this.detailsMeta.cover.sources.push(source)
  }

  removeAvatar() {
    for (const source of this.previewMeta.avatar?.sources ?? []) {
      const path = this.getAvatarPath(source.width, source.type)
      this.node.removePath(encodePath(path))
    }
    this.previewMeta.avatar = null
    this.updateNode()
  }

  removeCover() {
    for (const source of this.detailsMeta.cover?.sources ?? []) {
      const path = this.getCoverPath(source.width, source.type)
      this.node.removePath(encodePath(path))
    }
    this.detailsMeta.cover = null
    this.updateNode()
  }

  addPlaylist(rootManifest: Reference) {
    this.detailsMeta.playlists.push(rootManifest)
    this.updateNode()
  }

  removePlaylist(rootManifest: Reference) {
    this.detailsMeta.playlists = this.detailsMeta.playlists.filter(
      (playlist) => playlist !== rootManifest,
    )
    this.updateNode()
  }

  serialize(): SerializedProfileBuilder {
    return {
      reference: this.reference,
      previewMeta: this.previewMeta,
      detailsMeta: this.detailsMeta,
      node: MantarayNodeSchema.parse(this.node.readable),
    }
  }

  deserialize(value: unknown) {
    const model = ProfileBuilderSchema.parse(value)

    this.reference = beeReference.parse(model.reference) as Reference
    this.previewMeta = model.previewMeta
    this.detailsMeta = model.detailsMeta

    const recursiveLoadNode = (node: MantarayNodeType): MantarayNode => {
      const mantarayNode = new MantarayNode()

      if (node.type) {
        mantarayNode.type = node.type
      }
      if (node.entry) {
        mantarayNode.entry = referenceToBytesReference(node.entry as Reference)
      }
      if (node.contentAddress) {
        mantarayNode.contentAddress = referenceToBytesReference(node.contentAddress as Reference)
      }
      if (node.metadata) {
        mantarayNode.metadata = node.metadata
      }
      if (Object.keys(node.forks).length > 0) {
        mantarayNode.forks = Object.entries(node.forks).reduce(
          (acc, [path, value]) => {
            const fork = new MantarayFork(encodePath(value.prefix), recursiveLoadNode(value.node))
            return {
              ...acc,
              [encodePath(path)[0]!]: fork,
            }
          },
          {} as Record<number, MantarayFork>,
        )
      }

      return mantarayNode
    }

    const node = MantarayNodeSchema.parse(model.node)
    this.node = recursiveLoadNode(node)
  }

  // private

  private enqueueData(
    data: Uint8Array,
    beeClient: BeeClient,
    batchId: BatchId,
    signal?: AbortSignal,
  ) {
    const chunkedFile = makeChunkedFile(data)
    this.queue.enqueue(async () => {
      await beeClient.bytes.upload(data, { batchId, signal })
    })
    return chunkedFile.address() as BytesReference
  }

  private addImageSource(
    type: "avatar" | "cover",
    width: number,
    imageType: ImageType,
    entry: Reference,
  ): ImageRawSource {
    const path = this.getImagePath(type, width, imageType)

    this.node.addFork(encodePath(path), referenceToBytesReference(entry), {
      [EntryMetadataContentTypeKey]: `image/${imageType}`,
      [EntryMetadataFilenameKey]: `${type}-${width}.${imageType}`,
    })
    this.updateNode()

    return {
      type: imageType,
      width,
      path,
    }
  }

  private getImagePath(type: "avatar" | "cover", width: number, imageType: ImageType) {
    switch (type) {
      case "avatar":
        return this.getAvatarPath(width, imageType)
      case "cover":
        return this.getCoverPath(width, imageType)
    }
  }

  private getAvatarPath(width: number, type: ImageType) {
    return `avatar/${width}-${type}`
  }

  private getCoverPath(width: number, type: ImageType) {
    return `cover/${width}-${type}`
  }

  private updateNode() {
    this.node.addFork(encodePath(RootPath), ZeroHashReference, {
      [WebsiteIndexDocumentSuffixKey]: PROFILE_PREVIEW_META_PATH,
    })
    this.node.addFork(encodePath(PROFILE_PREVIEW_META_PATH), jsonToReference(this.previewMeta), {
      [EntryMetadataContentTypeKey]: "application/json",
      [EntryMetadataFilenameKey]: `${PROFILE_PREVIEW_META_PATH}.json`,
    })
    this.node.addFork(encodePath(PROFILE_DETAILS_META_PATH), jsonToReference(this.detailsMeta), {
      [EntryMetadataContentTypeKey]: "application/json",
      [EntryMetadataFilenameKey]: `${PROFILE_DETAILS_META_PATH}.json`,
    })
  }
}

class ImmerableProfileBuilder extends ProfileBuilder {
  [immerable] = true
}

ProfileBuilder.Immerable = ImmerableProfileBuilder
