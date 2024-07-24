export function timestampToDate(timestamp: number): Date {
  const date = new Date(timestamp * 1000)
  if (date.getFullYear() > 5000) {
    // most likely a timestamp already in milliseconds
    return new Date(timestamp)
  }
  return date
}

export function dateToTimestamp(date: Date): number {
  const time = date.getTime()
  if (time < 0 || isNaN(time)) {
    return 0
  }
  return Math.floor(date.getTime() / 1000)
}
