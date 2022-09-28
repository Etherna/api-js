/**
 * Compose a url by host & path
 *
 * @param host Url host
 * @param path Url path
 * @returns Full composed url
 */
export const composeUrl = (host: string, path: string): string => {
  const url = new URL(host)
  url.pathname = path
  return url.toString()
}

/**
 * Convert unsafe url string to a safe version
 * to be used in URL class
 *
 * @param url Url to convert
 * @param path Path to append (optional)
 * @returns The safe URL object
 */
export const safeURL = (url: string | null | undefined, path?: string) => {
  try {
    let baseUrl = url ?? ""
    if (!/https?:\/\//.test(baseUrl)) {
      baseUrl = `https://${baseUrl}`
    }
    return new URL(path ?? "", baseUrl)
  } catch (error: any) {
    return null
  }
}

/**
 * Check if url is safe to use in URL class
 *
 * @param url Url to check
 * @param path Path to append
 * @returns True if safe
 */
export const isSafeURL = (url: string | null | undefined, path?: string) => {
  try {
    let baseUrl = url ?? ""
    if (!/https?:\/\//.test(baseUrl)) {
      baseUrl = `https://${baseUrl}`
    }
    new URL(path ?? "", baseUrl)
    return true
  } catch (error: any) {
    return false
  }
}

/**
 * Get the url origin
 *
 * @param baseUrl Reference url
 * @returns The url origin
 */
export const urlOrigin = (baseUrl: string) => {
  return safeURL(baseUrl)?.origin
}

/**
 * Get the url hostname
 *
 * @param baseUrl Reference url
 * @returns The url hostname
 */
export const urlHostname = (baseUrl: string) => {
  return safeURL(baseUrl)?.hostname
}

/**
 * Get the url href
 *
 * @param baseUrl Reference url
 * @param path Path to append (optional)
 * @returns The url href
 */
export const urlPath = (baseUrl: string, path?: string) => {
  return safeURL(baseUrl, path)?.href
}
