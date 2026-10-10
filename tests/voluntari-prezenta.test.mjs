import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

process.env.ORG_SECRETS_KEY = randomBytes(32).toString("base64");
const { SLOT_MS, inFereastraCheckin, linkCoordonatorValabil, qrPrezentaDisponibil, tokenPrezenta, tokenPrezentaValid } = await import("../src/lib/voluntari-prezenta.ts");

const TURA = "11111111-1111-4111-8111-111111111111";
const ALTA = "22222222-2222-4222-8222-222222222222";

test("tokenul de prezență e legat de tură și se schimbă la fiecare 5 minute", () => {
  assert.equal(qrPrezentaDisponibil(), true);
  const t0 = 1_800_000_000_000;
  const a = tokenPrezenta(TURA, t0);
  assert.equal(tokenPrezentaValid(TURA, a, t0), true);
  assert.equal(tokenPrezentaValid(ALTA, a, t0), false, "alt shift");
  assert.notEqual(tokenPrezenta(TURA, t0 + SLOT_MS), a);
});

test("tokenul vechi mai merge un slot (limita dintre coduri), apoi expiră", () => {
  const slotStart = Math.floor(1_800_000_000_000 / SLOT_MS) * SLOT_MS;
  const a = tokenPrezenta(TURA, slotStart + 1000);
  assert.equal(tokenPrezentaValid(TURA, a, slotStart + SLOT_MS + 1000), true);
  assert.equal(tokenPrezentaValid(TURA, a, slotStart + 2 * SLOT_MS + 1000), false);
});

test("tokenuri invalide sunt refuzate", () => {
  assert.equal(tokenPrezentaValid(TURA, "", 1), false);
  assert.equal(tokenPrezentaValid(TURA, "x".repeat(22), 1), false);
  assert.equal(tokenPrezentaValid(TURA, undefined, 1), false);
});

test("fereastra de check-in și valabilitatea linkului de coordonator", () => {
  const inceput = new Date("2026-11-14T07:00:00Z");
  const sfarsit = new Date("2026-11-14T10:00:00Z");
  assert.equal(inFereastraCheckin(inceput, sfarsit, inceput.getTime() - 31 * 60_000), false);
  assert.equal(inFereastraCheckin(inceput, sfarsit, inceput.getTime() - 29 * 60_000), true);
  assert.equal(inFereastraCheckin(inceput, sfarsit, sfarsit.getTime() + 59 * 60_000), true);
  assert.equal(inFereastraCheckin(inceput, sfarsit, sfarsit.getTime() + 61 * 60_000), false);
  assert.equal(linkCoordonatorValabil(sfarsit, sfarsit.getTime() + 2 * 86_400_000), true);
  assert.equal(linkCoordonatorValabil(sfarsit, sfarsit.getTime() + 4 * 86_400_000), false);
});

test("fără cheie, codul QR e dezactivat", async () => {
  const salvat = process.env.ORG_SECRETS_KEY;
  delete process.env.ORG_SECRETS_KEY;
  assert.equal(qrPrezentaDisponibil(), false);
  assert.equal(tokenPrezenta(TURA, 1), null);
  assert.equal(tokenPrezentaValid(TURA, "abc", 1), false);
  process.env.ORG_SECRETS_KEY = salvat;
});
