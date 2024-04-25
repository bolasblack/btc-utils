import { _Estimator } from "@scure/btc-signer"
import { TransactionInputUpdate } from "@scure/btc-signer/lib/psbt"
import { TxOpts } from "@scure/btc-signer/lib/transaction"
import { WITNESS_SCALE_FACTOR } from "./estimateTransactionVSizeAfterSign"

export const estimateInputVSizeAfterSign = (
  input: TransactionInputUpdate,
  txOptions: TxOpts,
): {
  weight: number
  vsize: number
  hasWitnessData: boolean
} => {
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
