import type { BeeClient, Reference } from "../clients"

export interface WriterOptions {
  beeClient: BeeClient
}

export interface WriterUploadOptions {
  signal?: AbortSignal
  onUploadProgress?(completion: number): void
}

export default abstract class BaseWriter<I> {
  constructor(item: I, opts: WriterOptions) {}

  abstract upload(opts?: WriterUploadOptions): Promise<Reference>
}
