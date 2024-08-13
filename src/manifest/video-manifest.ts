import type { VideoDetails, VideoPreview } from "@/schemas/video-schema"
import type { Reference } from "@/types/swarm"

export interface Video {
  reference: Reference
  preview: VideoPreview
  details: VideoDetails
}
