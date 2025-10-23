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
      {},
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

  it("support finalScriptSig", () => {
    const tx = Transaction.fromRaw(decodeHex(p2wpkh_tx.hex))
    const estimated = estimateInputVSizeAfterSign_2(tx.getInput(0)!, {})

    const expected = estimateInputVSizeAfterSign({
      addressType: "p2wpkh",
    })

    expect({
      inputSize: expected.inputSize,
      witnessDataSize:
        expected.witnessDataSize - 1 /* signature length difference */,
    }).toEqual({
      inputSize: estimated.inputSize,
      witnessDataSize: estimated.witnessDataSize,
    })
  })

  it("works with estimateTransactionVSizeAfterSign", () => {
    const tx = Transaction.fromRaw(decodeHex(p2wpkh_tx.hex))
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
        {},
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
