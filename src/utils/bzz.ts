import type { Reference } from "../clients"

export const isValidReference = (reference: string): reference is Reference => {
  return /^[0-9a-f]{64}$/.test(reference)
}

export function getBzzUrl(origin: string, reference: string, path?: string): string {
  if (!reference || !isValidReference(reference)) {
    throw new Error("Provide a valid reference")
  }
  const url = new URL(`/bzz/${reference}/${path ?? ""}`, origin)
  // add trailing slash to root to avoid CORS errors due to redirects
  if (!path) {
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
