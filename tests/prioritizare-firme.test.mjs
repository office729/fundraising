import { test } from "node:test";
import assert from "node:assert/strict";

const P = await import("../src/lib/prioritizare-firme.ts");

const baza = { regimFiscal: "necunoscut", profit: 500_000, ca: 6_000_000, sumaDisponibila: 30_000, areUrma: true };

test("firmă eligibilă și abordabilă = banda A", () => {
  assert.equal(P.bandaFirma(baza), "A");
});

test("eligibilă, fără urmă de contact, cu potențial mare = banda B; cu potențial mic = banda C", () => {
  assert.equal(P.bandaFirma({ ...baza, areUrma: false }), "B");
  assert.equal(P.bandaFirma({ ...baza, areUrma: false, sumaDisponibila: P.PRAG_BANDA_B }), "B");
  assert.equal(P.bandaFirma({ ...baza, areUrma: false, sumaDisponibila: P.PRAG_BANDA_B - 1 }), "C");
  assert.equal(P.bandaFirma({ ...baza, areUrma: false, sumaDisponibila: null }), "C");
});

test("micro, cu pierdere sau fără date financiare = banda C, oricât de abordabile", () => {
  assert.equal(P.bandaFirma({ ...baza, regimFiscal: "micro" }), "C");
  assert.equal(P.bandaFirma({ ...baza, regimFiscal: "pierdere" }), "C");
  assert.equal(P.bandaFirma({ ...baza, profit: null }), "C");
  assert.equal(P.bandaFirma({ ...baza, profit: -10 }), "C");
  assert.equal(P.bandaFirma({ ...baza, ca: P.PRAG_MICRO_CA - 1 }), "C");
});

test("regimul fiscal cunoscut „profit” e eligibil chiar dacă lipsesc profitul și cifra de afaceri", () => {
  assert.equal(P.bandaFirma({ regimFiscal: "profit", profit: null, ca: null, sumaDisponibila: null, areUrma: true }), "A");
  assert.equal(P.esteEligibilaD177({ regimFiscal: "profit", profit: null, ca: null }), true);
});

test("cifra de afaceri exact la prag e eligibilă; sub prag nu", () => {
  assert.equal(P.esteEligibilaD177({ regimFiscal: "necunoscut", profit: 1, ca: P.PRAG_MICRO_CA }), true);
  assert.equal(P.esteEligibilaD177({ regimFiscal: "necunoscut", profit: 1, ca: P.PRAG_MICRO_CA - 1 }), false);
});

test("scorul de contactabilitate: maximum 8, fiecare element contribuie", () => {
  assert.equal(P.scorContactabilitate({ site: true, retea: true, contactSalvat: true, telefon: true }), 8);
  assert.equal(P.scorContactabilitate({ site: false, retea: false, contactSalvat: false, telefon: false }), 0);
  assert.equal(P.scorContactabilitate({ site: true, retea: false, contactSalvat: true, telefon: false }), 5);
});

test("validarea benzii din adresă", () => {
  assert.equal(P.esteBanda("A"), true);
  assert.equal(P.esteBanda("D"), false);
  assert.equal(P.esteBanda(undefined), false);
});

test("suma estimată din bilanț: minimul dintre 0,75% din CA și 20% din impozit (16% din profit)", () => {
  // CA 10M, profit 1M: 0,75% din CA = 75.000; impozit 160.000, 20% = 32.000 → 32.000
  assert.equal(P.sumaSponsorizabilaEstimata({ regimFiscal: null, profit: 1_000_000, ca: 10_000_000, impozit: null }), 32_000);
  // CA 3M, profit 2M: 0,75% din CA = 22.500; 20% din impozit = 64.000 → 22.500
  assert.equal(P.sumaSponsorizabilaEstimata({ regimFiscal: "necunoscut", profit: 2_000_000, ca: 3_000_000, impozit: null }), 22_500);
});

test("suma estimată folosește impozitul din bilanț când există, nu 16% din profit", () => {
  assert.equal(P.sumaSponsorizabilaEstimata({ regimFiscal: null, profit: 1_000_000, ca: 10_000_000, impozit: 100_000 }), 20_000);
  assert.equal(P.sumaSponsorizabilaEstimata({ regimFiscal: null, profit: 1_000_000, ca: 10_000_000, impozit: 0 }), 32_000, "impozit 0 = necompletat");
});

test("suma estimată e 0 pentru micro, pierdere, fără profit sau sub pragul de CA", () => {
  assert.equal(P.sumaSponsorizabilaEstimata({ regimFiscal: "micro", profit: 500_000, ca: 20_000_000, impozit: null }), 0);
  assert.equal(P.sumaSponsorizabilaEstimata({ regimFiscal: "pierdere", profit: -10, ca: 20_000_000, impozit: null }), 0);
  assert.equal(P.sumaSponsorizabilaEstimata({ regimFiscal: null, profit: 0, ca: 20_000_000, impozit: null }), 0);
  assert.equal(P.sumaSponsorizabilaEstimata({ regimFiscal: null, profit: 900_000, ca: 2_499_999, impozit: null }), 0, "sub pragul micro");
  assert.equal(P.sumaSponsorizabilaEstimata({ regimFiscal: null, profit: null, ca: null, impozit: null }), 0);
  assert.equal(P.sumaSponsorizabilaEstimata({ regimFiscal: "profit", profit: null, ca: 5_000_000, impozit: null }), 0, "regim profit, dar fără impozit sau profit");
  assert.equal(P.sumaSponsorizabilaEstimata({ regimFiscal: "profit", profit: null, ca: 5_000_000, impozit: 100_000 }), 20_000);
});

test("suma efectivă: cea introdusă de mână are prioritate, estimarea doar ca fallback", () => {
  const x = { regimFiscal: null, profit: 1_000_000, ca: 10_000_000, impozit: null };
  assert.deepEqual(P.sumaEfectiva(5_000, x), { suma: 5_000, estimata: false });
  assert.deepEqual(P.sumaEfectiva(null, x), { suma: 32_000, estimata: true });
  assert.deepEqual(P.sumaEfectiva(0, x), { suma: 32_000, estimata: true }, "0 = necompletat");
  assert.deepEqual(P.sumaEfectiva(null, { regimFiscal: "micro", profit: 1, ca: 1, impozit: null }), { suma: 0, estimata: false });
});
