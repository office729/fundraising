import { test } from "node:test";
import assert from "node:assert/strict";

const {
  calculeazaNps,
  categorieNps,
  rezumaChestionare,
  trebuieInvitat,
  valideazaChestionar,
  valideazaSugestie,
  zileRamaseChestionar,
} = await import("../src/lib/feedback/calcule.ts");

const zile = (n) => new Date(Date.now() + n * 86_400_000);

test("NPS: promotori 9–10, pasivi 7–8, detractori 0–6", () => {
  assert.equal(categorieNps(10), "promotor");
  assert.equal(categorieNps(9), "promotor");
  assert.equal(categorieNps(8), "pasiv");
  assert.equal(categorieNps(7), "pasiv");
  assert.equal(categorieNps(6), "detractor");
  assert.equal(categorieNps(0), "detractor");
});

test("scorul NPS = % promotori − % detractori; fără răspunsuri nu există scor", () => {
  assert.equal(calculeazaNps([]).nps, null);
  const r = calculeazaNps([10, 9, 9, 8, 7, 3]);
  assert.deepEqual([r.nr, r.promotori, r.pasivi, r.detractori], [6, 3, 2, 1]);
  assert.equal(r.nps, 33); // (3−1)/6 = 33%
  assert.equal(calculeazaNps([10, 10]).nps, 100);
  assert.equal(calculeazaNps([0, 5]).nps, -100);
});

test("valorile în afara intervalului sau neîntregi nu intră în NPS", () => {
  const r = calculeazaNps([11, -1, 7.5, 9]);
  assert.equal(r.nr, 1);
  assert.equal(r.nps, 100);
});

test("chestionarul cere NPS și satisfacția generală; restul e opțional", () => {
  assert.equal(valideazaChestionar({}).ok, false);
  assert.equal(valideazaChestionar({ nps: 9 }).ok, false);
  assert.equal(valideazaChestionar({ nps: 11, satisfactie: 4 }).ok, false);
  assert.equal(valideazaChestionar({ nps: 9, satisfactie: 6 }).ok, false);
  const r = valideazaChestionar({ nps: 9, satisfactie: 4 });
  assert.equal(r.ok, true);
  assert.equal(r.v.cePlace, null);
  assert.equal(r.v.poateContacta, false);
});

test("chestionarul păstrează doar ariile și modulele cunoscute și taie textele lungi", () => {
  const r = valideazaChestionar({
    nps: "8",
    satisfactie: 5,
    note: { usurinta: 4, pret: 9, inventat: 3, viteza: "2" },
    module: ["granturi", "granturi", "ceva-inventat", 7],
    cePlace: "  Ok  ",
    ceLipseste: "x".repeat(5000),
    poateContacta: true,
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.v.note, { usurinta: 4, viteza: 2 });
  assert.deepEqual(r.v.module, ["granturi"]);
  assert.equal(r.v.cePlace, "Ok");
  assert.equal(r.v.ceLipseste.length, 1500);
  assert.equal(r.v.poateContacta, true);
});

test("sugestia cere o categorie cunoscută, un titlu și o descriere", () => {
  const bun = { categorie: "functie-noua", titlu: "Export în Excel", mesaj: "Aș vrea să export donatorii în Excel." };
  assert.equal(valideazaSugestie(bun).ok, true);
  assert.equal(valideazaSugestie({ ...bun, categorie: "altceva-inventat" }).ok, false);
  assert.equal(valideazaSugestie({ ...bun, titlu: "ab" }).ok, false);
  assert.equal(valideazaSugestie({ ...bun, mesaj: "scurt" }).ok, false);
  assert.equal(valideazaSugestie(null).ok, false);
  const lung = valideazaSugestie({ ...bun, titlu: "t".repeat(300), mesaj: "m".repeat(9000) });
  assert.equal(lung.v.titlu.length, 120);
  assert.equal(lung.v.mesaj.length, 2000);
});

test("invitația apare după 5 zile de la înscriere și nu se repetă 90 de zile după un răspuns", () => {
  const acum = new Date();
  assert.equal(trebuieInvitat(2, null, acum), false);
  assert.equal(trebuieInvitat(5, null, acum), true);
  assert.equal(trebuieInvitat(40, zile(-10), acum), false);
  assert.equal(trebuieInvitat(200, zile(-91), acum), true);
});

test("un utilizator poate trimite un chestionar pe lună", () => {
  const acum = new Date();
  assert.equal(zileRamaseChestionar(null, acum), 0);
  assert.equal(zileRamaseChestionar(zile(-31), acum), 0);
  assert.equal(zileRamaseChestionar(zile(-10), acum), 20);
});

test("rezumatul agregă NPS, media pe arii, modulele folosite și evoluția lunară", () => {
  const r = rezumaChestionare([
    { nps: 10, satisfactie: 5, note: { usurinta: 5, pret: 3 }, module: ["granturi", "donatori"], createdAt: new Date("2026-01-10T10:00:00Z") },
    { nps: 4, satisfactie: 2, note: { usurinta: 3 }, module: ["donatori"], createdAt: new Date("2026-02-03T10:00:00Z") },
    { nps: 9, satisfactie: 4, note: {}, module: [], createdAt: new Date("2026-02-20T10:00:00Z") },
  ]);
  assert.equal(r.nr, 3);
  assert.equal(r.nps.nps, 33);
  assert.equal(r.satisfactieMedie, 3.7);
  const usurinta = r.mediiArii.find((a) => a.cheie === "usurinta");
  assert.deepEqual([usurinta.medie, usurinta.nr], [4, 2]);
  assert.equal(r.mediiArii.find((a) => a.cheie === "suport").medie, null);
  assert.deepEqual(r.moduleFrecvente.map((m) => [m.cheie, m.nr]), [["donatori", 2], ["granturi", 1]]);
  assert.deepEqual(r.pelUna, [{ luna: "2026-01", nr: 1, nps: 100 }, { luna: "2026-02", nr: 2, nps: 0 }]);
});

const { chestionarulCerePrompt, compuneChestionarCuProblema, compuneSugestie } = await import("../src/lib/feedback/notificare-continut.ts");

test("e-mailul de alertă pentru chestionar pleacă doar la scor scăzut", () => {
  assert.equal(chestionarulCerePrompt(6, 5), true);
  assert.equal(chestionarulCerePrompt(9, 2), true);
  assert.equal(chestionarulCerePrompt(7, 3), false);
  assert.equal(chestionarulCerePrompt(10, 5), false);
});

test("e-mailul despre o sugestie scapă HTML-ul din text și arată contactul doar dacă există", () => {
  const cu = compuneSugestie({ orgNume: "ONG <b>X</b>", categorie: "O funcție nouă", titlu: "Export", mesaj: "<script>alert(1)</script>\nrând doi", contact: "a@b.ro" }, "https://exemplu.ro/p");
  assert.match(cu.subiect, /Sugestie nouă de la ONG <b>X<\/b>: Export/); // subiectul e text simplu, nu HTML
  assert.ok(!cu.html.includes("<script>"));
  assert.ok(cu.html.includes("&lt;script&gt;"));
  assert.ok(cu.html.includes("rând doi") && cu.html.includes("<br>"));
  assert.ok(cu.html.includes("a@b.ro"));
  const fara = compuneSugestie({ orgNume: "ONG", categorie: "x", titlu: "Titlu", mesaj: "Mesaj lung", contact: null }, "https://exemplu.ro/p");
  assert.ok(!fara.html.includes("Contact:"));
});

test("e-mailul despre un chestionar cu probleme conține scorurile și textele", () => {
  const e = compuneChestionarCuProblema({ orgNume: "ONG", nps: 3, satisfactie: 2, cePlace: null, ceLipseste: "Export", contact: null }, "https://exemplu.ro/p");
  assert.match(e.subiect, /NPS 3, satisfacție 2\/5/);
  assert.ok(e.html.includes("Export") && e.html.includes("https://exemplu.ro/p"));
  assert.ok(!e.html.includes("Ce îi place"));
});
