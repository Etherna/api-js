import { testImageParsed, testImageRaw } from "./image.test.data"

export const beeUrl = "http://localhost:1633"

export const testProfileRaw_1_0 = {
  address: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  avatar: testImageRaw,
  cover: null,
  description: "Hello",
  name: "Test",
  // birthday: "12-05-1991",
  location: "Italy",
  website: "https://test.me",
}

export const testProfileRaw_1_1 = {
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

export const testProfilePreviewRaw_2 = {
  address: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  avatar: testImageRaw,
  name: "Test",
  batchId: "1234567890123456789012345678901234567890123456789012345678901234",
}

export const testProfileDetailsRaw_2 = {
  cover: null,
  description: "Hello",
  // birthday: "12-05-1991",
  location: "Italy",
  website: "https://test.me",
}

export const testProfilePreviewParsed_1_0 = {
  address: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  avatar: testImageParsed,
  name: "Test",
  batchId: null,
}

export const testProfilePreviewParsed = {
  address: "0xF14ba1B335BdF007aB746005Fb0D3c0149ac3485",
  avatar: testImageParsed,
  name: "Test",
  batchId: "1234567890123456789012345678901234567890123456789012345678901234",
}

export const testProfileDetailsParsed = {
  cover: null,
  description: "Hello",
  // birthday: "12-05-1991",
  location: "Italy",
  website: "https://test.me",
}
