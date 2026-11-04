import { test } from "node:test";
import assert from "node:assert/strict";

const P = await import("../src/lib/donatori-pf-filtre.ts");

test("persoane fizice: ?deep=1 pornește Deep Search, orice altceva îl oprește", () => {
  assert.equal(P.parseFiltruPf(new URLSearchParams("q=mihai+cluj&deep=1")).deep, true);
  assert.equal(P.parseFiltruPf(new URLSearchParams("q=mihai&deep=0")).deep, false);
  assert.equal(P.parseFiltruPf(new URLSearchParams("")).deep, false);
});

test("persoane fizice: Deep Search se păstrează în adresele generate (export, rapoarte salvate)", () => {
  const f = P.parseFiltruPf(new URLSearchParams("q=mihai&deep=1"));
  assert.equal(P.filtruLaParametri(f).get("deep"), "1");
  assert.equal(P.filtruLaParametri({ ...f, deep: false }).get("deep"), null);
});
