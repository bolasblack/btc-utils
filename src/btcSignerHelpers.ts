import {
  TransactionInput,
  TaprootControlBlock,
  OutScript,
} from "@scure/btc-signer"
import {
  EstimationInput,
  SCHNORR_SIGNATURE_SIZE,
} from "./estimateTransactionVSizeAfterSign"

export const inputFromBtcSingerTapLeafScript = (
  tapLeafScript: NonNullable<TransactionInput["tapLeafScript"]>[number],
): EstimationInput.P2TRScript => {
  const [controlBlock, scriptWithVersion] = tapLeafScript

  /**
   * Last byte is version
   *
   * https://github.com/paulmillr/scure-btc-signer/blob/75c80bd2695ba500964457f80d2fd9e6a5e052d2/src/utxo.ts#L142
   */
  const script = scriptWithVersion.slice(0, -1)

  /**
   * https://github.com/paulmillr/scure-btc-signer/blob/75c80bd2695ba500964457f80d2fd9e6a5e052d2/src/utxo.ts#L146-L153
   */
  const outScript = OutScript.decode(script)
  const tapLeafScriptArgumentByteLengths: number[] = []
  if (outScript.type === "tr_ms") {
    const m = outScript.m
    for (let i = 0; i < m; i++) {
      tapLeafScriptArgumentByteLengths.push(SCHNORR_SIGNATURE_SIZE)
    }
    const n = outScript.pubkeys.length - m
    for (let i = 0; i < n; i++) {
      tapLeafScriptArgumentByteLengths.push(0)
    }
  } else if (outScript.type === "tr_ns") {
    for (const _pub of outScript.pubkeys) {
      tapLeafScriptArgumentByteLengths.push(SCHNORR_SIGNATURE_SIZE)
    }
  } else {
    throw new Error("Finalize: Unknown tapLeafScript")
  }

  const controlBlockBytes = TaprootControlBlock.encode(controlBlock)

  return {
    addressType: "p2tr-leafScript",
    tapLeafScriptArgumentByteLengths: tapLeafScriptArgumentByteLengths,
    tapLeafScriptByteLength: script.length,
    controlBlockByteLength: controlBlockBytes.length,
  }
}
