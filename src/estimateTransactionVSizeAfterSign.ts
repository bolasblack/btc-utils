import { sum } from "./utils/sum"
import { getCompactSizeByteSize } from "./utils/getCompactSizeByteSize"
import { getOpPushSize } from "./utils/getOpPushSize"

export class UnsupportedInputTypeError extends Error {
  cause!: EstimationInput

  constructor(input: EstimationInput) {
    super(`Unsupported input type: ${input.addressType}`, {
      cause: input,
    })
  }
}

/**
 * https://github.com/bitcoin/bitcoin/blob/2ffaa927023f5dc2a7b8d6cfeb4f4810e573b18c/src/consensus/consensus.h#L21
 */
export const WITNESS_SCALE_FACTOR = 4

export const estimateTransactionVSizeAfterSign = (txBeforeSign: {
  inputs: EstimationInput[]
  outputs: EstimationOutput[]
}): number => {
  /**
   * Witness Upgraded Bitcoin Transaction Structure:
   *     * https://github.com/bitcoin/bips/blob/b3701faef2bdb98a0d7ace4eedbeefa2da4c89ed/bip-0141.mediawiki#transaction-id
   *
   * Traditional Bitcoin Transaction Structure:
   *     * https://developer.bitcoin.org/reference/transactions.html#txin-a-transaction-input-non-coinbase
   *     * (backup) https://github.com/bitcoin-dot-org/developer.bitcoin.org/blob/813ba3fb5eae85cfdfffe91d12f2df653ea8b725/reference/transactions.rst#txin-a-transaction-input-non-coinbase
   */

  const hasWitnessData = txBeforeSign.inputs.some(
    EstimationInput.isHasWitnessData,
  )

  const inputEstimationResults = txBeforeSign.inputs.map(
    estimateInputVSizeAfterSign,
  )

  const inputsSize = sum(...inputEstimationResults.map(s => s.inputSize))

  const outputsSize = sum(
    ...txBeforeSign.outputs.map(estimateOutputVSizeAfterSign),
  )

  if (hasWitnessData) {
    const witnessDataSize = sum(
      ...inputEstimationResults.map(s => s.witnessDataSize),
    )
    return Math.ceil(
      sum(
        4, // nVersion
        1 / WITNESS_SCALE_FACTOR, // marker
        1 / WITNESS_SCALE_FACTOR, // flag
        getCompactSizeByteSize(txBeforeSign.inputs.length), // vin count size
        inputsSize, // vins
        getCompactSizeByteSize(txBeforeSign.outputs.length), // vout count size
        outputsSize, // vouts
        witnessDataSize / WITNESS_SCALE_FACTOR, // witness data (with witness data discount)
        4, // nLocktime
      ),
    )
  } else {
    return Math.ceil(
      sum(
        4, // nVersion
        getCompactSizeByteSize(txBeforeSign.inputs.length), // vin count size
        inputsSize, // vins
        getCompactSizeByteSize(txBeforeSign.outputs.length), // vout count size
        outputsSize, // vouts
        4, // nLocktime
      ),
    )
  }
}

export interface EstimationOutput {
  scriptPubKey: Uint8Array
}
export const estimateOutputVSizeAfterSign = (
  output: EstimationOutput,
): number => {
  /**
   * https://developer.bitcoin.org/reference/transactions.html#txout-a-transaction-output
   */

  return sum(
    8, // output value
    getCompactSizeByteSize(output.scriptPubKey.length),
    output.scriptPubKey.length,
  )
}

export type EstimationInput =
  | EstimationInput.P2PKH
  | EstimationInput.P2SH
  | EstimationInput.P2WPKH
  | EstimationInput.P2WSH
  | EstimationInput.P2TR
  | EstimationInput.P2TRScript
export namespace EstimationInput {
  interface Basic {
    txId: string
    index: number
  }

  export interface P2PKH extends Basic {
    addressType: "p2pkh"
    isPublicKeyCompressed: boolean
  }

  export interface P2SH extends Basic {
    addressType: "p2sh"
    redeemScript: Uint8Array
    redeemScriptArgumentByteLengths: number[]
    witnessDataByteLengths?: number[]
  }

  export interface P2WPKH extends Basic {
    addressType: "p2wpkh"
  }

  export interface P2WSH extends Basic {
    addressType: "p2wsh"
    witnessScript: Uint8Array
    witnessScriptArgumentByteLength: number[]
  }

  export interface P2TR extends Basic {
    addressType: "p2tr"
    tapInternalKey: Uint8Array
  }

  export interface P2TRScript extends Basic {
    addressType: "p2tr-leafScript"
    tapLeafScriptByteLength: number
    tapLeafScriptArgumentByteLengths: number[]
  }

  export function isHasWitnessData(utxo: EstimationInput): boolean {
    switch (utxo.addressType) {
      case "p2pkh":
        return false
      case "p2sh":
        return utxo.witnessDataByteLengths != null
      case "p2wpkh":
      case "p2wsh":
      case "p2tr":
      case "p2tr-leafScript":
        return true
      default:
        throw new UnsupportedInputTypeError(utxo)
    }
  }
}

export const estimateInputVSizeAfterSign = (
  input: EstimationInput,
): {
  inputSize: number
  witnessDataSize: number
} => {
  /**
   * Witness Upgraded Bitcoin Transaction Structure:
   *     * https://github.com/bitcoin/bips/blob/b3701faef2bdb98a0d7ace4eedbeefa2da4c89ed/bip-0141.mediawiki#transaction-id
   *
   * Traditional Bitcoin Transaction Structure:
   *     * https://developer.bitcoin.org/reference/transactions.html#txin-a-transaction-input-non-coinbase
   *     * (backup) https://github.com/bitcoin-dot-org/developer.bitcoin.org/blob/813ba3fb5eae85cfdfffe91d12f2df653ea8b725/reference/transactions.rst#txin-a-transaction-input-non-coinbase
   */

  const previousOutputTxidSlotSize = 32
  const previousOutputIndexSlotSize = 4
  let scriptBytesSlotSize = 0
  let signatureScriptSlotSize = 0
  let witnessDataSlotSize = 0
  const sequenceSlotSize = 4

  switch (input.addressType) {
    case "p2pkh": {
      /**
       * scriptSig for p2pkh usually like:
       *
       * OP_PUSHBYTES_N0 <sig> OP_PUSHBYTES_N1 <pubkey>
       */
      signatureScriptSlotSize = estimatePublicKeyScriptVSize(
        input.isPublicKeyCompressed,
      )

      scriptBytesSlotSize = getCompactSizeByteSize(signatureScriptSlotSize)
      break
    }
    case "p2sh": {
      /**
       * scriptSig for p2sh usually like:
       *
       * OP_PUSHBYTES_N0... <arg1> OP_PUSHBYTES_N1... <arg2> ... OP_PUSHBYTES_Nn <redeem-script>
       */
      signatureScriptSlotSize = sum(
        ...(input.redeemScriptArgumentByteLengths.length === 0
          ? []
          : [
              // args length bytes
              ...input.redeemScriptArgumentByteLengths.map(getOpPushSize),
              // args bytes
              ...input.redeemScriptArgumentByteLengths,
            ]),

        // redeem script length byte
        getOpPushSize(input.redeemScript.length),
        // redeem script bytes
        input.redeemScript.length,
      )

      scriptBytesSlotSize = getCompactSizeByteSize(signatureScriptSlotSize)

      if (input.witnessDataByteLengths != null) {
        witnessDataSlotSize = sum(
          // byte to indicate the witness stack item count
          getCompactSizeByteSize(1),

          // item length bytes
          ...input.witnessDataByteLengths.map(getCompactSizeByteSize),
          ...input.witnessDataByteLengths,
        )
      }
      break
    }
    case "p2wpkh": {
      /**
       * @see https://github.com/bitcoin/bips/blob/b3701faef2bdb98a0d7ace4eedbeefa2da4c89ed/bip-0141.mediawiki#p2wpkh
       */

      /**
       * scriptSig for p2wpkh will always be empty
       */
      signatureScriptSlotSize = 0
      scriptBytesSlotSize = getCompactSizeByteSize(signatureScriptSlotSize)

      /**
       * witness for p2wpkh is basically the scriptSig of p2pkh
       */
      witnessDataSlotSize = sum(
        // byte to indicate the witness stack item count
        getCompactSizeByteSize(1),
        // item 1
        estimatePublicKeyScriptVSize(true),
      )
      break
    }
    case "p2wsh": {
      /**
       * @see https://github.com/bitcoin/bips/blob/b3701faef2bdb98a0d7ace4eedbeefa2da4c89ed/bip-0141.mediawiki#p2wsh
       */

      /**
       * scriptSig for p2wsh will always be empty
       */
      signatureScriptSlotSize = 0
      scriptBytesSlotSize = getCompactSizeByteSize(signatureScriptSlotSize)

      /**
       * witness for p2wsh usually like:
       *
       * <arg1-length> <arg1> <arg2-length> <arg2> ... <witness-script-length> <witness-script>
       */
      witnessDataSlotSize = sum(
        // byte to indicate the witness stack item count
        getCompactSizeByteSize(
          input.witnessScriptArgumentByteLength.length + 1,
        ),

        ...(input.witnessScriptArgumentByteLength.length === 0
          ? []
          : [
              // item 1...n
              // args length bytes
              ...input.witnessScriptArgumentByteLength.map(
                getCompactSizeByteSize,
              ),
              // args bytes
              ...input.witnessScriptArgumentByteLength,
            ]),

        // witness script length byte
        getCompactSizeByteSize(input.witnessScript.length),
        // witness script bytes
        input.witnessScript.length,
      )
      break
    }
    case "p2tr": {
      /**
       * scriptSig for p2tr will always be empty
       */
      signatureScriptSlotSize = 0
      scriptBytesSlotSize = getCompactSizeByteSize(signatureScriptSlotSize)

      const schnorrSignatureSize = 65 // or 64, determined by the sighash type
      witnessDataSlotSize = sum(
        // byte to indicate the witness stack item count
        getCompactSizeByteSize(1),
        // item 1
        getCompactSizeByteSize(schnorrSignatureSize),
        schnorrSignatureSize,
      )
      break
    }
    case "p2tr-leafScript": {
      /**
       * scriptSig for p2tr will always be empty
       */
      signatureScriptSlotSize = 0
      scriptBytesSlotSize = getCompactSizeByteSize(signatureScriptSlotSize)

      /**
       * tap leaf script usually like:
       *
       * <arg1-length> <arg1> <arg2-length> <arg2> ... <tapleaf-script-length> <tapleaf-script>
       */
      witnessDataSlotSize = sum(
        // byte to indicate the witness stack item count
        getCompactSizeByteSize(
          input.tapLeafScriptArgumentByteLengths.length + 1,
        ),

        ...(input.tapLeafScriptArgumentByteLengths.length === 0
          ? []
          : [
              // item 1...n
              // tap leaf script argument length bytes
              ...input.tapLeafScriptArgumentByteLengths.map(
                getCompactSizeByteSize,
              ),
              // tap leaf script argument bytes
              ...input.tapLeafScriptArgumentByteLengths,
            ]),

        // item n
        // tap leaf script length byte
        getCompactSizeByteSize(input.tapLeafScriptByteLength),
        // tap leaf script bytes
        input.tapLeafScriptByteLength,
      )
      break
    }
    default:
      throw new UnsupportedInputTypeError(input)
  }

  return {
    inputSize: sum(
      previousOutputTxidSlotSize,
      previousOutputIndexSlotSize,
      scriptBytesSlotSize,
      signatureScriptSlotSize,
      sequenceSlotSize,
    ),
    witnessDataSize: witnessDataSlotSize,
  }
}

/**
 * Estimate byte size of a public key script, the public key script is usually
 * looks like:
 *
 *     OP_PUSHBYTES_N0 <sig> OP_PUSHBYTES_N1 <pubkey>
 *
 * @param isPublicKeyCompressed whether the public key is compressed or not
 * @returns the byte size of the public key script
 */
export const estimatePublicKeyScriptVSize = (
  isPublicKeyCompressed: boolean,
): number => {
  /**
   * DER encoded secp256k1 signature
   *
   * * DER encoding: https://github.com/bitcoin/bips/blob/b3701faef2bdb98a0d7ace4eedbeefa2da4c89ed/bip-0066.mediawiki
   * * Sighash Type: https://btcinformation.org/en/developer-guide#signature-hash-types
   */
  const sigLength = 72 // (8 ~ 71) + 1 (sighash type)

  const publicKeyLength = isPublicKeyCompressed ? 33 : 65

  return sum(
    getOpPushSize(sigLength),
    sigLength,
    getOpPushSize(publicKeyLength),
    publicKeyLength,
  )
}
