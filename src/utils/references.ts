import { beeReference } from "../schemas/base"

import type { Reference } from "../clients"
import type { Video, VideoPreview } from "../schemas/video"

export const EmptyReference = "0".repeat(64) as Reference

export function extractVideoReferences(video: Video | VideoPreview): Reference[] {
  const preview = "preview" in video ? video.preview : video
  const details = "details" in video ? video.details : undefined
  const references = [
    ...(details?.sources ?? [])
      .map(source => (source.type === "mp4" ? source.reference : null))
      .filter(Boolean),
    ...(preview.thumbnail?.sources ?? []).map(source => source.reference).filter(Boolean),
  ] as Reference[]

  if (preview.reference !== "0".repeat(64)) {
    references.push(preview.reference as Reference)
  }

  return references.filter((ref, i, self) => self.indexOf(ref) === i)
}

export function isEmptyReference(ref: Reference): boolean {
  return Array.from(ref).every(char => char === "0")
}

export function isInvalidReference(ref: string): boolean {
  return !beeReference.safeParse(ref).success || isEmptyReference(ref as Reference)
}
