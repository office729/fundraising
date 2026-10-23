import { test } from "node:test";
import assert from "node:assert/strict";

const S = await import("../src/lib/prospectare/motor.ts");

// Scorul de decident după audit: titluri reale din firme românești.
test("Sustainability/Sustenabilitate sunt CSR (prioritatea 3), inclusiv forme lungi", () => {
  assert.equal(S.scorDecident("Sustainability Manager").prioritate, 3);
  assert.equal(S.scorDecident("Director Sustenabilitate").prioritate, 3);
  assert.equal(S.scorDecident("Head of Corporate Social Responsibility").prioritate, 3);
  assert.equal(S.etichetaRol("ESG Lead"), "CSR / sustenabilitate");
});

test("Vice President nu e CEO; asistenții de conducere nu sunt ținta", () => {
  const vp = S.scorDecident("Vice President Sales");
  assert.notEqual(vp.prioritate, 1);
  assert.ok(vp.scor < S.scorDecident("CEO").scor - 40, `${vp.scor}`);
  assert.notEqual(S.scorDecident("Vicepreședinte").prioritate, 1);
  assert.ok(S.scorDecident("Executive Assistant to CEO").scor < S.SCOR_MINIM);
  assert.ok(S.scorDecident("Asistent director general").scor < S.SCOR_MINIM);
  assert.ok(S.scorDecident("Secretar").scor < S.SCOR_MINIM);
  assert.equal(S.etichetaRol("Executive Assistant to CEO"), "");
});

test("„Administrator” de firmă da, de rețea/sisteme/baze de date nu", () => {
  assert.equal(S.scorDecident("Administrator").prioritate, 1);
  assert.equal(S.scorDecident("Administrator unic").prioritate, 1);
  assert.equal(S.scorDecident("Administrator magazin").prioritate, 1);
  for (const t of ["Administrator rețea", "System Administrator", "Administrator baze de date", "Network Administrator", "Office Administrator", "Administrator contracte", "Administrator IT"]) {
    assert.notEqual(S.scorDecident(t).prioritate, 1, t);
    assert.ok(S.scorDecident(t).scor < S.SCOR_MINIM, `${t}: ${S.scorDecident(t).scor}`);
  }
});

test("finanțe: Finance Manager și Financial Controller sunt prioritatea 2; contabilul simplu e sub contabilul-șef", () => {
  assert.equal(S.scorDecident("Finance Manager").prioritate, 2);
  assert.equal(S.scorDecident("Financial Controller").prioritate, 2);
  assert.equal(S.scorDecident("Șef serviciu financiar-contabil").prioritate, 2);
  assert.ok(S.scorDecident("Contabil șef").scor > S.scorDecident("Contabil").scor);
  assert.equal(S.etichetaRol("Contabil șef"), "Intermediar (știe de D177)");
  assert.equal(S.etichetaRol("Director Financiar"), "Decide bugetul");
});

test("parteneri de birou sunt decidenți; „Channel Partner” sau „Partner Manager” nu", () => {
  assert.equal(S.scorDecident("Managing Partner").prioritate, 1);
  assert.equal(S.scorDecident("Partener coordonator").prioritate, 1);
  assert.notEqual(S.scorDecident("Channel Partner Manager").prioritate, 1);
  assert.notEqual(S.scorDecident("Partner Success Manager").prioritate, 1);
  assert.notEqual(S.scorDecident("HR Business Partner").prioritate, 1);
});

test("Marketing Manager contează la prioritatea 4; Director IT, producție, logistică nu mai trec", () => {
  assert.equal(S.scorDecident("Marketing Manager").prioritate, 4);
  assert.equal(S.scorDecident("Brand Manager").prioritate, 4);
  for (const t of ["Director IT", "Director Producție", "Director Logistică", "Director Tehnic", "Chief Technology Officer", "Director Achiziții"]) {
    assert.ok(S.scorDecident(t).scor < S.SCOR_MINIM, `${t}: ${S.scorDecident(t).scor}`);
  }
});

test("Director General e la nivelul CEO; bonusul „România” doar când furnizorul a confirmat țara", () => {
  const dg = S.scorDecident("Director General");
  assert.equal(dg.prioritate, 1);
  assert.ok(dg.scor >= S.scorDecident("Administrator").scor, "Director General nu e sub Administrator");
  assert.ok(dg.scor >= 100);
  assert.equal(S.scorDecident("Administrator", { romania: true }).scor - S.scorDecident("Administrator").scor, 10);
});

test("grupuri de rol și alegerea pe roluri: decident, buget și CSR/marketing, nu cinci directori generali", () => {
  assert.equal(S.grupRol(1), "decident");
  assert.equal(S.grupRol(2), "buget");
  assert.equal(S.grupRol(3), "csr");
  assert.equal(S.grupRol(4), "csr");
  assert.equal(S.grupRol(null), "altul");
  const lista = [
    { nume: "A", scor: 130, prioritate: 1 },
    { nume: "B", scor: 125, prioritate: 1 },
    { nume: "C", scor: 120, prioritate: 1 },
    { nume: "D", scor: 118, prioritate: 1 },
    { nume: "E", scor: 117, prioritate: 1 },
    { nume: "F", scor: 90, prioritate: 2 },
    { nume: "G", scor: 80, prioritate: 4 },
  ];
  const alesi = S.alegeCandidati(lista, 5).map((x) => x.nume);
  assert.equal(alesi.length, 5);
  assert.ok(alesi.includes("F"), "omul de la finanțe intră");
  assert.ok(alesi.includes("G"), "CSR/marketing intră");
  assert.ok(alesi.includes("A"));
  assert.ok(!alesi.includes("E"), "al cincilea director general iese în favoarea celor de pe alte roluri");
});

test("la scor egal, decidentul (prioritatea 1) urcă înaintea celorlalți", () => {
  const alesi = S.alegeCandidati([{ nume: "X", scor: 120, prioritate: 2 }, { nume: "Y", scor: 120, prioritate: 1 }], 2).map((x) => x.nume);
  assert.deepEqual(alesi, ["Y", "X"]);
});

test("LinkedIn: doar linkedin.com; altceva (javascript:, alte site-uri) dispare; parametrii de urmărire se taie", () => {
  assert.equal(S.linkedinSigur("https://www.linkedin.com/in/ion-popescu/?trk=x"), "https://www.linkedin.com/in/ion-popescu");
  assert.equal(S.linkedinSigur("linkedin.com/in/ion"), "https://linkedin.com/in/ion");
  assert.equal(S.linkedinSigur("https://ro.linkedin.com/in/ion"), "https://ro.linkedin.com/in/ion");
  assert.equal(S.linkedinSigur("javascript:alert(1)"), "");
  assert.equal(S.linkedinSigur("https://evil.com/in/ion"), "");
  assert.equal(S.linkedinSigur("https://linkedin.com.evil.com/in/ion"), "");
  assert.equal(S.linkedinSigur("https://linkedin.com/feed"), "");
  assert.equal(S.linkedinSigur(null), "");
});

test("mesajele furnizorilor: fără caractere de control, fără cheia repetată, scurte", () => {
  assert.equal(S.curataMesaj("Invalid key abcdefgh12345678 for user", ["abcdefgh12345678"]), "Invalid key [cheie] for user");
  assert.equal(S.curataMesaj("a\u0000b\nc\td"), "a b c d");
  assert.ok(S.curataMesaj("x".repeat(500)).length <= 220);
  assert.equal(S.curataMesaj("cheie scurtă abc", ["abc"]), "cheie scurtă abc", "chei sub 8 caractere nu se înlocuiesc (ar strica textul)");
});
