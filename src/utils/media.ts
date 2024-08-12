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

/**
 * Get the HLS video bitrate from resolution
 *
 * @param width Video resolution width
 * @param height Video resolution height
 * @returns The video bitrate
 */
export function getHlsBitrate(width: number, height: number): number {
  const area = width * height
  const bitrateMap = Object.fromEntries(
    [
      [0, 145] as const,
      [234, 145] as const,
      [360, 365] as const,
      [432, 915] as const,
      [540, 2000] as const,
      [720, 3750] as const,
      [1080, 6900] as const,
    ].map(([key, value]) => [(key * key * 16) / 9, value]),
  )

  if (bitrateMap[area]) {
    return bitrateMap[area]
  }

  const mapAreas = Object.keys(bitrateMap)
    .map(Number)
    .sort((a, b) => b - a)

  // if area is bigger than any in table, extend bitrate proportionally with last value
  const maxArea = mapAreas[0] as number
  if (maxArea < area) {
    const maxAreaValue = bitrateMap[maxArea] as number
    return (area * maxAreaValue) / maxArea
  }

  // else, create linear interpolation between prev and next value
  const floorKey = mapAreas.find((k) => k < area) as number
  const ceilingKey = mapAreas.sort((a, b) => a - b).find((k) => k > area) as number

  const ceilingValue = bitrateMap[ceilingKey] as number
  const floorValue = bitrateMap[floorKey] as number

  return ((ceilingValue - floorValue) * (area - floorKey)) / (ceilingKey - floorKey) + floorValue
}
