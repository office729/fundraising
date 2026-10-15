import { test } from "node:test";
import assert from "node:assert/strict";

import { completeazaDinAnaf } from "../src/lib/anaf-completare.ts";

const gol = { nume: "", nrRegCom: "", judet: "", localitate: "", adresa: "", caen: "", cui: "123" };
const anaf = { denumire: "ASOCIAȚIA TEST", nrRegCom: "J01/1/2020", judet: "București", localitate: "București", adresa: "Str. Test 1", caen: "9499" };

test("căutarea automată completează doar câmpurile goale", () => {
  const r = completeazaDinAnaf({ ...gol, nume: "Numele meu", judet: "Cluj" }, anaf, false);
  assert.equal(r.nume, "Numele meu");
  assert.equal(r.judet, "Cluj");
  assert.equal(r.nrRegCom, "J01/1/2020");
  assert.equal(r.caen, "9499");
  assert.equal(r.cui, "123"); // câmpurile care nu țin de identitate rămân neatinse
});

test("butonul explicit înlocuiește datele de identificare", () => {
  const r = completeazaDinAnaf({ ...gol, nume: "Numele meu", judet: "Cluj" }, anaf, true);
  assert.equal(r.nume, "ASOCIAȚIA TEST");
  assert.equal(r.judet, "București");
});

test("un câmp pe care ANAF nu îl are rămâne cum era, chiar la înlocuire", () => {
  const r = completeazaDinAnaf({ ...gol, nume: "Numele meu", caen: "6201" }, { ...anaf, denumire: null, caen: "  " }, true);
  assert.equal(r.nume, "Numele meu");
  assert.equal(r.caen, "6201");
});
