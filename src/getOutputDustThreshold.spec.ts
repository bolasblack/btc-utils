import { describe, expect, it } from "vitest"
import { getOutputDustThreshold } from "./getOutputDustThreshold"
import { decodeHex } from "./utils/decodeHex"

describe("getOutputDustThreshold", () => {
  it("should work with a P2PKH output", () => {
    expect(
      getOutputDustThreshold({
        scriptPubKey: decodeHex(
          "76a914cb4f45b4ecfe54b25106a919237cf34ce193c1b988ac",
        ),
      }),
    ).toBe(546)
  })

  it("should work with a P2SH output", () => {
    expect(
      getOutputDustThreshold({
        scriptPubKey: decodeHex(
          "a914748284390f9e263a4b766a75d0633c50426eb87587",
        ),
      }),
    ).toBe(540)
  })

  it("should work with a P2WPKH output", () => {
    expect(
      getOutputDustThreshold({
        scriptPubKey: decodeHex("0014841b80d2cc75f5345c482af96294d04fdd66b2b7"),
      }),
    ).toBe(294)
  })

  it("should work with a P2WSH output", () => {
    expect(
      getOutputDustThreshold({
        scriptPubKey: decodeHex(
          "0020ea166bf0492c6f908e45404932e0f39c0571a71007c22b872548cd20f19a92f5",
        ),
      }),
    ).toBe(330)
  })

  it("should work with a P2TR output", () => {
    expect(
      getOutputDustThreshold({
        scriptPubKey: decodeHex(
          "512023d8b7374aaed47db58df01c5c09998c7b3c9e48a3e4a3820b8326adf6363788",
        ),
      }),
    ).toBe(330)
  })

  it("should work with OP_RETURN output", () => {
    expect(
      getOutputDustThreshold({
        scriptPubKey: decodeHex("6a13636861726c6579206c6f766573206865696469"),
      }),
    ).toBe(0)
  })
})
