import { test } from "node:test";
import assert from "node:assert/strict";

import { categorieZona, trebuieRaportat } from "../src/lib/monitoring-categorii.ts";

test("zonele care mută bani sunt „plati”, indiferent de prefix", () => {
  for (const z of ["netopia-ipn", "netopia-reinnoire-taxare", "stripe-webhook", "stripe-pi-failed", "oblio-factura", "donatie-express", "donatie-sesiune-stripe", "donatie-paypal", "portal-donator-card", "alerta-operator"]) {
    assert.equal(categorieZona(z), "plati", z);
  }
});

test("lucrările programate sunt „cron”", () => {
  for (const z of ["cron-formular230", "cron-granturi", "gdpr-persoane-retentie", "retentie", "retentie-email", "performanta-automatizari", "statistici-campanii-retentie", "granturi-reminder", "calendar-rezumat", "voluntari-send", "formular230-insert"]) {
    assert.equal(categorieZona(z), "cron", z);
  }
});

test("restul sunt „altele”; un prefix doar asemănător nu se potrivește", () => {
  for (const z of ["ai", "pdf-direct", "canva-oauth-callback", "twilio-voice", "netopiafoo", "stripefoo", "donatiefoo"]) {
    assert.equal(categorieZona(z), "altele", z);
  }
});

test("limitare: prima raportare trece, următoarele în 10 minute nu, apoi din nou", () => {
  const m = new Map();
  const T = 10 * 60_000;
  assert.equal(trebuieRaportat(m, "a", 1_000, T), true);
  assert.equal(trebuieRaportat(m, "a", 2_000, T), false);
  assert.equal(trebuieRaportat(m, "a", 1_000 + T - 1, T), false);
  assert.equal(trebuieRaportat(m, "a", 1_000 + T, T), true);
  assert.equal(trebuieRaportat(m, "b", 2_000, T), true, "cheie diferită, raportare separată");
});

test("limitare: memoria nu crește fără limită", () => {
  const m = new Map();
  for (let i = 0; i < 1000; i++) trebuieRaportat(m, `k${i}`, i * 1_000_000, 10 * 60_000);
  assert.ok(m.size <= 201, String(m.size));
});
