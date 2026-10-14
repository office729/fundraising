import { test } from "node:test";
import assert from "node:assert/strict";

import { schimbarePlanBlocata } from "../src/lib/billing/schimbare-plan.ts";

const ZI = 86_400_000;
const acum = new Date("2026-10-14T10:00:00Z");
const dupa = (zile) => new Date(acum.getTime() + zile * ZI);
const plan = (extra = {}) => ({ package: "start", extraUsers: 0, subscriptionStatus: "active", currentPeriodEnd: dupa(100), ...extra });

test("fără perioadă plătită activă, orice plan se poate alege", () => {
  assert.equal(schimbarePlanBlocata(plan({ package: "trial", subscriptionStatus: "trialing", currentPeriodEnd: null }), { package: "impact", extraUsers: 0 }, acum), null);
  assert.equal(schimbarePlanBlocata(plan({ subscriptionStatus: "incomplete", currentPeriodEnd: null }), { package: "impact", extraUsers: 0 }, acum), null); // plan ales la înscriere, fără plată
  assert.equal(schimbarePlanBlocata(plan({ currentPeriodEnd: dupa(-1) }), { package: "impact", extraUsers: 0 }, acum), null); // perioada a expirat
  assert.equal(schimbarePlanBlocata(plan({ currentPeriodEnd: null }), { package: "impact", extraUsers: 0 }, acum), null); // rând vechi, fără dată de sfârșit
  assert.equal(schimbarePlanBlocata(plan({ subscriptionStatus: "canceled" }), { package: "impact", extraUsers: 0 }, acum), null);
});

test("reînnoirea aceluiași plan e permisă", () => {
  assert.equal(schimbarePlanBlocata(plan(), { package: "start", extraUsers: 0 }, acum), null);
  assert.equal(schimbarePlanBlocata(plan({ package: "impact" }), { package: "impact", extraUsers: 0 }, acum), null);
  assert.equal(schimbarePlanBlocata(plan({ package: "start", extraUsers: 3 }), { package: "start", extraUsers: 3 }, acum), null);
});

test("în mijlocul unei perioade plătite, schimbarea pachetului e blocată (upgrade și downgrade)", () => {
  const a = schimbarePlanBlocata(plan({ package: "start" }), { package: "impact", extraUsers: 0 }, acum);
  assert.match(a, /abonament plătit până la/);
  assert.match(a, /2027/);
  assert.ok(schimbarePlanBlocata(plan({ package: "impact" }), { package: "start", extraUsers: 0 }, acum));
  assert.ok(schimbarePlanBlocata(plan({ package: "crestere" }), { package: "impact", extraUsers: 0 }, acum));
});

test("la START, schimbarea numărului de utilizatori suplimentari e blocată; la alte pachete extra nu contează", () => {
  assert.ok(schimbarePlanBlocata(plan({ package: "start", extraUsers: 0 }), { package: "start", extraUsers: 4 }, acum));
  assert.ok(schimbarePlanBlocata(plan({ package: "start", extraUsers: 4 }), { package: "start", extraUsers: 0 }, acum));
  assert.equal(schimbarePlanBlocata(plan({ package: "impact", extraUsers: 2 }), { package: "impact", extraUsers: 4 }, acum), null);
});

test("planul personalizat în mijlocul unei perioade plătite e blocat chiar dacă pachetul rămâne custom", () => {
  assert.ok(schimbarePlanBlocata(plan({ package: "custom" }), { package: "custom", extraUsers: 0 }, acum));
  assert.ok(schimbarePlanBlocata(plan({ package: "start" }), { package: "custom", extraUsers: 0 }, acum));
});

test("limita exactă: perioada care se termină chiar acum nu mai blochează", () => {
  assert.equal(schimbarePlanBlocata(plan({ currentPeriodEnd: acum }), { package: "impact", extraUsers: 0 }, acum), null);
  assert.ok(schimbarePlanBlocata(plan({ currentPeriodEnd: new Date(acum.getTime() + 1) }), { package: "impact", extraUsers: 0 }, acum));
});
