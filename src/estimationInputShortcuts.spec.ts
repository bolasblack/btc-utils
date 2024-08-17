import { describe, expect, it } from "vitest"
import { estimateTransactionVSizeAfterSign } from "./estimateTransactionVSizeAfterSign"
import {
  p2sh_p2wpkh_tx,
  p2sh_tx,
  p2tr_tx,
  p2wpkh_tx,
  p2wsh_tx,
} from "./estimateTransactionVSizeAfterSign.fixture"
import {
  p2pkh,
  p2sh_multisig,
  p2sh_p2wpkh,
  p2sh_p2wsh_multisig,
  p2tr_tapInternalKey,
  p2wpkh,
  p2wsh_multisig,
} from "./estimationInputShortcuts"
import { decodeHex } from "./utils/decodeHex"
import { sum } from "./utils/sum"

describe("estimationInputShortcuts", () => {
  describe("p2sh_p2wpkh", () => {
    it("works", () => {
      expect(
        estimateTransactionVSizeAfterSign({
          inputs: p2sh_p2wpkh_tx.vin.map(() => p2sh_p2wpkh()),
          outputs: p2sh_p2wpkh_tx.vout.map(vout => ({
            scriptPubKey: decodeHex(vout.scriptPubKey.hex),
          })),
        }),
      ).toBe(267.25 + 0.75)
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
  })

  describe("p2pkh, p2sh_multisig", () => {
    it("works", () => {
      /**
       * https://learnmeabitcoin.com/explorer/tx/30c239f3ae062c5f1151476005fd0057adfa6922de1b38d0f11eb657a8157b30
       */
      expect(
        estimateTransactionVSizeAfterSign({
          inputs: p2sh_tx.vin.map((vin, idx) =>
            idx === 11
              ? p2sh_multisig({
                  minimumSignatureCount: 1,
                  compressedPublicKeyCount: 2,
                })
              : p2pkh({
                  isPublicKeyCompressed:
                    vin.scriptSig.asm.split("[ALL] ")[1].length <= 66,
                }),
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
          ) /* p2pkh difference */ +
          (73 -
            p2sh_tx.vin[11].scriptSig.asm
              .split(" ")[1]
              .slice(0, -"[ALL]".length).length /
              2) /* p2sh difference */,
      )
      /**
       * actual size: 1952.00
       *
       * The difference is because some actual signature length of certain inputs
       * are 70(OP_PUSHBYTES_71)/71(OP_PUSHBYTES_72), but we only consider 72 (the
       * maximum length)
       */
    })
  })

  describe("p2wpkh", () => {
    it("works", () => {
      expect(
        estimateTransactionVSizeAfterSign({
          inputs: p2wpkh_tx.vin.map(() => p2wpkh()),
          outputs: p2wpkh_tx.vout.map(vout => ({
            scriptPubKey: decodeHex(vout.scriptPubKey.hex),
          })),
        }),
      ).toBe(109.5 + 0.25)
      /**
       * actual size: 109.50
       *
       * the difference is because the signature length of the only input is
       * 71(OP_PUSHBYTES_72), but we only consider 72 (the maximum length), so
       * the estimated length is "109.50 + 1/4 = 109.75"
       */
    })
  })

  describe("p2wsh_multisig", () => {
    it("works", () => {
      expect(
        estimateTransactionVSizeAfterSign({
          inputs: p2wsh_tx.vin.map(() =>
            p2wsh_multisig({
              minimumSignatureCount: 2,
              compressedPublicKeyCount: 3,
            }),
          ),
          outputs: p2wsh_tx.vout.map(vout => ({
            scriptPubKey: decodeHex(vout.scriptPubKey.hex),
          })),
        }),
      ).toBe(189.5 + ((73 - 71) * 2) / 4)
      /**
       * actual size: 189.5
       *
       * the difference is because the signature length of the only input is
       * 71(OP_PUSHBYTES_72), but we only consider 73 (the maximum length), so
       * the estimated length is "189.5 + 0.25 * 2" (because we have 2 signatures)
       */
    })
  })

  describe("p2sh_p2wsh_multisig", () => {
    it("works", () => {
      expect(
        estimateTransactionVSizeAfterSign({
          inputs: [
            p2sh_p2wsh_multisig({
              minimumSignatureCount: 6,
              compressedPublicKeyCount: 6,
            }),
          ],
          outputs: [
            {
              scriptPubKey: decodeHex(
                "76a914389ffce9cd9ae88dcc0631e88a821ffdbe9bfe2688ac",
              ),
            },
            {
              scriptPubKey: decodeHex(
                "76a9147480a33f950689af511e6e84c138dbbd3c3ee41588ac",
              ),
            },
          ],
        }),
      ).toBe(315.5 + ((73 - 71) * 4 + (73 - 72) * 2) / 4)
      /**
       * actual size: 315.5
       *
       * The difference is because some actual signature length of certain inputs
       * are 70(OP_PUSHBYTES_71)/71(OP_PUSHBYTES_72), but we only consider 72 (the
       * maximum length)
       */
    })
  })

  describe("p2tr_tapInternalKey", () => {
    it("works", () => {
      expect(
        estimateTransactionVSizeAfterSign({
          inputs: [p2wpkh(), p2tr_tapInternalKey()],
          outputs: p2tr_tx.vout.map(vout => ({
            scriptPubKey: decodeHex(vout.scriptPubKey.hex),
          })),
        }),
      ).toBe(285 + 0.5)
      /**
       * actual size: 285
       *
       * because the actual size of signature of the first input is 71, which is
       * 2 bytes smaller than the expected input (73), so the difference is
       * (73 - 71) / 4 = 0.5
       */
    })
  })
})
