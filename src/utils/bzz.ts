import type { Reference } from "../clients"

export const BZZ_REFERENCE_REGEX = /^[0-9a-f]{64}$/

export const isValidReference = (reference: string): reference is Reference => {
  return BZZ_REFERENCE_REGEX.test(reference)
}

export function getBzzUrl(origin: string, reference: string, path?: string): string {
  const baseReference = (() => {
    if (path && isValidReference(path)) return path
    if (isValidReference(reference)) return reference
    return null
  })()
  const basePath = (() => {
    if (path && isValidReference(path)) return ""
    return path ?? ""
  })()

  if (!baseReference) {
    throw new Error("Provide a valid reference")
  }
  const url = new URL(`/bzz/${baseReference}/${basePath}`, origin)
  // add trailing slash to root to avoid CORS errors due to redirects
  if (!basePath) {
    url.pathname = url.pathname.replace(/\/?$/, "/")
  }
  return url.href
}

export function extractReference(bzzUrl: string): string {
  if (isValidReference(bzzUrl)) return bzzUrl

  const reference = bzzUrl.match(/\/bzz\/([A-Fa-f0-9]{64})/)?.[1]

  if (!reference) {
    throw new Error(`Invalid bzz URL: ${bzzUrl}`)
  }

  return reference
}
