import { test } from "node:test";
import assert from "node:assert/strict";

const R = await import("../src/lib/gdpr-module-noi-reguli.ts");

// ---------- retenția de 24 de luni ----------

test("limita de retenție: 24 de luni calendaristice înapoi, în UTC", () => {
  assert.equal(R.limitaRetentieEmailuri(new Date("2026-11-04T10:30:00.000Z")).toISOString(), "2024-11-04T10:30:00.000Z");
  assert.equal(R.limitaRetentieEmailuri(new Date("2026-01-15T00:00:00.000Z")).toISOString(), "2024-01-15T00:00:00.000Z");
});

test("limita de retenție: ziua 29 februarie / 31 se strânge la ultima zi a lunii țintă", () => {
  // 29 februarie 2028 − 24 de luni = februarie 2026 (are 28 de zile)
  assert.equal(R.limitaRetentieEmailuri(new Date("2028-02-29T12:00:00.000Z")).toISOString(), "2026-02-28T12:00:00.000Z");
  // 31 martie − 1 lună = 28/29 februarie
  assert.equal(R.limitaRetentieEmailuri(new Date("2027-03-31T00:00:00.000Z"), 1).toISOString(), "2027-02-28T00:00:00.000Z");
  assert.equal(R.limitaRetentieEmailuri(new Date("2028-03-31T00:00:00.000Z"), 1).toISOString(), "2028-02-29T00:00:00.000Z");
});

test("limita de retenție: trecerea peste ani și lunile negative sunt tratate", () => {
  assert.equal(R.limitaRetentieEmailuri(new Date("2026-03-10T08:00:00.000Z"), 5).toISOString(), "2025-10-10T08:00:00.000Z");
  assert.equal(R.limitaRetentieEmailuri(new Date("2026-03-10T08:00:00.000Z"), 0).toISOString(), "2026-03-10T08:00:00.000Z");
  assert.equal(R.limitaRetentieEmailuri(new Date("2026-03-10T08:00:00.000Z"), -3).toISOString(), "2026-03-10T08:00:00.000Z");
  assert.equal(R.LUNI_RETENTIE_EMAILURI, 24);
});

test("un email trimis cu 23 de luni în urmă e păstrat, unul de acum 25 de luni expiră", () => {
  const acum = new Date("2026-11-04T10:00:00.000Z");
  const limita = R.limitaRetentieEmailuri(acum);
  assert.ok(new Date("2024-12-04T10:00:00.000Z") > limita, "23 de luni rămân");
  assert.ok(new Date("2024-10-04T10:00:00.000Z") < limita, "25 de luni expiră");
});

// ---------- valori anonimizate ----------

test("valorile de înlocuire sunt recunoscute", () => {
  assert.equal(R.esteValoareAnonimizata("[șters]"), true);
  assert.equal(R.esteValoareAnonimizata("[expirat]"), true);
  assert.equal(R.esteValoareAnonimizata("ana@exemplu.ro"), false);
  assert.equal(R.esteValoareAnonimizata(null), false);
});

// ---------- handle și LinkedIn ----------

test("handle-ul introdus în panou e curățat și plafonat", () => {
  assert.equal(R.curataHandle("  @ana.pop \n"), "@ana.pop");
  assert.equal(R.curataHandle("   "), null);
  assert.equal(R.curataHandle(undefined), null);
  assert.equal(R.curataHandle(42), null);
  assert.equal(R.curataHandle("a\u0000b\tc"), "a b c");
  assert.equal(R.curataHandle("x".repeat(500))?.length, 300);
});

test("doar linkul de profil LinkedIn identifică un candidat", () => {
  assert.equal(R.slugLinkedinDinHandle("https://www.linkedin.com/in/Ana-Pop-123/?locale=ro"), "ana-pop-123");
  assert.equal(R.slugLinkedinDinHandle("linkedin.com/in/ana-pop"), "ana-pop");
  assert.equal(R.slugLinkedinDinHandle("ro.linkedin.com/in/ana%2Dpop"), "ana-pop");
  assert.equal(R.slugLinkedinDinHandle("@ana.pop"), null);
  assert.equal(R.slugLinkedinDinHandle("https://www.linkedin.com/company/acme"), null);
  assert.equal(R.slugLinkedinDinHandle("https://exemplu.ro/linkedin.com/in/x"), null);
  assert.equal(R.slugLinkedinDinHandle(null), null);
});

// ---------- total ----------

test("butonul de ștergere ține cont doar de ce se poate șterge din modulele noi", () => {
  assert.equal(R.totalSurseNoi({ emailuriAgent: 0, candidatiProspectare: 0, influenceri: 0 }), 0);
  assert.equal(R.totalSurseNoi({ emailuriAgent: 2, candidatiProspectare: 1, influenceri: 3 }), 6);
});
