import {
  estimateOutputVSizeAfterSign,
  WITNESS_SCALE_FACTOR,
} from "./estimateTransactionVSizeAfterSign"

/**
 * https://github.com/bitcoin/bitcoin/blob/2ffaa927023f5dc2a7b8d6cfeb4f4810e573b18c/src/policy/policy.h#L55
 * https://github.com/bitcoin/bitcoin/blob/2ffaa927023f5dc2a7b8d6cfeb4f4810e573b18c/test/functional/mempool_dust.py#L37
 */
const DUST_RELAY_TX_FEE = 3000 / 1000 // sats/kvB

/**
 * Get the dust threshold for a given output.
 *
 * [What is meant by Bitcoin dust?](https://bitcoin.stackexchange.com/a/41082)
 *
 * @param scriptPubKey the [pubkey script](https://btcinformation.org/en/glossary/pubkey-script) of the output
 * @returns Minimum satoshi amount for the output to be considered as dust.
 */
export function getOutputDustThreshold(output: {
  scriptPubKey: Uint8Array
}): number {
  /**
   * https://bitcoin.stackexchange.com/a/41082
   * https://github.com/bitcoin/bitcoin/blob/e9262ea32a6e1d364fb7974844fadc36f931f8c6/src/policy/policy.cpp#L26-L63
   */

  const scriptPubKey = output.scriptPubKey

  if (isScriptPubKeyUnspendable(scriptPubKey)) {
    return 0
  }

  const outputSize = estimateOutputVSizeAfterSign({ scriptPubKey })

  let inputSize: number
  /**
   * https://github.com/bitcoin/bitcoin/blob/e9262ea32a6e1d364fb7974844fadc36f931f8c6/src/policy/policy.cpp#L54-L60
   */
  if (isWitnessProgram(scriptPubKey)) {
    inputSize = 32 + 4 + 1 + Math.floor(107 / WITNESS_SCALE_FACTOR) + 4
  } else {
    inputSize = 32 + 4 + 1 + 107 + 4
  }

  return (inputSize + outputSize) * DUST_RELAY_TX_FEE
}

/**
 * https://github.com/bitcoin/bitcoin/blob/c1223188e0a5fb11c3a1b9224511a49dc2f848ed/src/script/script.h#L39
 */
const MAX_SCRIPT_SIZE = 10000

/**
 * https://github.com/bitcoin/bitcoin/blob/2ffaa927023f5dc2a7b8d6cfeb4f4810e573b18c/src/script/script.h#L75
 */
const OP_0 = 0x00
const OP_1 = 0x51
const OP_16 = 0x60
const OP_RETURN = 0x6a

/**
 * https://github.com/bitcoin/bitcoin/blob/master/src/script/script.h#L552-L555
 */
function isScriptPubKeyUnspendable(scriptPubKey: Uint8Array): boolean {
  if (scriptPubKey.length > 0 && scriptPubKey[0] === OP_RETURN) {
    return true
  }

  if (scriptPubKey.length > MAX_SCRIPT_SIZE) {
    return true
  }

  return false
}

/**
 * https://github.com/bitcoin/bitcoin/blob/master/src/script/script.cpp#L226-L240
 */
function isWitnessProgram(scriptPubKey: Uint8Array): boolean {
  if (scriptPubKey.length < 4 || scriptPubKey.length > 42) {
    return false
  }

  /**
   * check if the first byte is witness program version
   */
  if (
    scriptPubKey[0] != OP_0 &&
    (scriptPubKey[0] < OP_1 || scriptPubKey[0] > OP_16)
  ) {
    return false
  }

  /**
   * check if the second byte is witness program length
   */
  if (
    scriptPubKey[1] /* the second byte indicates the script length */ +
      1 /* first byte (witness program version) */ +
      1 /* second byte (witness program length) */ ===
    scriptPubKey.length
  ) {
    return true
  }

  return false
}
