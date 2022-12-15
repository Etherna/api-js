import { testImageParsed, testImageRaw } from "./image.test.data"

import type { Profile, ProfileRaw } from "../../../src"

export const beeUrl = "http://localhost:1633"

export const testProfileRaw_1_0: ProfileRaw = {
  address: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  avatar: testImageRaw,
  cover: null,
  description: "Hello",
  name: "Test",
  // birthday: "12-05-1991",
  location: "Italy",
  website: "https://test.me",
}

export const testProfileRaw_1_1: ProfileRaw = {
  address: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  avatar: testImageRaw,
  cover: null,
  description: "Hello",
  name: "Test",
  // birthday: "12-05-1991",
  location: "Italy",
  website: "https://test.me",
  batchId: "1234567890123456789012345678901234567890123456789012345678901234",
}

export const testProfileParsed: Profile = {
  address: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  avatar: testImageParsed,
  cover: null,
  description: "Hello",
  name: "Test",
  // birthday: "12-05-1991",
  location: "Italy",
  website: "https://test.me",
  batchId: "1234567890123456789012345678901234567890123456789012345678901234",
}
