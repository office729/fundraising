import { test } from "node:test";
import assert from "node:assert/strict";

import {
  curataDescriere,
  formateazaMinute,
  MINUTE_MAXIME_INTRARE,
  minuteDinTimer,
  parseDurata,
  sumaPentru,
  totaluri,
  valideazaIntrare,
  valideazaTarife,
} from "../src/lib/timp-custom.ts";

const baza = { executant: "claude", categorie: "custom", descriere: "Grafic la Decidenți", minute: 45, data: "2026-10-23" };

test("formatarea minutelor", () => {
  assert.equal(formateazaMinute(0), "0m");
  assert.equal(formateazaMinute(45), "45m");
  assert.equal(formateazaMinute(60), "1h");
  assert.equal(formateazaMinute(150), "2h 30m");
  assert.equal(formateazaMinute(-5), "0m");
  assert.equal(formateazaMinute(89.6), "1h 30m");
});

test("durata scrisă de om", () => {
  assert.equal(parseDurata("90"), 90);
  assert.equal(parseDurata("90m"), 90);
  assert.equal(parseDurata("45 min"), 45);
  assert.equal(parseDurata("1h"), 60);
  assert.equal(parseDurata("1,5h"), 90);
  assert.equal(parseDurata("1.5 h"), 90);
  assert.equal(parseDurata("1h30"), 90);
  assert.equal(parseDurata("1h 30m"), 90);
  assert.equal(parseDurata("1:30"), 90);
  assert.equal(parseDurata("24h"), 1440);
});

test("durate invalide sau în afara limitelor sunt refuzate", () => {
  for (const x of ["", "0", "abc", "-5", "25h", "1441", "1:75x", "h", "1h99m extra", null, undefined, 90, {}]) assert.equal(parseDurata(x), null, String(x));
  assert.equal(parseDurata("0h"), null);
});

test("o intrare corectă trece, cu minute din număr sau din text", () => {
  const r = valideazaIntrare(baza);
  assert.ok(r.ok);
  assert.equal(r.valoare.minute, 45);
  assert.equal(valideazaIntrare({ ...baza, minute: "1h30" }).valoare.minute, 90);
});

test("intrări invalide", () => {
  const rau = (o) => assert.equal(valideazaIntrare(o).ok, false, JSON.stringify(o));
  rau(null);
  rau([]);
  rau({ ...baza, executant: "altcineva" });
  rau({ ...baza, executant: "constructor" });
  rau({ ...baza, categorie: "inexistenta" });
  rau({ ...baza, descriere: "ab" });
  rau({ ...baza, descriere: "x".repeat(301) });
  rau({ ...baza, minute: 0 });
  rau({ ...baza, minute: 1.5 });
  rau({ ...baza, minute: MINUTE_MAXIME_INTRARE + 1 });
  rau({ ...baza, minute: "ceva" });
  rau({ ...baza, data: "2026-02-30" });
  rau({ ...baza, data: "23.10.2026" });
  rau({ ...baza, data: "1999-01-01" });
});

test("descrierea se curăță: spații, rânduri noi, caractere de control", () => {
  assert.equal(curataDescriere("  Grafic\n la   Decidenți\u0007  "), "Grafic la Decidenți");
  assert.equal(curataDescriere(5), null);
});

test("timerul: rotunjire în sus, minimum 1 minut, plafon 24 de ore", () => {
  const t0 = Date.UTC(2026, 9, 23, 10, 0, 0);
  assert.equal(minuteDinTimer(t0, t0), 1);
  assert.equal(minuteDinTimer(t0, t0 + 59_000), 1);
  assert.equal(minuteDinTimer(t0, t0 + 61_000), 2);
  assert.equal(minuteDinTimer(t0, t0 + 30 * 60_000), 30);
  assert.equal(minuteDinTimer(t0, t0 + 3 * 86_400_000), MINUTE_MAXIME_INTRARE);
});

test("tarife: numere pozitive cu 2 zecimale, virgulă acceptată, monedă RON/EUR", () => {
  const r = valideazaTarife({ claude: "150,50", echipa: 200, moneda: "EUR" });
  assert.deepEqual(r.valoare, { claude: 150.5, echipa: 200, moneda: "EUR" });
  assert.equal(valideazaTarife({ claude: 0, echipa: 0, moneda: "RON" }).ok, true);
  for (const o of [null, {}, { claude: -1, echipa: 1, moneda: "RON" }, { claude: "abc", echipa: 1, moneda: "RON" }, { claude: 1, echipa: 1, moneda: "USD" }, { claude: 1.234, echipa: 1, moneda: "RON" }, { claude: 1e9, echipa: 1, moneda: "RON" }]) {
    assert.equal(valideazaTarife(o).ok, false, JSON.stringify(o));
  }
});

test("sume: minute × tarif pe oră, rotunjite la 2 zecimale", () => {
  assert.equal(sumaPentru(60, 150), 150);
  assert.equal(sumaPentru(90, 100), 150);
  assert.equal(sumaPentru(20, 100), 33.33);
  assert.equal(sumaPentru(0, 100), 0);
});

test("totaluri: pe executant și categorie, cu sau fără sume", () => {
  const intrari = [
    { executant: "claude", categorie: "custom", minute: 60 },
    { executant: "echipa", categorie: "integrare", minute: 30 },
    { executant: "echipa", categorie: "suport", minute: 90 },
  ];
  const fara = totaluri(intrari, null);
  assert.equal(fara.minute, 180);
  assert.deepEqual(fara.peExecutant, { claude: 60, echipa: 120 });
  assert.deepEqual(fara.peCategorie, { custom: 60, integrare: 30, suport: 90, altele: 0 });
  assert.equal(fara.suma, null, "clientul nu primește sume");
  const cu = totaluri(intrari, { claude: 100, echipa: 200, moneda: "RON" });
  assert.deepEqual(cu.suma, { claude: 100, echipa: 400, total: 500, moneda: "RON" });
  assert.deepEqual(totaluri([], null).peExecutant, { claude: 0, echipa: 0 });
});
