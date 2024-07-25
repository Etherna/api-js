interface VideoMeta {
  duration: number
  width: number
  height: number
  bitrate: number
}

/**
 * Get the video metadata
 *
 * @param data The video bytes
 * @returns The video metadata
 */
export function getVideoMeta(data: Uint8Array): Promise<VideoMeta> {
  return new Promise<VideoMeta>((resolve, reject) => {
    const video = document.createElement("video")
    video.preload = "metadata"
    video.onerror = (error) => {
      reject(error)
    }
    video.onloadedmetadata = () => {
      try {
        window.URL.revokeObjectURL(video.src)
      } catch {}

      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        bitrate: getBitrate(data.length, video.duration),
      })
    }
    video.src = URL.createObjectURL(new Blob([data], { type: "video/mp4" }))
  })
}

/**
 * Get the video bitrate
 *
 * @param size Video size in bytes
 * @param duration Video duration in seconds
 * @returns The video bitrate
 */
export function getBitrate(size: number, duration: number): number {
  return Math.round((size * 8) / duration)
}
