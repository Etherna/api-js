export const splitArrayInChunks = <T>(array: T[], chunkSize: number): T[][] => {
  if (chunkSize < 2) return [array]

  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}
