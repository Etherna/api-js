import type { Reference } from "../clients"
import type { Video } from "../schemas/video"

export function extractVideoReferences(video: Video): Reference[] {
  const references = [
    video.preview.reference,
    ...(video.details?.sources ?? [])
      .map(source => (source.type === "mp4" ? source.reference : null))
      .filter(Boolean),
    ...(video.preview.thumbnail?.sources ?? []).map(source => source.reference).filter(Boolean),
  ] as Reference[]

  if (video.preview.reference !== "0".repeat(64)) {
    references.push(video.preview.reference as Reference)
  }

  return references
}
