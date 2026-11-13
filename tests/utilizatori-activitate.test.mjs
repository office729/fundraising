import { test } from "node:test";
import assert from "node:assert/strict";

const A = await import("../src/lib/utilizatori/activitate.ts");

const ZI = 86_400_000;
const ACUM = new Date(Date.UTC(2026, 10, 13, 12, 0, 0));
const inUrma = (zile) => new Date(ACUM.getTime() - zile * ZI);
const baza = { creatLa: inUrma(100), primaAutentificare: null, ultimaAutentificare: null, ultimaVizita: null, ultimaLucrare: null };

test("scrierea activității e limitată la o dată la 5 minute", () => {
  assert.equal(A.trebuieNotat(null, ACUM), true);
  assert.equal(A.trebuieNotat(undefined, ACUM), true);
  assert.equal(A.trebuieNotat(new Date(ACUM.getTime() - 60_000), ACUM), false, "acum 1 minut");
  assert.equal(A.trebuieNotat(new Date(ACUM.getTime() - 4 * 60_000), ACUM), false, "acum 4 minute");
  assert.equal(A.trebuieNotat(new Date(ACUM.getTime() - 5 * 60_000), ACUM), true, "exact 5 minute");
  assert.equal(A.trebuieNotat(new Date(ACUM.getTime() - 3 * 3600_000), ACUM), true);
});

test("cel mai recent semn de viață dintre autentificare, vizită și lucrare", () => {
  assert.equal(A.ultimulSemn(baza), null);
  const s = { ...baza, ultimaAutentificare: inUrma(10), ultimaVizita: inUrma(3), ultimaLucrare: inUrma(5) };
  assert.equal(A.ultimulSemn(s).getTime(), inUrma(3).getTime());
});

test("stare: nu a intrat niciodată / activ (≤ 14 zile) / inactiv", () => {
  assert.deepEqual(A.stareUtilizator(baza, ACUM), { stare: "niciodata", zileDeLaUltimulSemn: null });
  assert.deepEqual(A.stareUtilizator({ ...baza, ultimaAutentificare: inUrma(0) }, ACUM), { stare: "activ", zileDeLaUltimulSemn: 0 });
  assert.equal(A.stareUtilizator({ ...baza, ultimaAutentificare: inUrma(14) }, ACUM).stare, "activ", "exact 14 zile");
  assert.equal(A.stareUtilizator({ ...baza, ultimaAutentificare: inUrma(15) }, ACUM).stare, "inactiv");
  // Autentificat acum 60 de zile, dar a lucrat ieri (sesiune lungă, fără o nouă autentificare): activ.
  assert.equal(A.stareUtilizator({ ...baza, ultimaAutentificare: inUrma(60), ultimaLucrare: inUrma(1) }, ACUM).stare, "activ");
  // Data din viitor (ceas decalat) nu dă zile negative.
  assert.equal(A.stareUtilizator({ ...baza, ultimaVizita: new Date(ACUM.getTime() + 3600_000) }, ACUM).zileDeLaUltimulSemn, 0);
});

test("prima intrare: data notată, estimare la conturile vechi, nimic dacă nu a intrat", () => {
  const notata = inUrma(40);
  assert.deepEqual(A.primaIntrare({ ...baza, primaAutentificare: notata, ultimaAutentificare: inUrma(2) }), { data: notata, estimata: false });
  const veche = A.primaIntrare({ ...baza, ultimaAutentificare: inUrma(2) });
  assert.equal(veche.estimata, true);
  assert.equal(veche.data.getTime(), baza.creatLa.getTime(), "data creării contului");
  assert.deepEqual(A.primaIntrare(baza), { data: null, estimata: false });
});
