import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// Fișierul importă un alt fișier din src/lib fără extensie (ca în aplicație); Node cere extensia, deci o adăugăm la rezolvare, doar în acest test.
register(
  "data:text/javascript," +
    encodeURIComponent(
      "export async function resolve(s, c, next) { try { return await next(s, c); } catch (e) { if (s.startsWith('.') && !s.endsWith('.ts') && !s.endsWith('.js')) return next(s + '.ts', c); throw e; } }",
    ),
  import.meta.url,
);
const { codeazaStare, decodeazaStare, slugValid, ORG_DEMO_SLUG } = await import("../src/lib/previzualizare.ts");

test("starea fără configurare nesalvată face drumul înapoi", () => {
  const cod = codeazaStare("asociatia-salveaza-o-inima", null);
  assert.deepEqual(decodeazaStare(cod), { slug: "asociatia-salveaza-o-inima", config: null });
});

test("starea cu configurare nesalvată face drumul înapoi", () => {
  const config = { v: 1, navAscunse: ["rfm"], navEtichete: { donatori: "Donatorii noștri" }, dashboard: { ascunse: ["top-sponsori"] } };
  const cod = codeazaStare("az", config);
  assert.deepEqual(decodeazaStare(cod), { slug: "az", config });
});

test("coduri stricate sau cu slug invalid sunt refuzate, nu aruncă", () => {
  for (const cod of ["", ".", "fără-punct", ".abc", "Slug.", "../etc.", "a b.", "x".repeat(200) + ".", "az.!!!", "az.abc"]) {
    assert.equal(decodeazaStare(cod), null, cod);
  }
  // JSON valid, dar cu un câmp necunoscut în configurare
  const rau = btoa(JSON.stringify({ v: 1, hack: 1 })).replace(/=+$/, "");
  assert.equal(decodeazaStare(`az.${rau}`), null);
});

test("slugValid acceptă doar litere mici, cifre și cratime", () => {
  assert.ok(slugValid("calm-impact-demo"));
  assert.ok(!slugValid("Calm"));
  assert.ok(!slugValid("a/b"));
  assert.ok(!slugValid(""));
  assert.ok(!slugValid(5));
});

test("organizația demo are slug valid", () => {
  assert.ok(slugValid(ORG_DEMO_SLUG));
});
