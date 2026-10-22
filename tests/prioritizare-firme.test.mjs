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
