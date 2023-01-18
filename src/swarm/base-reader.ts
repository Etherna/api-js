import type { BeeClient } from "../clients"

export interface ReaderOptions {
  beeClient: BeeClient
}

export interface ReaderDownloadOptions {
  maxResponseSize?: number
  signal?: AbortSignal
  onDownloadProgress?(completion: number): void
}

export default abstract class BaseReader<T, I, R = unknown> {
  constructor(identifier: I, opts: ReaderOptions) {}

  abstract download(opts?: ReaderDownloadOptions): Promise<T>

  public rawResponse: R | undefined
}
