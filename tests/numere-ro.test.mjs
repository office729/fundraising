import { test } from "node:test";
import assert from "node:assert/strict";

import { parseazaNumarRo } from "../src/lib/numere-ro.ts";

test("numere scrise în stil românesc", () => {
  const cazuri = [
    ["1.234,56", 1234.56],
    ["1 234", 1234],
    ["1234.5", 1234.5],
    ["12.345", 12345], // un singur separator + exact 3 cifre = mii
    ["1,5", 1.5],
    ["-3.000", -3000],
    ["1.234.567", 1234567],
    ["100", 100],
    ["12.5", 12.5],
    ["2,50", 2.5],
    ["RON 5.000", 5000],
    ["1.500,50", 1500.5],
  ];
  for (const [intrare, asteptat] of cazuri) assert.equal(parseazaNumarRo(intrare), asteptat, `intrare: ${intrare}`);
});

test("fără număr → null", () => {
  for (const v of ["", "abc", null, undefined]) assert.equal(parseazaNumarRo(v), null);
});
