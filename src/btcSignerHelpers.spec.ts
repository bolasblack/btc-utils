import { describe, expect, it } from "vitest"
import { estimateInputVSizeAfterSign_2 } from "./btcSignerHelpers"
import {
  estimateInputVSizeAfterSign,
  estimateTransactionVSizeAfterSign,
  WITNESS_SCALE_FACTOR,
} from "./estimateTransactionVSizeAfterSign"
import { p2wpkh_tx } from "./estimateTransactionVSizeAfterSign.fixture"
import { decodeHex } from "./utils/decodeHex"
import { Transaction } from "@scure/btc-signer"
import { range } from "./utils/range"

describe("estimateInputVSizeAfterSign_2", () => {
  it("works", () => {
    const estimated = estimateInputVSizeAfterSign_2(
      {
        txid: p2wpkh_tx.vin[0].txid,
        index: p2wpkh_tx.vin[0].vout,
        witnessUtxo: {
          amount: 100n,
          script: decodeHex(p2wpkh_tx.vin[0].scriptPubKey.hex),
        },
      },
      {
        allowLegacyWitnessUtxo: true,
        allowUnknownInputs: true,
        allowUnknownOutputs: true,
      },
    )

    const expected = estimateInputVSizeAfterSign({
      addressType: "p2wpkh",
    })

    expect(estimated.inputSize + (estimated.witnessDataSize ?? 0)).toBe(
      expected.inputSize +
        expected.witnessDataSize / WITNESS_SCALE_FACTOR -
        0.25 /* signature length difference */,
    )
  })

  it("works with estimateTransactionVSizeAfterSign", () => {
    const tx = Transaction.fromRaw(decodeHex(p2wpkh_tx.hex), {
      allowLegacyWitnessUtxo: true,
      allowUnknownInputs: true,
      allowUnknownOutputs: true,
    })
    const inputs = range(0, tx.inputsLength).map(i =>
      estimateInputVSizeAfterSign_2(
        {
          txid: p2wpkh_tx.vin[i].txid,
          index: p2wpkh_tx.vin[i].vout,
          witnessUtxo: {
            amount: 100n,
            script: decodeHex(p2wpkh_tx.vin[i].scriptPubKey.hex),
          },
        },
        {
          allowLegacyWitnessUtxo: true,
          allowUnknownInputs: true,
          allowUnknownOutputs: true,
        },
      ),
    )

    expect(
      estimateTransactionVSizeAfterSign({
        inputs: inputs,
        outputs: p2wpkh_tx.vout.map(v => ({
          scriptPubKey: decodeHex(v.scriptPubKey.hex),
        })),
      }),
    ).toBe(
      estimateTransactionVSizeAfterSign({
        inputs: p2wpkh_tx.vin.map(() => ({
          addressType: "p2wpkh",
        })),
        outputs: p2wpkh_tx.vout.map(vout => ({
          scriptPubKey: decodeHex(vout.scriptPubKey.hex),
        })),
      }) - 0.25,
    )
  })
})
