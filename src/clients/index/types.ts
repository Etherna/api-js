import type { EthAddress } from ".."
import type { VideoRaw } from "../.."

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
  encryptionKey: string | null
  encryptionType: IndexEncryptionType
  ownerAddress: EthAddress
  ownerIdentityManifest: string
  lastValidManifest: IndexVideoManifest | null
  totDownvotes: number
  totUpvotes: number
}

export type IndexVideoManifest = Omit<VideoRaw & { v: "1.1" }, "createdAt" | "ownerAddress"> & {
  hash: string
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
}

export type IndexVideoComment = {
  creationDateTime: string
  ownerAddress: EthAddress
  ownerIdentityManifest?: string
  text: string
  videoManifestHash: string
}

export type VoteValue = "Up" | "Down" | "Neutral"

export type IndexEncryptionType = "AES256" | "Plain"

export type IndexParameters = {
  commentMaxLength: number
  videoDescriptionMaxLength: number
  videoTitleMaxLength: number
}
