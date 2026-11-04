import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_CAMPANII_IN_PROMPT,
  MAX_PROPUNERI,
  campaniePotrivita,
  construiestePrompt,
  curataEticheta,
  extrageJson,
  saptamanaAnalizei,
  valideazaAnaliza,
} from "../src/lib/reclame/analiza-ai.ts";

const BUN = {
  rezumat: "Săptămâna a adus 12 donații la 1.800 lei cheltuiți.",
  castigatoare: [{ campanie: "Craciun 2026 – Meta", motiv: "ROAS net 2,4× pe 14 donații." }],
  pierderi: [{ campanie: "Reach general", motiv: "420 lei fără nicio donație atribuită." }],
  propuneri: [
    { tip: "buget", campanie: "Craciun 2026 – Meta", titlu: "Crește bugetul cu 20%", detalii: "Are ROAS 2,4× pe 14 donații.", text_nou: null },
    { tip: "text", campanie: null, titlu: "Text nou", detalii: "Mesajul actual e prea lung.", text_nou: "Fiecare leu ajunge la tratament." },
  ],
  de_verificat: ["Campania „Reach general” nu are cod UTM legat."],
};

const campanie = (nr, extra = {}) => ({
  eticheta: `Campanie ${nr}`,
  platforma: "Meta",
  codUtm: `cmp_${nr}`,
  legata: true,
  cheltuialaLei: 100 + nr,
  afisari: 1000,
  clicuriPlatforma: 50,
  vizitatoriLink: 40,
  deschideriFormular: 8,
  donatii: 3,
  donatiiNeteLei: 150.456,
  donatoriNoi: 2,
  costPerDonatieLei: 33.3333,
  roasNet: 1.5012,
  saptamanaAnterioara: null,
  ...extra,
});

const DATE = (campanii) => ({
  perioada: { de: "2026-10-26", pana: "2026-11-01" },
  anterioara: { de: "2026-10-19", pana: "2026-10-25" },
  fereastraZile: 7,
  totaluri: { cheltuialaLei: 1800, donatii: 12, donatiiNeteLei: 2400, donatoriNoi: 7, roasNet: 1.33 },
  totaluriAnterioare: { cheltuialaLei: 1500, donatii: 9, donatiiNeteLei: 1700, donatoriNoi: 5, roasNet: 1.13 },
  campanii,
  calitate: { costNealocatLei: 0, donatiiFaraCostLegat: 0 },
});

test("un răspuns corect trece validarea și păstrează câmpurile", () => {
  const r = valideazaAnaliza(JSON.stringify(BUN));
  assert.equal(r.ok, true);
  assert.equal(r.analiza.rezumat, BUN.rezumat);
  assert.equal(r.analiza.castigatoare.length, 1);
  assert.equal(r.analiza.propuneri.length, 2);
  assert.equal(r.analiza.propuneri[1].textNou, "Fiecare leu ajunge la tratament.");
  assert.equal(r.analiza.propuneri[0].textNou, null);
  assert.equal(r.taiate, 0);
});

test("JSON-ul poate veni într-un bloc de cod sau cu text în jur", () => {
  assert.equal(valideazaAnaliza("```json\n" + JSON.stringify(BUN) + "\n```").ok, true);
  assert.equal(valideazaAnaliza("Iată analiza:\n" + JSON.stringify(BUN) + "\nSper că ajută.").ok, true);
  assert.equal(extrageJson("nimic"), undefined);
});

test("maximum 3 propuneri: restul se taie și se spune", () => {
  const multe = { ...BUN, propuneri: Array.from({ length: 5 }, (_, i) => ({ tip: "masurare", campanie: null, titlu: `P${i}`, detalii: "d", text_nou: null })) };
  const r = valideazaAnaliza(JSON.stringify(multe));
  assert.equal(r.ok, true);
  assert.equal(r.analiza.propuneri.length, MAX_PROPUNERI);
  assert.equal(r.taiate, 2);
  assert.deepEqual(r.analiza.propuneri.map((p) => p.titlu), ["P0", "P1", "P2"]);
});

test("structura greșită e respinsă (nu se salvează jumătăți de analize)", () => {
  assert.equal(valideazaAnaliza("nu e json").ok, false);
  assert.equal(valideazaAnaliza("[1,2]").ok, false);
  assert.equal(valideazaAnaliza(JSON.stringify({ ...BUN, rezumat: "" })).ok, false);
  assert.equal(valideazaAnaliza(JSON.stringify({ ...BUN, rezumat: 5 })).ok, false);
  assert.equal(valideazaAnaliza(JSON.stringify({ ...BUN, propuneri: "x" })).ok, false);
  assert.equal(valideazaAnaliza(JSON.stringify({ ...BUN, propuneri: [{ tip: "ceva", titlu: "t", detalii: "d" }] })).ok, false);
  assert.equal(valideazaAnaliza(JSON.stringify({ ...BUN, propuneri: [{ tip: "buget", titlu: "", detalii: "d" }] })).ok, false);
  assert.equal(valideazaAnaliza(JSON.stringify({ ...BUN, propuneri: [{ tip: "buget", titlu: "t", detalii: "d", text_nou: 5 }] })).ok, false);
  assert.equal(valideazaAnaliza(JSON.stringify({ ...BUN, castigatoare: [{ campanie: "A" }] })).ok, false);
  assert.equal(valideazaAnaliza(JSON.stringify({ ...BUN, castigatoare: "A" })).ok, false);
  assert.equal(valideazaAnaliza(JSON.stringify({ ...BUN, de_verificat: [1] })).ok, false);
  assert.equal(valideazaAnaliza(JSON.stringify({ ...BUN, de_verificat: "x" })).ok, false);
  assert.equal(valideazaAnaliza(JSON.stringify({ ...BUN, propuneri: [null] })).ok, false);
});

test("câmpurile opționale lipsă devin liste goale", () => {
  const r = valideazaAnaliza(JSON.stringify({ rezumat: "Puține date." }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.analiza.propuneri, []);
  assert.deepEqual(r.analiza.deVerificat, []);
});

test("textul nou se păstrează doar la propunerile de tip text", () => {
  const r = valideazaAnaliza(JSON.stringify({ ...BUN, propuneri: [{ tip: "oprire", campanie: null, titlu: "t", detalii: "d", text_nou: "ceva" }] }));
  assert.equal(r.analiza.propuneri[0].textNou, null);
});

test("textele sunt curățate de caractere de control și tăiate; HTML-ul rămâne text (se afișează escapat)", () => {
  const r = valideazaAnaliza(JSON.stringify({ ...BUN, rezumat: "  Ana\u202E\n\n<b>x</b>  " + "y".repeat(3000) }));
  assert.equal(r.ok, true);
  assert.ok(r.analiza.rezumat.length <= 1500);
  assert.ok(!r.analiza.rezumat.includes("\u202E"));
  assert.ok(r.analiza.rezumat.startsWith("Ana <b>x</b>"));
});

test("campaniile inexistente în date: verdictele dispar, propunerile pierd legătura", () => {
  const r = valideazaAnaliza(
    JSON.stringify({
      ...BUN,
      castigatoare: [{ campanie: "Craciun 2026", motiv: "bun" }, { campanie: "Campanie inventată", motiv: "?" }],
      propuneri: [{ tip: "buget", campanie: "Altceva complet", titlu: "t", detalii: "d" }],
    }),
    ["Crăciun 2026 – Meta", "Reach general"],
  );
  assert.equal(r.ok, true);
  assert.deepEqual(r.analiza.castigatoare.map((x) => x.campanie), ["Craciun 2026"]);
  assert.equal(r.analiza.propuneri[0].campanie, null);
  assert.equal(campaniePotrivita("CRACIUN 2026", ["Crăciun 2026 – Meta"]), true);
  assert.equal(campaniePotrivita("ab", ["abc"]), false);
  assert.equal(campaniePotrivita("", ["abc"]), false);
});

test("promptul: doar cifre agregate, fără adrese de email, telefoane sau linkuri din numele campaniilor", () => {
  const rau = campanie(1, { eticheta: "Operație Ion Popescu 0722 123 456 ion@exemplu.ro https://donatii.example/ion", codUtm: "cmp_1" });
  const { system, user } = construiestePrompt(DATE([rau, campanie(2, { eticheta: "CNP 1960101123456 test" })]));
  const tot = `${system}\n${user}`;
  assert.doesNotMatch(tot, /ion@exemplu\.ro/);
  assert.doesNotMatch(tot, /0722 123 456/);
  assert.doesNotMatch(tot, /donatii\.example/);
  assert.doesNotMatch(tot, /1960101123456/);
  assert.match(user, /\[email\]/);
  assert.match(user, /\[număr\]/);
  assert.match(user, /\[link\]/);
  // nu există câmpuri despre donatori individuali în datele trimise
  const date = JSON.parse(user.slice(user.indexOf("{")));
  const chei = new Set(Object.keys(date.campanii[0]));
  for (const interzis of ["email", "nume", "telefon", "donator", "donatori", "ip"]) assert.equal(chei.has(interzis), false, interzis);
  assert.match(system, /MAXIM 3 propuneri/);
  assert.match(user, /2026-10-26 – 2026-11-01/);
});

test("promptul rotunjește numerele și taie lista de campanii", () => {
  const multe = Array.from({ length: 45 }, (_, i) => campanie(i));
  const { user } = construiestePrompt(DATE(multe));
  const date = JSON.parse(user.slice(user.indexOf("{")));
  assert.equal(date.campanii.length, MAX_CAMPANII_IN_PROMPT);
  assert.equal(date.campanii[0].donatiiNeteLei, 150.46);
  assert.equal(date.campanii[0].roasNet, 1.5);
  // cele mai scumpe primele
  assert.ok(date.campanii[0].cheltuialaLei >= date.campanii[1].cheltuialaLei);
});

test("limba răspunsului se cere în prompt", () => {
  assert.match(construiestePrompt(DATE([]), "en").system, /engleză/);
  assert.match(construiestePrompt(DATE([]), "ro").system, /română/);
});

test("curățarea etichetelor: lungimea și diferența dintre dată și număr de telefon", () => {
  assert.equal(curataEticheta("Campanie 2026-11-04 buget 1500"), "Campanie 2026-11-04 buget 1500");
  assert.equal(curataEticheta("x".repeat(200)).length, 80);
  assert.equal(curataEticheta(5), "");
  assert.equal(curataEticheta("RO49AAAA1B31007593840000"), "[cont]");
});

test("săptămâna analizei: ultimele 7 zile încheiate, în jurul zilei de luni", () => {
  const luni = saptamanaAnalizei("2026-11-02");
  assert.deepEqual(luni, { de: "2026-10-26", pana: "2026-11-01", anterioara: { de: "2026-10-19", pana: "2026-10-25" }, luni: "2026-11-02" });
  const miercuri = saptamanaAnalizei("2026-11-04");
  assert.equal(miercuri.luni, "2026-11-02");
  assert.equal(miercuri.pana, "2026-11-03");
  assert.equal(saptamanaAnalizei("2026-11-08").luni, "2026-11-02"); // duminică aparține săptămânii care începe luni
});
