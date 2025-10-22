import { _Estimator } from "@scure/btc-signer"
import { TransactionInputUpdate } from "@scure/btc-signer/psbt"
import { TxOpts } from "@scure/btc-signer/transaction"
import {
  EstimationInput,
  sumInputVSize,
  WITNESS_SCALE_FACTOR,
} from "./estimateTransactionVSizeAfterSign"
import { getCompactSizeByteSize } from "./utils/getCompactSizeByteSize"
import { sum } from "./utils/sum"

export const estimateInputVSizeAfterSign = (
  input: TransactionInputUpdate,
  txOptions: TxOpts,
): {
  weight: number
  vsize: number
  hasWitnessData: boolean
  inputSize?: number
  witnessDataSize?: number
  inputWeight?: number
  witnessDataWeight?: number
} => {
  /**
   * If already signed, use a simpler (and more accurate) approach
   *
   * from https://github.com/paulmillr/scure-btc-signer/blob/2b19086a0ce51c7476c9f495f50a25e4289f40f4/src/transaction.ts#L610-L613
   */
  if ("finalScriptSig" in input && input.finalScriptSig) {
    const inputSize = sumInputVSize(input.finalScriptSig.length)

    let hasWitnessData = false
    let witnessDataSize: number | undefined
    if ("finalScriptWitness" in input && input.finalScriptWitness) {
      hasWitnessData = true
      witnessDataSize = sum(
        // byte to indicate the witness stack item count
        getCompactSizeByteSize(input.finalScriptWitness.length),

        // witness stack items
        ...input.finalScriptWitness.map(a => a.length),
      )
    }

    const inputWeight = inputSize * WITNESS_SCALE_FACTOR
    const witnessDataWeight = witnessDataSize ?? 0
    const weight = inputWeight + witnessDataWeight
    return {
      weight,
      vsize: weight / WITNESS_SCALE_FACTOR,
      hasWitnessData,
      inputSize,
      witnessDataSize,
      inputWeight,
      witnessDataWeight,
    }
  }

  const { weight, hasWitnesses } = new _Estimator([input], [], {
    ...txOptions,
    feePerByte: 1n,
    changeAddress:
      // OP_0 OP_PUSHBYTES_20 0000000000000000000000000000000000000000
      "bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9e75rs",
  })["normalizedInputs"][0].estimate

  return {
    weight,
    vsize: weight / WITNESS_SCALE_FACTOR,
    hasWitnessData: hasWitnesses,
  }
}

export const estimateInputVSizeAfterSign_2 = (
  input: TransactionInputUpdate,
  txOptions: TxOpts,
): EstimationInput.Custom => {
  const res = estimateInputVSizeAfterSign(input, txOptions)

  if (res.inputSize != null) {
    return {
      addressType: "custom",
      inputSize: res.inputSize,
      witnessDataSize: res.witnessDataSize,
    }
  }

  return {
    addressType: "custom",
    inputSize: res.vsize,
    witnessDataSize: res.hasWitnessData ? 0 : undefined,
  }
}
