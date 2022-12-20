export function fromHexString(hexString: string): Uint8Array {
  const matches = hexString.match(/.{1,2}/g)
  if (!matches) {
    throw Error(`Invalid hex string: ${hexString}`)
  }
  return Uint8Array.from(matches.map(byte => parseInt(byte, 16)))
}

export function toHexString(bytes: Uint8Array): string {
  return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "")
}
