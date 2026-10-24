import { test } from "node:test";
import assert from "node:assert/strict";

const C = await import("../src/lib/consimtamant-email.ts");

test("sursa acordului: doar valorile cunoscute", () => {
  assert.equal(C.esteSursaAcord("formular_online"), true);
  assert.equal(C.esteSursaAcord("declarat_echipa"), true);
  assert.equal(C.esteSursaAcord("import"), false);
  assert.equal(C.esteSursaAcord(null), false);
});

test("parcursurile automate: acord explicit dat de donator, nedezabonat, nemarcat „nu contactat”; acordul declarat de echipă nu contează", () => {
  const bun = { consimtamantEmail: true, dezabonat: false, nuContactat: false, sursaAcord: "formular_online" };
  assert.equal(C.poatePrimiParcursuri(bun), true);
  assert.equal(C.poatePrimiParcursuri({ ...bun, sursaAcord: null }), true, "acordurile dinainte de coloana sursă rămân valabile");
  assert.equal(C.poatePrimiParcursuri({ ...bun, sursaAcord: "declarat_echipa" }), false);
  assert.equal(C.poatePrimiParcursuri({ ...bun, consimtamantEmail: null }), false, "nu a fost întrebat");
  assert.equal(C.poatePrimiParcursuri({ ...bun, consimtamantEmail: false }), false);
  assert.equal(C.poatePrimiParcursuri({ ...bun, dezabonat: true }), false);
  assert.equal(C.poatePrimiParcursuri({ ...bun, nuContactat: true }), false);
});

test("versiunea textului acordului e o dată", () => {
  assert.match(C.ACORD_EMAIL_VERSIUNE, /^\d{4}-\d{2}-\d{2}$/);
});
