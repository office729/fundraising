import { test } from "node:test";
import assert from "node:assert/strict";

const W = await import("../src/lib/ferestre-fiscale.ts");
const d = (iso) => new Date(`${iso}T09:00:00+03:00`);

test("octombrie–decembrie: ambele ferestre deschise, cu zilele până la termen", () => {
  const f = W.ferestreFiscale(d("2026-10-28"));
  assert.deepEqual(f.map((x) => x.cheie), ["d177", "sponsorizare20"]);
  assert.equal(f[0].termen, "2027-06-25");
  assert.equal(f[1].termen, "2026-12-31");
  assert.equal(f[1].zileRamase, 64);
  assert.equal(f[0].zileRamase, 240);
  assert.equal(f[1].termenText, "31 decembrie");
});

test("ianuarie–iunie: doar D177, cu termen în anul curent", () => {
  const f = W.ferestreFiscale(d("2026-03-10"));
  assert.deepEqual(f.map((x) => x.cheie), ["d177"]);
  assert.equal(f[0].termen, "2026-06-25");
  assert.equal(f[0].zileRamase, 107);
});

test("ultima zi: 0 zile rămase; a doua zi fereastra D177 se închide", () => {
  assert.equal(W.ferestreFiscale(d("2026-06-25"))[0].zileRamase, 0);
  assert.deepEqual(W.ferestreFiscale(d("2026-06-26")), []);
  assert.deepEqual(W.ferestreFiscale(d("2026-08-15")), []);
  assert.deepEqual(W.ferestreFiscale(d("2026-09-30")), []);
});

test("31 decembrie: sponsorizarea mai are 0 zile; D177 are ~176", () => {
  const f = W.ferestreFiscale(d("2026-12-31"));
  assert.equal(f.find((x) => x.cheie === "sponsorizare20").zileRamase, 0);
  assert.equal(f.find((x) => x.cheie === "d177").zileRamase, 176);
});

test("data se ia după ora României, nu UTC (23:30 UTC = 01:30 a doua zi)", () => {
  // 2026-06-25 22:30 UTC = 2026-06-26 01:30 în România: fereastra D177 e deja închisă
  assert.deepEqual(W.ferestreFiscale(new Date("2026-06-25T22:30:00Z")), []);
});
