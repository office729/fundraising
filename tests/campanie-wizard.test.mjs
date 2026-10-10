import { test } from "node:test";
import assert from "node:assert/strict";

const { CAMPANIE_GOALA, adaugaZile, arataGol, avertismente, parseazaSuma, parseazaTermen, valideazaPas, valideazaTot, zileRamase } = await import("../src/app/(app)/[orgSlug]/crm/strangere-fonduri/campanie-validare.ts");
const { axaDeDecupare, pozitieCss, valideazaFisier } = await import("../src/app/(app)/[orgSlug]/crm/strangere-fonduri/campanie-poza.ts");
const { TEXTE_CAMPANIE } = await import("../src/app/(app)/[orgSlug]/crm/strangere-fonduri/campanie-texte.ts");

const AZI = "2026-10-10";
const buna = { ...CAMPANIE_GOALA, titlu: "Un acoperiș nou pentru centrul de zi", template: "social_incluziune", numeCreator: "Ana Popescu", emailCreator: "ana@exemplu.ro", poveste: "x".repeat(60) };

test("suma țintă: gol = fără țintă, separatori acceptați, valori invalide refuzate", () => {
  assert.deepEqual(parseazaSuma(""), { valoare: null, eroare: null });
  assert.equal(parseazaSuma("10.000").valoare, 10000);
  assert.equal(parseazaSuma("10 000").valoare, 10000);
  assert.equal(parseazaSuma("2500,6").valoare, 2501);
  assert.equal(parseazaSuma("0").eroare, "suma.invalida");
  assert.equal(parseazaSuma("abc").eroare, "suma.invalida");
  assert.equal(parseazaSuma("-5").eroare, "suma.invalida");
  assert.equal(parseazaSuma("99999999999").eroare, "suma.mare");
});

test("termenul: gol, dată validă, trecut, prea departe, dată inexistentă", () => {
  assert.deepEqual(parseazaTermen("", AZI), { valoare: null, eroare: null });
  assert.equal(parseazaTermen("2026-12-31", AZI).valoare, "2026-12-31");
  assert.equal(parseazaTermen(AZI, AZI).valoare, AZI);
  assert.equal(parseazaTermen("2026-10-09", AZI).eroare, "termen.trecut");
  assert.equal(parseazaTermen("2026-10-09", AZI, true).valoare, "2026-10-09");
  assert.equal(parseazaTermen("2031-01-01", AZI).eroare, "termen.departe");
  assert.equal(parseazaTermen("2026-02-30", AZI).eroare, "termen.invalid");
  assert.equal(parseazaTermen("10/10/2026", AZI).eroare, "termen.invalid");
});

test("zile rămase și adunarea de zile", () => {
  assert.equal(zileRamase("2026-10-10", AZI), 0);
  assert.equal(zileRamase("2026-10-11", AZI), 1);
  assert.equal(zileRamase("2026-12-09", AZI), 60);
  assert.equal(zileRamase("2026-10-01", AZI), -9);
  assert.equal(adaugaZile(AZI, 30), "2026-11-09");
  assert.equal(adaugaZile("2026-12-20", 30), "2027-01-19");
});

test("pasul 1 cere titlu, domeniu, contact valid; cu date bune nu are erori", () => {
  assert.deepEqual(valideazaPas(0, buna, AZI), {});
  const e = valideazaPas(0, CAMPANIE_GOALA, AZI);
  assert.ok(e.titlu && e.template && e.numeCreator && e.emailCreator);
  assert.equal(valideazaPas(0, { ...buna, titlu: "abc" }, AZI).titlu, "titlu.scurt");
  assert.equal(valideazaPas(0, { ...buna, titlu: "t".repeat(121) }, AZI).titlu, "titlu.lung");
  assert.equal(valideazaPas(0, { ...buna, emailCreator: "ana@" }, AZI).emailCreator, "email.invalid");
  assert.equal(valideazaPas(0, { ...buna, sumaTinta: "-3" }, AZI).sumaTinta, "suma.invalida");
  assert.equal(valideazaPas(0, { ...buna, termen: "2026-01-01" }, AZI).termen, "termen.trecut");
  assert.deepEqual(valideazaPas(0, { ...buna, termen: "2026-12-31" }, AZI), {});
});

test("pasul 2 cere o poveste de câteva fraze", () => {
  assert.equal(valideazaPas(1, { ...buna, poveste: "" }, AZI).poveste, "poveste.gol");
  assert.equal(valideazaPas(1, { ...buna, poveste: "prea scurt" }, AZI).poveste, "poveste.scurta");
  assert.equal(valideazaPas(1, { ...buna, poveste: "x".repeat(8001) }, AZI).poveste, "poveste.lunga");
  assert.deepEqual(valideazaPas(1, buna, AZI), {});
});

test("validarea totală arată primul pas de corectat", () => {
  assert.equal(valideazaTot(buna, AZI).primulPas, null);
  assert.equal(valideazaTot({ ...buna, titlu: "" }, AZI).primulPas, 0);
  assert.equal(valideazaTot({ ...buna, poveste: "" }, AZI).primulPas, 1);
  assert.equal(valideazaTot({ ...buna, titlu: "", poveste: "" }, AZI).primulPas, 0);
});

test("avertismentele nu blochează: poveste scurtă, fără poză, țintă, termen sau județ", () => {
  const chei = avertismente(buna, false).map((a) => a.cheie).sort();
  assert.deepEqual(chei, ["judet", "poveste", "poza", "termen", "tinta"]);
  const completa = { ...buna, poveste: "x".repeat(400), sumaTinta: "5000", judet: "Cluj", termen: "2026-12-31" };
  assert.deepEqual(avertismente(completa, true), []);
});

test("formularul gol e recunoscut (ca draftul să nu se salveze degeaba)", () => {
  assert.equal(arataGol(CAMPANIE_GOALA), true);
  assert.equal(arataGol({ ...CAMPANIE_GOALA, template: "copii", numeCreator: "Ana", emailCreator: "a@b.ro" }), true);
  assert.equal(arataGol({ ...CAMPANIE_GOALA, titlu: "Ceva" }), false);
  assert.equal(arataGol({ ...CAMPANIE_GOALA, termen: "2026-12-31" }), false);
});

test("poza: tipuri și mărime acceptate, axa de decupare 16:9", () => {
  assert.equal(valideazaFisier({ type: "image/jpeg", size: 1_000_000 }), null);
  assert.equal(valideazaFisier({ type: "image/gif", size: 1000 }), "tip");
  assert.equal(valideazaFisier({ type: "image/svg+xml", size: 1000 }), "tip");
  assert.equal(valideazaFisier({ type: "image/png", size: 30 * 1024 * 1024 }), "marime");
  assert.equal(axaDeDecupare(1600, 900), null);
  assert.equal(axaDeDecupare(2000, 800), "x");
  assert.equal(axaDeDecupare(1000, 1500), "y");
  assert.equal(pozitieCss(1000, 1500, 30), "50% 30%");
  assert.equal(pozitieCss(2000, 800, 70), "70% 50%");
  assert.equal(pozitieCss(1600, 900, 70), "50% 50%");
});

test("textele: fiecare cod de eroare și de avertisment are text în română și engleză", () => {
  for (const limba of ["ro", "en"]) {
    const t = TEXTE_CAMPANIE[limba];
    for (const cod of ["titlu.gol", "titlu.scurt", "titlu.lung", "template.gol", "suma.invalida", "suma.mare", "termen.invalid", "termen.trecut", "termen.departe", "nume.gol", "email.gol", "email.invalid", "poveste.gol", "poveste.scurta", "poveste.lunga"]) {
      assert.ok(t.erori[cod], `${limba}: ${cod}`);
    }
    for (const cod of ["poveste", "poza", "tinta", "termen", "judet"]) assert.ok(t.avertismente[cod], `${limba}: avertisment ${cod}`);
    assert.equal(t.pasi.length, 5);
  }
});
