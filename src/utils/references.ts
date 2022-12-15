import { extractReference } from "./bzz"

import type { Reference } from "../clients"
import type { Video } from "../schemas/video"

export function extractVideoReferences(video: Video): Reference[] {
  const thumbnailSources = Object.values(video.thumbnail?.sources ?? {}) as string[]
  const references = [
    video.reference,
    ...video.sources
      .map(source => (source.type === "mp4" ? source.reference : null))
      .filter(Boolean),
    ...thumbnailSources.map(src => extractReference(src)),
  ] as Reference[]

  if (video.reference !== "0".repeat(64)) {
    references.push(video.reference as Reference)
  }

  return references
}
