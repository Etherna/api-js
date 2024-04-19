import { testImageParsed, testImageRaw } from "./image.test.data"

import type {
  Video,
  VideoDetails,
  VideoDetailsRaw,
  VideoPreview,
  VideoPreviewRaw,
} from "../../../src"

export const beeUrl = "http://localhost:1633"

export const videoReference = "0123456789012345678901234567890123456789012345678901234567890123"

export const testVideoRaw_1_0: VideoPreviewRaw & VideoDetailsRaw & { originalQuality: string } = {
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

export const testVideoRaw_1_1: VideoPreviewRaw & VideoDetailsRaw & { originalQuality: string } = {
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
export const testVideoRawPreview_1_1_2_0: VideoPreviewRaw = {
  title: "test video",
  thumbnail: testImageRaw,
  duration: 120,
  ownerAddress: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  createdAt: 1661515209109,
  updatedAt: null,
  v: "2.0",
}
export const testVideoRawDetails_1_1_2_0: VideoDetailsRaw = {
  description: "test description",
  aspectRatio: null,
  sources: [
    {
      type: "mp4",
      reference: "0123456789012345678901234567890123456789012345678901234567890123",
      quality: "720p",
      size: 12345,
      bitrate: 12,
    },
  ],
  batchId: "0123456789012345678901234567890123456789012345678901234567890123",
}

export const testVideoIndex: VideoPreviewRaw & VideoDetailsRaw & { originalQuality: string } = {
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

export const testVideoPreviewRaw_2_0: VideoPreviewRaw = {
  title: "test video",
  thumbnail: testImageRaw,
  duration: 120,
  ownerAddress: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  createdAt: 1661515209109,
  updatedAt: 1661515209109,
  v: "2.0",
}
export const testVideoDetailsRaw_2_0: VideoDetailsRaw = {
  description: "test description",
  aspectRatio: 1.7777777777777777,
  sources: [
    {
      type: "dash",
      path: "dash/manifest.mpd",
      size: 0,
    },
  ],
  batchId: "0123456789012345678901234567890123456789012345678901234567890123",
}

export const testVideoPreviewParsed_1_0: VideoPreview = {
  v: "1.0",
  reference: videoReference,
  title: "test video",
  thumbnail: null,
  duration: 120,
  ownerAddress: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  createdAt: 1661515209109,
  updatedAt: null,
}
export const testVideoDetailsParsed_1_0: VideoDetails = {
  description: "test description",
  aspectRatio: null,
  sources: [
    {
      type: "mp4",
      reference: "0123456789012345678901234567890123456789012345678901234567890123",
      quality: "720p",
      size: 12345,
      bitrate: 12,
      url: "http://localhost:1633/bzz/0123456789012345678901234567890123456789012345678901234567890123/",
    },
  ],
  batchId: null,
}

export const testVideoPreviewParsed_1_1: VideoPreview = {
  v: "1.1",
  reference: videoReference,
  title: "test video",
  thumbnail: testImageParsed,
  duration: 120,
  ownerAddress: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  createdAt: 1661515209109,
  updatedAt: null,
}
export const testVideoDetailsParsed_1_1: VideoDetails = {
  description: "test description",
  aspectRatio: null,
  sources: [
    {
      type: "mp4",
      reference: "0123456789012345678901234567890123456789012345678901234567890123",
      quality: "720p",
      size: 12345,
      bitrate: 12,
      url: "http://localhost:1633/bzz/0123456789012345678901234567890123456789012345678901234567890123/",
    },
  ],
  batchId: "0123456789012345678901234567890123456789012345678901234567890123",
}

export const testVideoPreviewIndexParsed: VideoPreview = {
  v: "1.0", // since no versione is returned, we assume 1.0
  reference: videoReference,
  title: "test video",
  thumbnail: testImageParsed,
  duration: 120,
  ownerAddress: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  createdAt: 1661515209109,
  updatedAt: null,
}
export const testVideoDetailsIndexParsed: VideoDetails = {
  description: "test description",
  aspectRatio: null,
  personalData: undefined,
  sources: [
    {
      type: "mp4",
      reference: "0123456789012345678901234567890123456789012345678901234567890123",
      quality: "720p",
      size: 12345,
      bitrate: 12,
      url: "http://localhost:1633/bzz/0123456789012345678901234567890123456789012345678901234567890123/",
    },
  ],
  batchId: "0123456789012345678901234567890123456789012345678901234567890123",
}

export const testVideoPreviewParsed_1_1_2_0: VideoPreview = {
  v: "1.1",
  reference: videoReference,
  title: "test video",
  thumbnail: testImageParsed,
  duration: 120,
  ownerAddress: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  createdAt: 1661515209109,
  updatedAt: null,
}
export const testVideoDetailsParsed_1_1_2_0: VideoDetails = {
  description: "test description",
  aspectRatio: null,
  sources: [
    {
      type: "mp4",
      reference: "0123456789012345678901234567890123456789012345678901234567890123",
      quality: "720p",
      size: 12345,
      bitrate: 12,
      url: "http://localhost:1633/bzz/0123456789012345678901234567890123456789012345678901234567890123/",
    },
  ],
  batchId: "0123456789012345678901234567890123456789012345678901234567890123",
}

export const testVideoPreviewParsed_2_0: VideoPreview = {
  v: "2.0",
  reference: videoReference,
  title: "test video",
  thumbnail: testImageParsed,
  duration: 120,
  ownerAddress: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  createdAt: 1661515209109,
  updatedAt: 1661515209109,
}
export const testVideoDetailsParsed_2_0: VideoDetails = {
  description: "test description",
  aspectRatio: 1.7777777777777777,
  sources: [
    {
      type: "dash",
      path: "dash/manifest.mpd",
      url: "http://localhost:1633/bzz/0123456789012345678901234567890123456789012345678901234567890123/dash/manifest.mpd",
      size: 0,
      isAudio: false,
      isMaster: true,
    },
  ],
  batchId: "0123456789012345678901234567890123456789012345678901234567890123",
}
