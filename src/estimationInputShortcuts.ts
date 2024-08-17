import {
  estimatePublicKeyScriptVSize,
  EstimationInput,
} from "./estimateTransactionVSizeAfterSign"
import { getOpPushSize } from "./utils/getOpPushSize"
import { range } from "./utils/range"
import { sum } from "./utils/sum"

export const p2pkh = (info: {
  isPublicKeyCompressed?: boolean
}): EstimationInput.P2PKH => ({
  addressType: "p2pkh",
  isPublicKeyCompressed: info.isPublicKeyCompressed ?? true,
})

export const p2sh_p2wpkh = (): EstimationInput.P2SH => ({
  addressType: "p2sh",
  /**
   * @see https://github.com/bitcoin/bips/blob/b3701faef2bdb98a0d7ace4eedbeefa2da4c89ed/bip-0141.mediawiki#p2wpkh-nested-in-bip16-p2sh
   */
  redeemScript: new Uint8Array(
    sum(1 /* 0 */, 1 /* OP_PUSHBYTES_20 */, 20 /* 20-byte-key-hash */),
  ),
  redeemScriptArgumentByteLengths: [],
  witnessDataByteLengths: [
    estimatePublicKeyScriptVSize(true).signatureLength,
    estimatePublicKeyScriptVSize(true).publicKeyLength,
  ],
})

export const p2sh_multisig = (info: {
  minimumSignatureCount: number
  compressedPublicKeyCount: number
  uncompressedPublicKeyCount?: number
}): EstimationInput.P2SH => ({
  addressType: "p2sh",
  redeemScript: (function () {
    return new Uint8Array(
      sum(
        1 /* OP_M */,
        ...range(0, info.compressedPublicKeyCount).flatMap(() => {
          const size = estimatePublicKeyScriptVSize(true)
          return [
            getOpPushSize(size.publicKeyLength) /* OP_PUSHBYTES_X */,
            size.publicKeyLength /* <public-key> */,
          ]
        }),
        ...range(0, info.uncompressedPublicKeyCount ?? 0).flatMap(() => {
          const size = estimatePublicKeyScriptVSize(false)
          return [
            getOpPushSize(size.publicKeyLength) /* OP_PUSHBYTES_X */,
            size.publicKeyLength /* <public-key> */,
          ]
        }),
        1 /* OP_N */,
        1 /* OP_CHECKMULTISIG */,
      ),
    )
  })(),
  redeemScriptArgumentByteLengths: [
    1 /* OP_0 */,
    /* signatures */
    ...range(0, info.minimumSignatureCount).map(
      () => estimatePublicKeyScriptVSize(true).signatureLength,
    ),
  ],
})

export const p2wpkh = (): EstimationInput.P2WPKH => ({
  addressType: "p2wpkh",
})

export const p2wsh_multisig = (info: {
  minimumSignatureCount: number
  compressedPublicKeyCount: number
  uncompressedPublicKeyCount?: number
}): EstimationInput.P2WSH => {
  const { redeemScript } = p2sh_multisig(info)

  return {
    addressType: "p2wsh",
    witnessScript: redeemScript,
    witnessScriptArgumentByteLength: [
      0 /* empty witness stack item */,
      /* signatures */
      ...range(0, info.minimumSignatureCount).map(
        () => estimatePublicKeyScriptVSize(true).signatureLength,
      ),
    ],
  }
}

export const p2sh_p2wsh_multisig = (info: {
  minimumSignatureCount: number
  compressedPublicKeyCount: number
  uncompressedPublicKeyCount?: number
}): EstimationInput.P2SH => {
  const p2wshRes = p2wsh_multisig(info)

  return {
    addressType: "p2sh",
    /**
     * @see https://github.com/bitcoin/bips/blob/b3701faef2bdb98a0d7ace4eedbeefa2da4c89ed/bip-0141.mediawiki#p2wsh-nested-in-bip16-p2sh
     */
    redeemScript: new Uint8Array(
      sum(1 /* 0 */, 1 /* OP_PUSHBYTES_32 */, 32 /* <32-byte-key-hash> */),
    ),
    redeemScriptArgumentByteLengths: [],
    witnessDataByteLengths: [
      ...p2wshRes.witnessScriptArgumentByteLength,
      p2wshRes.witnessScript.length,
    ],
  }
}

export const p2tr_tapInternalKey = (): EstimationInput.P2TR => ({
  addressType: "p2tr",
  tapInternalKey: new Uint8Array(
    /**
     * @see https://github.com/bitcoin/bips/blob/34f345335cf2cd7d2f631adf4b48a46e647884c2/bip-0341.mediawiki#constructing-and-spending-taproot-outputs
     *
     * `taproot_tweak_pubkey` function accepts a public key of length 32, which
     * is `tapInternalKey`, it's length 32 is defined by [BIP341](https://github.com/bitcoin/bips/blob/acb195f82ec464f014e3d6cf8af65a403724c56b/bip-0340.mediawiki)
     */
    32,
  ),
})
