import { test } from "node:test";
import assert from "node:assert/strict";

const A = await import("../src/lib/analiza-donator.ts");

const ZI = 86_400_000;
const acum = new Date("2026-10-22T12:00:00Z");
const inUrma = (zile) => new Date(acum.getTime() - zile * ZI);

test("fără donații: risc necunoscut, fără valori estimate", () => {
  const r = A.analizeazaDonator({ primaAt: null, ultimaAt: null, nr: 0, total: 0 }, acum);
  assert.equal(r.risc, "necunoscut");
  assert.equal(r.cadentaZile, null);
  assert.equal(r.valoareViitor, null);
  assert.equal(r.eticheta, "Fără donații");
});

test("donator lunar la zi: ritm ~30 de zile, risc scăzut, următoarea donație estimată", () => {
  // 7 donații în 180 de zile → interval mediu 30 de zile; ultima acum 10 zile
  const r = A.analizeazaDonator({ primaAt: inUrma(190), ultimaAt: inUrma(10), nr: 7, total: 700 }, acum);
  assert.equal(Math.round(r.cadentaZile), 30);
  assert.equal(r.risc, "scazut");
  assert.equal(r.eticheta, "Fidel");
  assert.equal(new Date(r.urmatoareaAt).toISOString().slice(0, 10), new Date(inUrma(10).getTime() + 30 * ZI).toISOString().slice(0, 10));
  // vechime sub 1 an: ritmul anual = totalul; CLV = ritm × 3 ani
  assert.equal(r.valoareAnuala, 700);
  assert.equal(r.valoareViitor, 2100);
});

test("a întârziat peste ritm: risc mediu, apoi ridicat", () => {
  // ritm ~30 de zile; ultima acum 60 de zile → raport 2 → mediu
  const mediu = A.analizeazaDonator({ primaAt: inUrma(270), ultimaAt: inUrma(60), nr: 8, total: 800 }, acum);
  assert.equal(mediu.risc, "mediu");
  assert.equal(mediu.eticheta, "În întârziere");
  // ultima acum 150 de zile → raport 5 → ridicat
  const ridicat = A.analizeazaDonator({ primaAt: inUrma(360), ultimaAt: inUrma(150), nr: 8, total: 800 }, acum);
  assert.equal(ridicat.risc, "ridicat");
  assert.equal(ridicat.eticheta, "La risc");
  assert.ok(ridicat.valoareViitor < mediu.valoareViitor, "valoarea estimată scade pe măsură ce riscul crește");
});

test("donator unic: recent = risc mediu (de convertit în recurent), rece = risc ridicat", () => {
  const recent = A.analizeazaDonator({ primaAt: inUrma(40), ultimaAt: inUrma(40), nr: 1, total: 100 }, acum);
  assert.equal(recent.risc, "mediu");
  assert.equal(recent.eticheta, "Donator unic");
  assert.equal(recent.cadentaZile, null);
  assert.equal(recent.urmatoareaAt, null);
  const rece = A.analizeazaDonator({ primaAt: inUrma(400), ultimaAt: inUrma(400), nr: 1, total: 100 }, acum);
  assert.equal(rece.risc, "ridicat");
  assert.equal(rece.eticheta, "Unic, rece");
});

test("ritmul valoric anual se împarte la vechime când trece de un an", () => {
  // 3 ani de istoric (1095 de zile), 600 de lei în total → 200 pe an
  const r = A.analizeazaDonator({ primaAt: inUrma(1095 + 20), ultimaAt: inUrma(20), nr: 12, total: 600 }, acum);
  assert.equal(r.valoareAnuala, 200);
});

test("date invalide nu strică calculul", () => {
  const r = A.analizeazaDonator({ primaAt: "nu-e-data", ultimaAt: inUrma(10), nr: 3, total: -50 }, acum);
  assert.equal(r.cadentaZile, null);
  assert.equal(r.total, 0);
  assert.ok(["mediu", "ridicat"].includes(r.risc));
});

test("prioritatea de reactivare: riscul întâi, apoi valoarea anuală", () => {
  const mare = { risc: "ridicat", valoareAnuala: 1000 };
  const mic = { risc: "ridicat", valoareAnuala: 100 };
  const mediuMare = { risc: "mediu", valoareAnuala: 9000 };
  const sortat = [mediuMare, mic, mare].sort(A.comparaPrioritateReactivare);
  assert.deepEqual(sortat, [mare, mic, mediuMare]);
});

test("ritmul în cuvinte", () => {
  assert.equal(A.ritmInCuvinte(null), "o singură donație");
  assert.equal(A.ritmInCuvinte(30), "o donație la ~30 zile");
  assert.equal(A.ritmInCuvinte(91), "o donație la ~3 luni");
  assert.equal(A.ritmInCuvinte(365), "o donație pe an (aproximativ)");
});
