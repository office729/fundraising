import { test } from "node:test";
import assert from "node:assert/strict";

const { CAMPANIE_GOALA, arataGol, avertismente, parseazaSuma, valideazaPas, valideazaTot } = await import("../src/app/(app)/[orgSlug]/crm/strangere-fonduri/campanie-validare.ts");
const { axaDeDecupare, pozitieCss, valideazaFisier } = await import("../src/app/(app)/[orgSlug]/crm/strangere-fonduri/campanie-poza.ts");

const buna = { ...CAMPANIE_GOALA, titlu: "Un acoperiș nou pentru centrul de zi", template: "social_incluziune", numeCreator: "Ana Popescu", emailCreator: "ana@exemplu.ro", poveste: "x".repeat(60) };

test("suma țintă: gol = fără țintă, separatori acceptați, valori invalide refuzate", () => {
  assert.deepEqual(parseazaSuma(""), { valoare: null, eroare: null });
  assert.equal(parseazaSuma("10.000").valoare, 10000);
  assert.equal(parseazaSuma("10 000").valoare, 10000);
  assert.equal(parseazaSuma("2500,6").valoare, 2501);
  assert.ok(parseazaSuma("0").eroare);
  assert.ok(parseazaSuma("abc").eroare);
  assert.ok(parseazaSuma("-5").eroare);
  assert.ok(parseazaSuma("99999999999").eroare);
});

test("pasul 1 cere titlu, domeniu, contact valid; cu date bune nu are erori", () => {
  assert.deepEqual(valideazaPas(0, buna), {});
  const e = valideazaPas(0, CAMPANIE_GOALA);
  assert.ok(e.titlu && e.template && e.numeCreator && e.emailCreator);
  assert.ok(valideazaPas(0, { ...buna, titlu: "abc" }).titlu);
  assert.ok(valideazaPas(0, { ...buna, titlu: "t".repeat(121) }).titlu);
  assert.ok(valideazaPas(0, { ...buna, emailCreator: "ana@" }).emailCreator);
  assert.ok(valideazaPas(0, { ...buna, sumaTinta: "-3" }).sumaTinta);
});

test("pasul 2 cere o poveste de câteva fraze", () => {
  assert.ok(valideazaPas(1, { ...buna, poveste: "" }).poveste);
  assert.ok(valideazaPas(1, { ...buna, poveste: "prea scurt" }).poveste);
  assert.ok(valideazaPas(1, { ...buna, poveste: "x".repeat(8001) }).poveste);
  assert.deepEqual(valideazaPas(1, buna), {});
});

test("validarea totală arată primul pas de corectat", () => {
  assert.equal(valideazaTot(buna).primulPas, null);
  assert.equal(valideazaTot({ ...buna, titlu: "" }).primulPas, 0);
  assert.equal(valideazaTot({ ...buna, poveste: "" }).primulPas, 1);
  assert.equal(valideazaTot({ ...buna, titlu: "", poveste: "" }).primulPas, 0);
});

test("avertismentele nu blochează: poveste scurtă, fără poză, țintă sau județ", () => {
  const chei = avertismente(buna, false).map((a) => a.cheie).sort();
  assert.deepEqual(chei, ["judet", "poveste", "poza", "tinta"]);
  const completa = { ...buna, poveste: "x".repeat(400), sumaTinta: "5000", judet: "Cluj" };
  assert.deepEqual(avertismente(completa, true), []);
});

test("formularul gol e recunoscut (ca draftul să nu se salveze degeaba)", () => {
  assert.equal(arataGol(CAMPANIE_GOALA), true);
  assert.equal(arataGol({ ...CAMPANIE_GOALA, template: "copii", numeCreator: "Ana", emailCreator: "a@b.ro" }), true);
  assert.equal(arataGol({ ...CAMPANIE_GOALA, titlu: "Ceva" }), false);
});

test("poza: tipuri și mărime acceptate, axa de decupare 16:9", () => {
  assert.equal(valideazaFisier({ type: "image/jpeg", size: 1_000_000 }), null);
  assert.ok(valideazaFisier({ type: "image/gif", size: 1000 }));
  assert.ok(valideazaFisier({ type: "image/svg+xml", size: 1000 }));
  assert.ok(valideazaFisier({ type: "image/png", size: 30 * 1024 * 1024 }));
  assert.equal(axaDeDecupare(1600, 900), null);
  assert.equal(axaDeDecupare(2000, 800), "x");
  assert.equal(axaDeDecupare(1000, 1500), "y");
  assert.equal(pozitieCss(1000, 1500, 30), "50% 30%");
  assert.equal(pozitieCss(2000, 800, 70), "70% 50%");
  assert.equal(pozitieCss(1600, 900, 70), "50% 50%");
});
