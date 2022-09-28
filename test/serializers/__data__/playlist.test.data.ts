import type { Playlist, PlaylistEncryptedDataRaw, PlaylistRaw } from "../../../src"
import { encryptData } from "../../../src/utils"

export const password = "test"

export const testManifest: PlaylistRaw = {
  v: "1.0"
  id: "__channel",
  name: "",
  description: null,
  type: "public",
  owner: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  createdAt: 1661515209109,
  updatedAt: 1661515209109,
  videos: [
    {
      r: "1234567890123456789012345678901234567890123456789012345678901234",
      t: "video",
      a: 1661515209109,
    },
  ],
}

export const testPrivateData: PlaylistEncryptedDataRaw = {
  description: "Whaat?",
  videos: testManifest.videos,
}

export const testEncryptedData = encryptData(JSON.stringify(testPrivateData), password)

export const testPrivateManifest: PlaylistRaw = {
  id: "__channel",
  name: "You can't see me",
  type: "private",
  owner: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  createdAt: 1661515209109,
  updatedAt: 1661515209109,
  encryptedData: testEncryptedData,
}

export const testManifestParsed: Playlist = {
  reference: "1234567890123456789012345678901234567890123456789012345678901234",
  id: "__channel",
  name: "",
  description: null,
  type: "public",
  owner: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  createdAt: 1661515209109,
  updatedAt: 1661515209109,
  videos: [
    {
      reference: "1234567890123456789012345678901234567890123456789012345678901234",
      title: "video",
      addedAt: 1661515209109,
    },
  ],
}

export const testPrivateManifestParsed: Playlist = {
  reference: "1234567890123456789012345678901234567890123456789012345678901234",
  id: "__channel",
  name: "You can't see me",
  description: "Whaat?",
  type: "private",
  owner: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  createdAt: 1661515209109,
  updatedAt: 1661515209109,
  encryptedData: testEncryptedData,
  videos: testManifestParsed.videos,
}
