import { AES, enc } from "crypto-ts"

export function encryptData(data: string, password: string): string {
  try {
    const encryptedData = AES.encrypt(data, password)
    return encryptedData.toString()
  } catch (error: any) {
    throw new Error(`Encryption error: ${error.message}`)
  }
}

export function decryptData(data: string, password: string): string {
  try {
    const decryptedData = AES.decrypt(data, password).toString(enc.Utf8)
    return decryptedData
  } catch (error) {
    throw new Error("Cannot unlock playlist. Make sure the password is correct.")
  }
}
