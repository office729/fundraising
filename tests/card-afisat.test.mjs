import { test } from "node:test";
import assert from "node:assert/strict";

import { cardAfisat } from "../src/lib/billing/card-afisat.ts";

test("se arată doar ultimele 4 cifre, indiferent de forma în care vine masca", () => {
  assert.equal(cardAfisat("424404*5965"), "•••• 5965");
  assert.equal(cardAfisat("424404******5965"), "•••• 5965");
  assert.equal(cardAfisat("4244 04** **** 5965"), "•••• 5965");
  assert.equal(cardAfisat("•••• 5965"), "•••• 5965", "idempotent: o valoare deja curățată rămâne la fel");
  assert.equal(cardAfisat("5965"), "•••• 5965");
});

test("primele cifre (BIN-ul) nu apar niciodată în rezultat", () => {
  const r = cardAfisat("424404*5965");
  assert.ok(!r.includes("4244"));
  assert.ok(!r.includes("424404"));
});

test("fără ultimele 4 cifre nu inventăm nimic: null", () => {
  for (const x of [null, undefined, "", "   ", "***", "12"]) assert.equal(cardAfisat(x), null, String(x));
});
