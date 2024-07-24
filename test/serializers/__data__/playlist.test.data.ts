import {
  PlaylistDetails,
  PlaylistDetailsRaw,
  PlaylistPreview,
  PlaylistPreviewRaw,
} from "../../../src"
import { Reference } from "../../../src/clients"

export const password = "test"
export const playlistId = "Channel"
export const playlistOwner = "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485"
export const rootManifest =
  "1fa42c14a91c1fac8985eae48474c86512cf277da8af01a626930975be17c8eb" as Reference

export const testManifestPreview: PlaylistPreviewRaw = {
  id: playlistId,
  name: "",
  type: "public",
  owner: playlistOwner,
  thumb: null,
  createdAt: 1661515209,
  updatedAt: 1661515209,
}

export const testManifestDetails: PlaylistDetailsRaw = {
  description: "My Channel",
  videos: [
    {
      r: "1234567890123456789012345678901234567890123456789012345678901234" as Reference,
      t: "video",
      a: 1661515209,
    },
  ],
}

export const testEncryptedDetails =
  "U2FsdGVkX18/gY38kzPFNcYOy2/83RA4Imen/Di2hGk0LogLZXxkhk8bUcY/YpOoGWOzvgeVnz0vMA6aZX8Te7C9ceP0zyQn62POK41/D8ZqI18qBPSMBK8xT4tgP1QKndVXEr5m/QGUrwWoWcB0o2vkuOpcgFAAQmq5nS2nMnfwVIEgsYNZQQdUQi+mg4Sb9fUZCcoZMyzf6Cf2ZVZnMQ=="

export const testManifestPreviewParsed: PlaylistPreview = {
  rootManifest: rootManifest,
  id: playlistId,
  name: "",
  type: "public",
  owner: playlistOwner,
  thumb: null,
  createdAt: new Date(1661515209 * 1000),
  updatedAt: new Date(1661515209 * 1000),
}

export const testManifestDetailsParsed: PlaylistDetails = {
  name: undefined,
  description: "My Channel",
  videos: [
    {
      reference: "1234567890123456789012345678901234567890123456789012345678901234" as Reference,
      title: "video",
      addedAt: new Date(1661515209 * 1000),
      publishedAt: undefined,
    },
  ],
}
