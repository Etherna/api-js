import { describe, expect, it } from "vitest"

import { bmtHash } from "../../src/clients/bee/utils/bmt"

describe("soc", () => {
  it("should generate correct bmt hash", async () => {
    const data = new Uint8Array([1, 2, 3, 4, 5])
    const hash = bmtHash(data)

    expect(hash).toEqual(
      new Uint8Array([
        249, 191, 49, 246, 163, 243, 231, 185, 201, 109, 120, 1, 220, 22, 215, 239, 18, 1, 219, 35,
        96, 193, 114, 173, 119, 118, 212, 33, 131, 185, 121, 191,
      ]),
    )
  })
})
