import { test } from "node:test";
import assert from "node:assert/strict";

import { esteAbonamentPlatit, isAccessBlocked } from "../src/lib/billing/trial.ts";

const ZI = 86_400_000;
const acum = Date.now();
const dupa = (zile) => new Date(acum + zile * ZI);

test("abonament plătit = activ ȘI perioada nu a expirat", () => {
  assert.equal(esteAbonamentPlatit({ subscriptionStatus: "active", currentPeriodEnd: dupa(5) }), true);
  assert.equal(esteAbonamentPlatit({ subscriptionStatus: "active", currentPeriodEnd: dupa(-1) }), false);
  assert.equal(esteAbonamentPlatit({ subscriptionStatus: "incomplete", currentPeriodEnd: null }), false); // plan ales la înscriere, fără plată
  assert.equal(esteAbonamentPlatit({ subscriptionStatus: "trialing", currentPeriodEnd: dupa(10) }), false);
});

test("proba de 30 de zile", () => {
  const org = (zileDeLaCreare) => ({ createdAt: dupa(-zileDeLaCreare), subscriptionStatus: "trialing", package: "trial" });
  assert.equal(isAccessBlocked(org(10)), false);
  assert.equal(isAccessBlocked(org(40)), true);
});

test("grație de 14 zile după sfârșitul unei perioade plătite", () => {
  const baza = { createdAt: dupa(-200), subscriptionStatus: "active", package: "start" };
  assert.equal(isAccessBlocked({ ...baza, currentPeriodEnd: dupa(3) }), false); // încă plătit
  assert.equal(isAccessBlocked({ ...baza, currentPeriodEnd: dupa(-5) }), false); // în grație
  assert.equal(isAccessBlocked({ ...baza, currentPeriodEnd: dupa(-20) }), true); // grația a trecut
});

test("administratorii platformei nu sunt niciodată blocați", () => {
  const expirat = { createdAt: dupa(-400), subscriptionStatus: "canceled", package: "trial" };
  assert.equal(isAccessBlocked(expirat), true);
  assert.equal(isAccessBlocked(expirat, "andrei.placinta@alexandrit.ro"), false);
});

test("adresa de pe domeniul inexistent NU mai e administrator", () => {
  const expirat = { createdAt: dupa(-400), subscriptionStatus: "canceled", package: "trial" };
  assert.equal(isAccessBlocked(expirat, "vlad.placinta@fundrasingacademy.ro"), true);
});
