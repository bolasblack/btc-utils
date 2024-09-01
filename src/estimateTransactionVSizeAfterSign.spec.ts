import { describe, expect, it } from "vitest"
import {
  estimateOutputVSizeAfterSign,
  estimatePublicKeyScriptVSize,
  estimateTransactionVSizeAfterSign,
} from "./estimateTransactionVSizeAfterSign"
import {
  p2sh_tx,
  p2sh_p2wpkh_tx,
  p2tr_tx,
  p2trLeafScript_tx,
  p2wpkh_tx,
  p2wsh_tx,
} from "./estimateTransactionVSizeAfterSign.fixture"
import { decodeHex } from "./utils/decodeHex"
import { sum } from "./utils/sum"
import { getCompactSizeByteSize } from "./utils/getCompactSizeByteSize"

describe("estimateTransactionVSizeAfterSign", () => {
  it("should work with custom input", () => {
    const outputScriptPubKey = decodeHex(
      "a914748284390f9e263a4b766a75d0633c50426eb87587",
    )
    const inputSize = 148
    const witnessDataSize = 107
    expect(
      estimateTransactionVSizeAfterSign({
        inputs: [
          {
            addressType: "custom",
            inputSize,
            witnessDataSize,
          },
        ],
        outputs: [
          {
            scriptPubKey: outputScriptPubKey,
          },
        ],
      }),
    ).toBe(
      // prettier-ignore
      4 +
      1 / 4 +
      1 / 4 +
      getCompactSizeByteSize(1) +
      inputSize +
      getCompactSizeByteSize(1) +
      estimateOutputVSizeAfterSign({ scriptPubKey: outputScriptPubKey }) +
      witnessDataSize / 4 +
      4,
    )
  })

  it("should work with P2PKH and P2SH script", () => {
    /**
     * https://learnmeabitcoin.com/explorer/tx/30c239f3ae062c5f1151476005fd0057adfa6922de1b38d0f11eb657a8157b30
     */
    expect(
      estimateTransactionVSizeAfterSign({
        inputs: p2sh_tx.vin.map((vin, idx) =>
          idx === 11
            ? {
                addressType: "p2sh",
                redeemScript: decodeHex(
                  "5121022afc20bf379bc96a2f4e9e63ffceb8652b2b6a097f63fbee6ecec2a49a48010e2103a767c7221e9f15f870f1ad9311f5ab937d79fcaeee15bb2c722bca515581b4c052ae",
                ),
                redeemScriptArgumentByteLengths: [0, 71],
              }
            : {
                addressType: "p2pkh",
                isPublicKeyCompressed:
                  vin.scriptSig.asm.split("[ALL] ")[1].length <= 66,
              },
        ),
        outputs: [
          {
            scriptPubKey: decodeHex(
              "a914748284390f9e263a4b766a75d0633c50426eb87587",
            ),
          },
        ],
      }),
    ).toBe(
      1952 +
        sum(
          ...p2sh_tx.vin
            .slice(0, 11)
            .map(vin => 72 - vin.scriptSig.asm.split("[ALL] ")[0].length / 2),
        ),
    )
    /**
     * actual size: 1952.00
     *
     * The difference is because some actual signature length of certain inputs
     * are 70(OP_PUSHBYTES_71)/71(OP_PUSHBYTES_72), but we only consider 73 (the
     * maximum length + sighash)
     */
  })

  it("should work with P2WPKH script", () => {
    /**
     * https://learnmeabitcoin.com/explorer/tx/1674761a2b5cb6c7ea39ef58483433e8735e732f5d5815c9ef90523a91ed34a6
     */
    expect(
      estimateTransactionVSizeAfterSign({
        inputs: p2wpkh_tx.vin.map(() => ({
          addressType: "p2wpkh",
        })),
        outputs: p2wpkh_tx.vout.map(vout => ({
          scriptPubKey: decodeHex(vout.scriptPubKey.hex),
        })),
      }),
    ).toBe(
      109.5 + (73 - p2wpkh_tx.vin[0].txinwitness[0].length / 2) / 4,
      /* = 109.75 */
    )
    /**
     * actual size: 109.50
     *
     * the difference is because the signature length of the only input is
     * 71(OP_PUSHBYTES_72), but we only consider 73 (the maximum length +
     * sighash), so the estimated length is "109.50 + 1/4 = 109.75"
     */
  })

  it("should work with P2SH-P2WPKH script", () => {
    /**
     * https://learnmeabitcoin.com/explorer/tx/d64f20461bd4a22b470bbaeb97b8cee4c7c75f39cac5bca1d172b7f526b7a6ec
     */
    expect(
      estimateTransactionVSizeAfterSign({
        inputs: p2sh_p2wpkh_tx.vin.map(vin => ({
          addressType: "p2sh",
          redeemScriptArgumentByteLengths: [],
          redeemScript:
            /**
             * the first byte is an OP_PUSH operator
             */
            decodeHex(vin.scriptSig.hex).slice(1),
          witnessDataByteLengths: [
            estimatePublicKeyScriptVSize(true).signatureLength,
            estimatePublicKeyScriptVSize(true).publicKeyLength,
          ],
        })),
        outputs: p2sh_p2wpkh_tx.vout.map(vout => ({
          scriptPubKey: decodeHex(vout.scriptPubKey.hex),
        })),
      }),
    ).toBe(268)
    /**
     * actual size: 267.25
     *
     * the signature length for the first input is 71, for the second is 72, but
     * what we estimated is both 73, so the difference is:
     *
     *     ((73 - 71) + (73 - 72)) * 0.4 (The witness discount) =
     *     268 - 267.25 =
     *     0.75
     */
  })

  it("should work with P2WSH script", () => {
    /**
     * https://learnmeabitcoin.com/explorer/tx/46ebe264b0115a439732554b2b390b11b332b5b5692958b1754aa0ee57b64265
     */
    expect(
      estimateTransactionVSizeAfterSign({
        inputs: p2wsh_tx.vin.map(vin => ({
          addressType: "p2wsh",
          witnessScript: decodeHex(vin.txinwitness[3]),
          witnessScriptArgumentByteLength: [
            vin.txinwitness[0].length / 2,
            vin.txinwitness[1].length / 2,
            vin.txinwitness[2].length / 2,
          ],
        })),
        outputs: p2wsh_tx.vout.map(vout => ({
          scriptPubKey: decodeHex(vout.scriptPubKey.hex),
        })),
      }),
    ).toBe(189.5)
  })

  it("should work with P2TR script", () => {
    /**
     * https://learnmeabitcoin.com/explorer/tx/f0720c7a804acc63c0db27fe7770a74e33877f11ad42104b4d3e94785428575f
     */
    expect(
      estimateTransactionVSizeAfterSign({
        inputs: [
          { addressType: "p2wpkh" },
          {
            addressType: "p2tr",
            tapInternalKey: decodeHex(p2tr_tx.vin[1].txinwitness[0]),
          },
        ],
        outputs: p2tr_tx.vout.map(vout => ({
          scriptPubKey: decodeHex(vout.scriptPubKey.hex),
        })),
      }),
    ).toBe(285.5)
    /**
     * actual size: 285
     *
     * because the actual size of signature of the first input is 71, which is
     * 2 bytes smaller than the expected input (73), so the difference is
     * (73 - 71) / 4 = 0.5
     */
  })

  it("should work with P2TR-leaf-script script", () => {
    /**
     * https://learnmeabitcoin.com/explorer/tx/b49407ed1c85e0d58692ee660275d1fcbdc06f6f8003f085395dbc11235fe119
     */
    expect(
      estimateTransactionVSizeAfterSign({
        inputs: [
          {
            addressType: "p2tr-leafScript",
            tapLeafScriptArgumentByteLengths: [
              p2trLeafScript_tx.vin[0].txinwitness[0].length / 2,
            ],
            tapLeafScriptByteLength:
              p2trLeafScript_tx.vin[0].txinwitness[1].length / 2,
            controlBlockByteLength:
              p2trLeafScript_tx.vin[0].txinwitness[2].length / 2,
          },
        ],
        outputs: p2trLeafScript_tx.vout.map(vout => ({
          scriptPubKey: decodeHex(vout.scriptPubKey.hex),
        })),
      }),
    ).toBe(168.0)
  })
})
