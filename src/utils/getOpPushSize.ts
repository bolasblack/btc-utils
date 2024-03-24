export class UnsupportedOPPushSizeError extends Error {
  cause!: {
    size: bigint
  }

  constructor(size: string | number | bigint) {
    super(`Unsupported OP_PUSH size: ${size}`, {
      cause: { size: BigInt(size) },
    })
  }
}

/**
 * Estimate the size of bytes a [OP_PUSH operator](https://en.bitcoin.it/wiki/Script#Constants) will occupy
 */
export const getOpPushSize = (indicatingByteCount: number): number => {
  if (indicatingByteCount <= 75) {
    return 1 // <bytes count>
  } else if (indicatingByteCount <= 255) {
    return 2 // OP_PUSHDATA1 <bytes count>
  } else if (indicatingByteCount <= 65535) {
    return 3 // OP_PUSHDATA2 <bytes count> <bytes count>
  } else if (indicatingByteCount <= 4294967295) {
    return 5 // OP_PUSHDATA4 <bytes count> <bytes count> <bytes count> <bytes count>
  } else {
    throw new UnsupportedOPPushSizeError(indicatingByteCount)
  }
}
