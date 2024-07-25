import { AES, enc } from "crypto-ts"

/**
 * Encrypts the given data using the provided password.
 *
 * @param data The data to be encrypted.
 * @param password The password used for encryption.
 * @returns The encrypted data as a string.
 */
export function encryptData(data: string, password: string): string {
  try {
    const encryptedData = AES.encrypt(data, password)
    return encryptedData.toString()
  } catch (error) {
    throw new Error(`Encryption error: ${(error as Error).message}`)
  }
}

/**
 * Decrypts the given data using the provided password.
 *
 * @param data The data to be decrypted.
 * @param password The password used for decryption.
 * @returns The decrypted data as a string.
 */
export function decryptData(data: string, password: string): string {
  try {
    const decryptedData = AES.decrypt(data, password).toString(enc.Utf8)
    return decryptedData
  } catch (error) {
    throw new Error("Cannot unlock playlist. Make sure the password is correct.")
  }
}
