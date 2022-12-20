type VideoMeta = {
  duration: number
  width: number
  height: number
  bitrate: number
}

export function getVideoMeta(data: Uint8Array): Promise<VideoMeta> {
  return new Promise<VideoMeta>((resolve, reject) => {
    const video = document.createElement("video")
    video.preload = "metadata"
    video.onerror = error => {
      reject(error)
    }
    video.onloadedmetadata = () => {
      try {
        window.URL.revokeObjectURL(video.src)
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          bitrate: getBitrate(data.length, video.duration),
        })
      } catch (error: any) {
        reject(error)
      }
    }
    video.src = URL.createObjectURL(new Blob([data], { type: "video/mp4" }))
  })
}

export function getBitrate(size: number, duration: number): number {
  return Math.round((size * 8) / duration)
}
