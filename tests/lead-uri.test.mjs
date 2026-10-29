import { test } from "node:test";
import assert from "node:assert/strict";

const L = await import("../src/lib/lead-uri.ts");

test("stările sunt cele cinci, cu etichete; o stare străină e respinsă", () => {
  assert.deepEqual([...L.STARI_LEAD], ["nou", "contactat", "in_discutie", "inscris", "pierdut"]);
  for (const s of L.STARI_LEAD) assert.ok(L.ETICHETE_STARE[s]);
  assert.equal(L.esteStareLead("inscris"), true);
  assert.equal(L.esteStareLead("sters"), false);
  assert.equal(L.esteStareLead(null), false);
});

test("notița: se curăță, se taie la limită, golul devine null", () => {
  assert.equal(L.curataNotita("  Sunat marți\r\nRevine  "), "Sunat marți\nRevine");
  assert.equal(L.curataNotita("   "), null);
  assert.equal(L.curataNotita(5), null);
  assert.equal(L.curataNotita("a\u0000b"), "ab");
  assert.equal(L.curataNotita("x".repeat(3000)).length, L.MAX_NOTITA);
});

test("căutarea ignoră diacriticele și literele mari, în toate câmpurile", () => {
  const lead = { nume: "Ștefan Ionescu", organizatie: "Asociația Pentru Copii", email: "stefan@asociatia.ro", telefon: "0757 401 042", campanie: "utm_source=facebook" };
  assert.equal(L.potriveste(lead, "asociatia"), true);
  assert.equal(L.potriveste(lead, "STEFAN"), true);
  assert.equal(L.potriveste(lead, "0757"), true);
  assert.equal(L.potriveste(lead, "facebook"), true);
  assert.equal(L.potriveste(lead, "fundatia"), false);
  assert.equal(L.potriveste(lead, ""), true);
});

test("CSV: separator „;”, ghilimele escapate, BOM, iar formulele din text sunt dezamorsate", () => {
  assert.equal(L.celulaCsv('Ana "Maria"'), '"Ana ""Maria"""');
  assert.equal(L.celulaCsv("a;b"), '"a;b"');
  assert.equal(L.celulaCsv("=HYPERLINK(\"x\")"), "\"'=HYPERLINK(\"\"x\"\")\"");
  assert.equal(L.celulaCsv("+40757"), "'+40757");
  assert.equal(L.celulaCsv(null), "");
  const csv = L.leaduriCaCsv([{ creatLa: "2026-10-27T08:00:00.000Z", nume: "Ana", organizatie: "ONG; Test", email: "a@b.ro", telefon: null, stare: "nou", campanie: null, cale: "/descopera", nrTrimiteri: 2, notita: "=1+1", provenienta: "LinkedIn · Social plătit · Plătit · ong_toamna" }]);
  assert.ok(csv.startsWith("﻿Data;Nume"));
  const [, rand] = csv.split("\r\n");
  assert.equal(rand, `2026-10-27;Ana;"ONG; Test";a@b.ro;;Nou;;LinkedIn · Social plătit · Plătit · ong_toamna;/descopera;2;'=1+1`);
  assert.ok(csv.split("\r\n")[0].includes("Sursă măsurată"));
});

test("CSV: un număr de telefon cu + nu primește apostrof, dar o formulă care începe cu + da", () => {
  assert.equal(L.celulaCsv("+40 757 401 042"), "+40 757 401 042");
  assert.equal(L.celulaCsv("+40757401042"), "+40757401042");
  assert.equal(L.celulaCsv("+1+1"), "'+1+1");
  assert.equal(L.celulaCsv("-2+3"), "'-2+3");
  assert.equal(L.celulaCsv("=SUM(A1)"), "'=SUM(A1)");
});
