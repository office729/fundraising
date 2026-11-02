import { test } from "node:test";
import assert from "node:assert/strict";

const { semnalConsimtamant, esteCookieNewsman } = await import("../src/lib/newsman-consimtamant.ts");
const { esteCaleCuPixel } = await import("../src/lib/meta-pixel-cale.ts");

// Replică fidelă a verificării din scriptul Newsman (t.js, funcția care citește `window.dataLayer` când nu există google_tag_data.ics): urmărirea pornește doar dacă
// ultimele semnale `consent` acordă toate cele trei permisiuni; fără niciun semnal, nu pornește.
function newsmanUrmareste(dataLayer) {
  let vazut = false;
  const nd = {};
  const nu = {};
  for (const r of dataLayer) {
    if (!r || typeof r !== "object" || r[0] !== "consent") continue;
    const c = r[1];
    const s = r[2];
    if ((c !== "default" && c !== "update") || !s || typeof s !== "object") continue;
    vazut = true;
    const tinta = c === "default" ? nd : nu;
    for (const k in s) if (s[k] === "granted" || s[k] === "denied") tinta[k] = s[k] === "granted";
  }
  if (!vazut) return false;
  const t = Object.assign({ ad_storage: true, ad_user_data: true, ad_personalization: true }, nd, nu);
  return t.ad_storage && t.ad_user_data && t.ad_personalization;
}

test("semnalul de consimțământ: toate cele trei permisiuni, acordate sau refuzate împreună", () => {
  assert.deepEqual(semnalConsimtamant(true), { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
  assert.deepEqual(semnalConsimtamant(false), { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
});

test("scriptul Newsman urmărește doar după un semnal acordat și se oprește la retragere", () => {
  const arg = (...a) => Object.assign({ length: a.length }, a); // ca `arguments` din gtag
  assert.equal(newsmanUrmareste([]), false, "fără semnal nu urmărește");
  assert.equal(newsmanUrmareste([arg("consent", "update", semnalConsimtamant(true))]), true);
  assert.equal(newsmanUrmareste([arg("consent", "update", semnalConsimtamant(true)), arg("consent", "update", semnalConsimtamant(false))]), false, "retragerea oprește");
  assert.equal(newsmanUrmareste([arg("consent", "update", semnalConsimtamant(false)), arg("consent", "update", semnalConsimtamant(true))]), true, "acordul dat după refuz pornește");
  assert.equal(newsmanUrmareste([arg("js", new Date()), arg("config", "G-X")]), false, "alte comenzi gtag nu contează");
});

test("cookie-urile Newsman se recunosc după prefix, celelalte nu", () => {
  for (const ok of ["_nzm_id_96404-14305", "_nzm_idnl_96404-14305", "_nzm_nosubscribe_1"]) assert.equal(esteCookieNewsman(ok), true, ok);
  for (const nu of ["_ga", "_ga_ABC", "_fbp", "fa_locale", "sb-x-auth-token", "nzm_id", "x_nzm_id"]) assert.equal(esteCookieNewsman(nu), false, nu);
});

test("Newsman rulează pe aceleași pagini publice ca Pixelul Meta, niciodată în aplicație", () => {
  for (const ok of ["/", "/hub", "/blog/un-articol"]) assert.equal(esteCaleCuPixel(ok), true, ok);
  for (const nu of ["/salveaza-o-inima/crm", "/f230/salveaza-o-inima/principal", "/cookies", "/abonament/org/rezultat"]) assert.equal(esteCaleCuPixel(nu), false, nu);
});
