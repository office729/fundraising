import { test } from "node:test";
import assert from "node:assert/strict";

const { valideazaAbonare } = await import("../src/lib/abonare-newsletter.ts");

test("abonarea cere o adresă corectă ȘI acordul bifat", () => {
  assert.deepEqual(valideazaAbonare({ email: "  Maria@Exemplu.RO ", acord: true }), { ok: true, email: "maria@exemplu.ro" });
  assert.deepEqual(valideazaAbonare({ email: "maria@exemplu.ro", acord: false }), { ok: false, erori: { acord: "acord" } });
  assert.deepEqual(valideazaAbonare({ email: "maria@exemplu.ro" }), { ok: false, erori: { acord: "acord" } });
  assert.deepEqual(valideazaAbonare({ email: "", acord: true }), { ok: false, erori: { email: "lipsa" } });
  assert.deepEqual(valideazaAbonare({ email: "fără-arond", acord: true }), { ok: false, erori: { email: "invalid" } });
  assert.deepEqual(valideazaAbonare({ email: "x", acord: false }).erori, { email: "invalid", acord: "acord" });
});

test("acordul trebuie să fie exact true, nu orice valoare adevărată", () => {
  for (const acord of ["true", 1, "da", {}, [], null, undefined]) assert.equal(valideazaAbonare({ email: "a@b.ro", acord }).ok, false, String(acord));
});

test("adresele cu caractere care ar putea încurca antetele sau linkurile sunt refuzate", () => {
  for (const email of ["a@b.ro\nBcc: x@y.ro", "a b@c.ro", "<a@b.ro>", "a@b.ro,c@d.ro", 'a"b@c.ro', "a@b", "a@b.ro?x=1", "a@b.ro;c@d.ro"]) assert.equal(valideazaAbonare({ email, acord: true }).ok, false, JSON.stringify(email));
  assert.equal(valideazaAbonare({ email: "a@" + "b".repeat(260) + ".ro", acord: true }).ok, false, "prea lungă");
  assert.equal(valideazaAbonare({ email: 42, acord: true }).ok, false, "nu e text");
});
