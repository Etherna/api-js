import type { Video } from "../.."
import type { BeeClient, BatchId, Reference } from "../../clients"
import { VideoSerializer } from "../../serializers"
import BaseWriter from "../../swarm/base-writer"
import type { WriterOptions, WriterUploadOptions } from "../base-writer"

interface VideoWriterOptions extends WriterOptions {
  batchId: BatchId
}

export default class VideoWriter extends BaseWriter<Video> {
  video: Video
  batchId: BatchId
  beeClient: BeeClient

  constructor(video: Video, opts: VideoWriterOptions) {
    super(video, opts)

    this.video = video
    this.batchId = opts.batchId
    this.beeClient = opts.beeClient
  }

  async upload(opts?: WriterUploadOptions): Promise<Reference> {
    const videoRaw = new VideoSerializer().serialize(this.video)
    const { reference } = await this.beeClient.bzz.upload(videoRaw, {
      batchId: this.batchId,
      contentType: "application/json",
      signal: opts?.signal,
      onUploadProgress: opts?.onUploadProgress,
    })
    return reference
  }
}
