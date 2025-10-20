import { _Estimator } from "@scure/btc-signer"
import { TransactionInputUpdate } from "@scure/btc-signer/psbt"
import { RawWitness, VarBytes } from "@scure/btc-signer/script"
import { TxOpts } from "@scure/btc-signer/transaction"
import {
  EstimationInput,
  WITNESS_SCALE_FACTOR,
} from "./estimateTransactionVSizeAfterSign"

export const estimateInputVSizeAfterSign = (
  input: TransactionInputUpdate,
  txOptions: TxOpts,
): {
  weight: number
  vsize: number
  hasWitnessData: boolean
  inputWeight?: number
  witnessDataWeight?: number
} => {
  /**
   * If already signed, use a simpler (and more accurate) approach
   *
   * from https://github.com/paulmillr/scure-btc-signer/blob/2b19086a0ce51c7476c9f495f50a25e4289f40f4/src/transaction.ts#L610-L613
   */
  if ("finalScriptSig" in input && input.finalScriptSig) {
    const inputWeight = 160 + 4 * VarBytes.encode(input.finalScriptSig).length

    let hasWitnessData = false
    let witnessDataWeight: number | undefined
    if ("finalScriptWitness" in input && input.finalScriptWitness) {
      hasWitnessData = true
      witnessDataWeight = RawWitness.encode(input.finalScriptWitness).length
    }

    const weight = inputWeight + (witnessDataWeight ?? 0)
    return {
      weight,
      vsize: weight / WITNESS_SCALE_FACTOR,
      hasWitnessData,
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

  if (res.inputWeight != null) {
    return {
      addressType: "custom",
      inputSize: res.inputWeight / WITNESS_SCALE_FACTOR,
      witnessDataSize:
        res.witnessDataWeight == null
          ? undefined
          : res.witnessDataWeight / WITNESS_SCALE_FACTOR,
    }
  }

  return {
    addressType: "custom",
    inputSize: res.vsize,
    witnessDataSize: res.hasWitnessData ? 0 : undefined,
  }
}
