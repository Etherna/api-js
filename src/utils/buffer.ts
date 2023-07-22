/**
 * Get the array buffer of a file
 *
 * @param file File to convert
 * @returns The array buffer data
 */
export const fileToBuffer = (file: File | Blob) => {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    let fr = new FileReader()
    fr.onload = () => {
      resolve(fr.result as ArrayBuffer)
    }
    fr.onabort = reject
    fr.onerror = reject
    fr.readAsArrayBuffer(file)
  })
}
/**
 * Get the array buffer of a file
 *
 * @param file File to convert
 * @returns The array buffer data
 */
export const fileToUint8Array = async (file: File) => {
  const buffer = await fileToBuffer(file)
  return new Uint8Array(buffer)
}

/**
 * Convert a file to a data URL string
 *
 * @param file File to convert
 * @returns The base64 data URL
 */
export const fileToDataURL = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => {
      resolve(fr.result as string)
    }
    fr.onabort = reject
    fr.onerror = reject
    fr.readAsDataURL(file)
  })
}

/**
 * Convert a buffer to a File object
 *
 * @param buffer Buffer to convert
 * @param contentType Mime type of the array buffer
 * @returns The file object
 */
export const bufferToFile = (buffer: ArrayBuffer, contentType?: string) => {
  return new Blob([buffer], { type: contentType }) as File
}

/**
 * Convert a buffer to a data URL string
 *
 * @param buffer Buffer to convert
 * @returns The base64 data URL
 */
export const bufferToDataURL = (buffer: ArrayBuffer) => fileToDataURL(bufferToFile(buffer))

/**
 * Convert a string to bae64
 *
 * @param str String to convert
 * @returns
 */
export const stringToBase64 = (str: string): string => {
  if (typeof window === "undefined") {
    return Buffer.from(str).toString("base64")
  } else {
    return window.btoa(str)
  }
}

export const buffersEquals = (a: Uint8Array, b: Uint8Array) => {
  return a.length === b.length && a.every((value, index) => value === b[index])
}
