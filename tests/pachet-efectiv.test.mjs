import { test } from "node:test";
import assert from "node:assert/strict";

const { pachetEfectiv, TRIAL_DAYS } = await import("../src/lib/billing/trial.ts");

const zile = (n) => new Date(Date.now() + n * 86_400_000);
const org = (extra) => ({ package: "start", createdAt: zile(-1), subscriptionStatus: "incomplete", currentPeriodEnd: null, ...extra });

test("în proba gratuită, planul ales la înscriere nu limitează accesul: pachet efectiv „trial”", () => {
  for (const ales of ["start", "crestere", "impact", "custom", "trial"]) assert.equal(pachetEfectiv(org({ package: ales })), "trial", ales);
  assert.equal(pachetEfectiv(org({ createdAt: zile(-(TRIAL_DAYS - 1)) })), "trial");
});

test("după probă, fără plată, rămâne pachetul salvat (accesul e blocat separat)", () => {
  assert.equal(pachetEfectiv(org({ createdAt: zile(-(TRIAL_DAYS + 1)) })), "start");
  assert.equal(pachetEfectiv(org({ package: "impact", createdAt: zile(-100), subscriptionStatus: "canceled" })), "impact");
});

test("cine a plătit are pachetul plătit, chiar în primele 30 de zile", () => {
  assert.equal(pachetEfectiv(org({ package: "crestere", subscriptionStatus: "active", currentPeriodEnd: zile(20) })), "crestere");
  // rânduri mai vechi: activ, fără dată de sfârșit
  assert.equal(pachetEfectiv(org({ package: "crestere", subscriptionStatus: "active", createdAt: zile(-400), currentPeriodEnd: null })), "crestere");
});

test("perioada de grație de după o perioadă plătită păstrează pachetul", () => {
  assert.equal(pachetEfectiv(org({ package: "impact", subscriptionStatus: "active", createdAt: zile(-200), currentPeriodEnd: zile(-3) })), "impact");
});
