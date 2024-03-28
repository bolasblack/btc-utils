import { describe, expect, it } from "vitest"
import { estimateTransactionVSizeAfterSign } from "./estimateTransactionVSizeAfterSign"
import { p2shTx } from "./estimateTransactionVSizeAfterSign.fixture"
import { decodeHex } from "./getOutputDustThreshold.spec"

describe("estimateTransactionVSizeAfterSign", () => {
  it("should work with P2SH script", () => {
    /**
     * https://learnmeabitcoin.com/explorer/tx/30c239f3ae062c5f1151476005fd0057adfa6922de1b38d0f11eb657a8157b30
     */
    expect(
      estimateTransactionVSizeAfterSign({
        inputs: p2shTx.vin.map((vin, idx) =>
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
    ).toBe(1963)
    /**
     * actual size: 1952.00
     *
     * The difference is because some actual signature length of certain inputs
     * are 31/32
     */
  })
})
