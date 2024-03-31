export const decodeHex = (hex: string): Uint8Array => {
  const result = []
  for (let i = 0; i < hex.length; i += 2) {
    result.push(parseInt(hex.slice(i, i + 2), 16))
  }
  return Uint8Array.from(result)
}
