import type { Video, VideoRaw } from "../../../src"
import { testImageParsed, testImageRaw } from "./image.test.data"

export const beeUrl = "http://localhost:1633"

export const videoReference = "0123456789012345678901234567890123456789012345678901234567890123"

export const testVideoRaw_1_0: VideoRaw = {
  title: "test video",
  description: "test description",
  thumbnail: null,
  duration: 120,
  ownerAddress: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  originalQuality: "720p",
  createdAt: 1661515209109,
  sources: [
    {
      reference: "0123456789012345678901234567890123456789012345678901234567890123",
      quality: "720p",
      size: 12345,
      bitrate: 12,
    },
  ],
  v: "1.0",
}

export const testVideoRaw_1_1: VideoRaw = {
  title: "test video",
  description: "test description",
  thumbnail: testImageRaw,
  duration: 120,
  ownerAddress: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  originalQuality: "720p",
  createdAt: 1661515209109,
  updatedAt: null,
  sources: [
    {
      reference: "0123456789012345678901234567890123456789012345678901234567890123",
      quality: "720p",
      size: 12345,
      bitrate: 12,
    },
  ],
  batchId: "0123456789012345678901234567890123456789012345678901234567890123",
  v: "1.1",
}

export const testVideoIndex: VideoRaw = {
  title: "test video",
  description: "test description",
  thumbnail: testImageRaw,
  duration: 120,
  ownerAddress: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  originalQuality: "720p",
  createdAt: 1661515209109,
  sources: [
    {
      reference: "0123456789012345678901234567890123456789012345678901234567890123",
      quality: "720p",
      size: 12345,
      bitrate: 12,
    },
  ],
  batchId: "0123456789012345678901234567890123456789012345678901234567890123",
}

export const testVideoParsed_1_0: Video = {
  reference: videoReference,
  title: "test video",
  description: "test description",
  thumbnail: null,
  duration: 120,
  ownerAddress: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  originalQuality: "720p",
  createdAt: 1661515209109,
  updatedAt: null,
  sources: [
    {
      reference: "0123456789012345678901234567890123456789012345678901234567890123",
      quality: "720p",
      size: 12345,
      bitrate: 12,
      source:
        "http://localhost:1633/bzz/0123456789012345678901234567890123456789012345678901234567890123",
    },
  ],
  batchId: null,
}

export const testVideoParsed_1_1: Video = {
  reference: videoReference,
  title: "test video",
  description: "test description",
  thumbnail: testImageParsed,
  duration: 120,
  ownerAddress: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  originalQuality: "720p",
  createdAt: 1661515209109,
  updatedAt: null,
  sources: [
    {
      reference: "0123456789012345678901234567890123456789012345678901234567890123",
      quality: "720p",
      size: 12345,
      bitrate: 12,
      source:
        "http://localhost:1633/bzz/0123456789012345678901234567890123456789012345678901234567890123",
    },
  ],
  batchId: "0123456789012345678901234567890123456789012345678901234567890123",
}

export const testVideoIndexParsed: Video = {
  reference: videoReference,
  title: "test video",
  description: "test description",
  thumbnail: testImageParsed,
  duration: 120,
  ownerAddress: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  originalQuality: "720p",
  createdAt: 1661515209109,
  updatedAt: null,
  sources: [
    {
      reference: "0123456789012345678901234567890123456789012345678901234567890123",
      quality: "720p",
      size: 12345,
      bitrate: 12,
      source:
        "http://localhost:1633/bzz/0123456789012345678901234567890123456789012345678901234567890123",
    },
  ],
  batchId: "0123456789012345678901234567890123456789012345678901234567890123",
}
