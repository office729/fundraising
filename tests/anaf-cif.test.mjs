import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import { cautaCifAnaf } from "../src/lib/anaf.ts";

const fetchOriginal = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

function raspunde(corp, ok = true) {
  globalThis.fetch = async () => ({ ok, json: async () => corp });
}

const GASIT = {
  found: [
    {
      date_generale: { cui: 38103518, denumire: "MEDIGROUPPLUS SRL", adresa: "JUD. BOTOŞANI, SAT BOSCOTENI", stare_inregistrare: "INREGISTRAT din data 17.08.2017" },
      stare_inactiv: { statusInactivi: false },
      inregistrare_scop_Tva: { scpTVA: false },
      adresa_sediu_social: { sdenumire_Judet: "BOTOŞANI", sdenumire_Localitate: "Sat Boscoteni" },
    },
  ],
  notFound: [],
};

test("CIF găsit în ANAF → date de identificare", async () => {
  raspunde(GASIT);
  const r = await cautaCifAnaf("RO 38103518");
  assert.equal(r.tip, "gasit");
  assert.equal(r.stare.denumire, "MEDIGROUPPLUS SRL");
  assert.equal(r.stare.activ, true);
  assert.equal(r.stare.judet, "BOTOŞANI");
});

test("organizație inactivă fiscal → activ false", async () => {
  raspunde({ found: [{ ...GASIT.found[0], stare_inactiv: { statusInactivi: true } }], notFound: [] });
  const r = await cautaCifAnaf("38103518");
  assert.equal(r.tip, "gasit");
  assert.equal(r.stare.activ, false);
});

test("CIF inexistent → negăsit", async () => {
  raspunde({ found: [], notFound: [99999999] });
  assert.equal((await cautaCifAnaf("99999999")).tip, "negasit");
});

test("CIF fără cifre → negăsit, fără apel către ANAF", async () => {
  globalThis.fetch = async () => {
    throw new Error("nu trebuia apelat");
  };
  assert.equal((await cautaCifAnaf("RO")).tip, "negasit");
});

test("ANAF răspunde cu eroare sau nu răspunde → indisponibil (nu blochează înscrierea)", async () => {
  raspunde({}, false);
  assert.equal((await cautaCifAnaf("38103518")).tip, "indisponibil");
  globalThis.fetch = async () => {
    throw new Error("timeout");
  };
  assert.equal((await cautaCifAnaf("38103518")).tip, "indisponibil");
  raspunde({ ceva: "neașteptat" });
  assert.equal((await cautaCifAnaf("38103518")).tip, "indisponibil");
});
