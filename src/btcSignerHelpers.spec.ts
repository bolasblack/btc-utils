import { describe, expect, it } from "vitest"
import * as btc from "@scure/btc-signer"
import { decodeHex } from "./utils/decodeHex"
import { inputFromBtcSingerTapLeafScript } from "./btcSignerHelpers"
import {
  WITNESS_SCALE_FACTOR,
  estimateInputVSizeAfterSign,
} from "./estimateTransactionVSizeAfterSign"

describe("inputFromBtcSingerTapLeafScript", () => {
  const PubKey = decodeHex(
    "0101010101010101010101010101010101010101010101010101010101010101",
  )
  const PubKey2 = decodeHex(
    "0202020202020202020202020202020202020202020202020202020202020202",
  )
  const PubKey3 = decodeHex(
    "1212121212121212121212121212121212121212121212121212121212121212",
  )
  const PubKey4 = decodeHex(
    "2222222222222222222222222222222222222222222222222222222222222222",
  )

  it("works with P2TR-NS", () => {
    const p2tr = btc.p2tr(
      undefined,
      btc.p2tr_ns(4, [PubKey, PubKey2, PubKey3, PubKey4]),
    )

    const { weEstimated, btcSignerEstimated } = getEstimatations(p2tr)

    expect(weEstimated).toBe(btcSignerEstimated)
  })

  it("works with P2TR-MS", () => {
    const p2tr = btc.p2tr(
      undefined,
      btc.p2tr_ms(2, [PubKey, PubKey2, PubKey3, PubKey4]),
    )

    const { weEstimated, btcSignerEstimated } = getEstimatations(p2tr)

    expect(weEstimated).toBe(btcSignerEstimated)
  })

  it("works with P2TR-PK", () => {
    const p2tr = btc.p2tr(undefined, btc.p2tr_pk(PubKey))

    const { weEstimated, btcSignerEstimated } = getEstimatations(p2tr)

    expect(weEstimated).toBe(btcSignerEstimated)
  })

  function getEstimatations(p2tr: btc.P2TROut): {
    weEstimated: number
    btcSignerEstimated: number
  } {
    const weEstimated = estimateInputVSizeAfterSign(
      inputFromBtcSingerTapLeafScript(p2tr.tapLeafScript![0]),
    )

    const btcSignerEstimated = new btc._Estimator(
      [
        {
          txid: "f0720c7a804acc63c0db27fe7770a74e33877f11ad42104b4d3e94785428575f",
          index: 0,
          witnessUtxo: {
            script: decodeHex(
              "5120ed2a3a57bed84a04a2f33d8469ee59bd265e3da78598ac3117d9d7990b196f99",
            ),
            amount: 0n,
          },
          tapLeafScript: p2tr.tapLeafScript,
          /**
           * `SigHash.DEFAULT` will make the Estimator count `SCHNORR_SIG_SIZE`
           * as `64`, which is 1 byte smaller than ours (`SCHNORR_SIGNATURE_SIZE`)
           *
           * https://github.com/paulmillr/scure-btc-signer/blob/75c80bd2695ba500964457f80d2fd9e6a5e052d2/src/utxo.ts#L130
           */
          sighashType: btc.SigHash.ALL,
        },
      ],
      [],
      {
        feePerByte: 1n,
        changeAddress:
          "bc1pa54r54a7mp9qfghn8kzxnmjeh5n9u0d8skv2cvghm8tejzced7vsxn2q2l",
      },
    )["normalizedInputs"][0].estimate

    return {
      weEstimated:
        weEstimated.inputSize +
        weEstimated.witnessDataSize / WITNESS_SCALE_FACTOR,
      btcSignerEstimated: btcSignerEstimated.weight / WITNESS_SCALE_FACTOR,
    }
  }
})
