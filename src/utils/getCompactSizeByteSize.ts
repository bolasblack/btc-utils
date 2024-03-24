export class UnsupportedCompactSizeError extends Error {
  cause!: {
    size: bigint
  }

  constructor(size: string | number | bigint) {
    super(`Unsupported var_int size: ${size}`, {
      cause: { size: BigInt(size) },
    })
  }
}

/**
 * Estimate the size of bytes a [Compact Size](https://btcinformation.org/en/glossary/compactsize) will occupy
 */
export const getCompactSizeByteSize = (indicatingByteCount: number): number => {
  /**
   * https://github.com/bitcoin-dot-org/developer.bitcoin.org/blob/813ba3fb5eae85cfdfffe91d12f2df653ea8b725/reference/transactions.rst#compactsize-unsigned-integers
   */

  if (indicatingByteCount < 253) {
    return 1
  } else if (indicatingByteCount < 65535) {
    return 3
  } else if (indicatingByteCount < 4294967295) {
    return 5
  } else if (BigInt(indicatingByteCount) < BigInt("184467440737095521615")) {
    return 9
  } else {
    throw new UnsupportedCompactSizeError(indicatingByteCount)
  }
}
