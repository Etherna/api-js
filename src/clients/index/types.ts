import { VideoCaption } from "../../schemas/video"

import type { BatchId, EthAddress, Reference } from ".."
import type { ImageRaw, VideoQuality, VideoSourceRaw } from "../.."

export type PaginatedResult<T> = {
  elements: T[]
  currentPage: number
  maxPage: number
  pageSize: number
  totalElements: number
}

export type IndexUser = {
  address: EthAddress
  creationDateTime: string
  identityManifest: string
}

export type IndexCurrentUser = {
  address: EthAddress
  identityManifest: string
  prevAddresses: EthAddress[]
}

export type IndexUserVideos = IndexUser & {
  videos: IndexVideo[]
}

export type IndexVideo = {
  id: string
  creationDateTime: string
  ownerAddress: EthAddress
  lastValidManifest: IndexVideoManifest | null
  currentVoteValue: VoteValue | null
  totDownvotes: number
  totUpvotes: number
}

export type IndexVideoPreview = {
  id: string
  title: string
  hash: Reference
  duration: number
  ownerAddress: EthAddress
  thumbnail: ImageRaw | null
  createdAt: number
  updatedAt: number
}

export type IndexVideoManifest = Omit<IndexVideoPreview, "id"> & {
  batchId: BatchId | null
  aspectRatio: number | null
  hash: Reference
  description: string | null
  originalQuality: VideoQuality | null
  personalData: string | null
  sources: VideoSourceRaw[]
  captions?: VideoCaption[]
}

export type IndexVideoCreation = {
  id: string
  creationDateTime: string
  encryptionKey: string | null
  encryptionType: IndexEncryptionType
  manifestHash: string
}

export type IndexVideoValidation = {
  errorDetails: Array<{ errorMessage: string; errorNumber: string | number }>
  hash: string
  isValid: boolean | null
  validationTime: string
  videoId: string | null
}

export type IndexVideoComment = {
  id: string
  isFrozen: boolean
  creationDateTime: string
  ownerAddress: EthAddress
  text: string
  lastUpdateDateTime: string
  videoId: string
}

export type VoteValue = "Up" | "Down" | "Neutral"

export type IndexEncryptionType = "AES256" | "Plain"

export type IndexParameters = {
  commentMaxLength: number
  videoDescriptionMaxLength: number
  videoTitleMaxLength: number
}
