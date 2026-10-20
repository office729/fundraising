import { test } from "node:test";
import assert from "node:assert/strict";

import { dateAntifraud, extrageLocalitate, telefonPentruNetopia, TELEFON_IMPLICIT } from "../src/lib/billing/date-antifraud.ts";

test("telefon: numerele românești se aduc la forma cu 10 cifre care a funcționat până acum", () => {
  for (const intrare of ["0712345678", "+40712345678", "0040712345678", "40712345678", "0712 345 678", "0712-345-678", "(0712) 345 678"]) {
    assert.deepEqual(telefonPentruNetopia(intrare), { telefon: "0712345678", real: true }, intrare);
  }
  assert.deepEqual(telefonPentruNetopia("0212345678"), { telefon: "0212345678", real: true }); // fix
});

test("telefon: lipsă, prea scurt, străin sau cu litere => valoarea implicită, marcat ca nereal", () => {
  for (const intrare of [null, undefined, "", "123", "+447911123456", "07123", "abc", "071234567890123"]) {
    assert.deepEqual(telefonPentruNetopia(intrare), { telefon: TELEFON_IMPLICIT, real: false }, String(intrare));
  }
});

test("localitate din adrese ANAF reale", () => {
  assert.equal(extrageLocalitate("JUD. PRAHOVA, SAT PLOPU COM. PLOPU, STR. INDUSTRIEI, NR.3", "Prahova"), "Plopu");
  assert.equal(extrageLocalitate("MUN. CLUJ-NAPOCA, STR. MEMORANDUMULUI, NR. 1", "Cluj"), "Cluj-Napoca");
  assert.equal(extrageLocalitate("MUN. BUCUREŞTI SECTOR 3, STR. ION CREANGĂ, NR. 5", "București"), "București");
  assert.equal(extrageLocalitate("ORŞ. BUFTEA, STR. X", "Ilfov"), "Buftea");
  assert.equal(extrageLocalitate("JUD. IAŞI, SAT BÂRNOVA COM. MIROSLAVA, STR. X, NR. 10", "Iași"), "Miroslava"); // comuna, ca în formatul ANAF
});

test("localitate: fără segment recunoscut => județul; fără județ => București (valoarea veche)", () => {
  assert.equal(extrageLocalitate("Strada Libertății 5", "Timiș"), "Timiș");
  assert.equal(extrageLocalitate("", "Dolj"), "Dolj");
  assert.equal(extrageLocalitate(null, null), "București");
  assert.equal(extrageLocalitate(undefined, "  "), "București");
});

test("dateAntifraud: nume, telefon, oraș, județ, adresă reale; câmpurile obligatorii nu rămân goale", () => {
  const d = dateAntifraud({ numeUtilizator: "Andrei Ion Popescu", orgName: "Asociația X", telefon: "+40712345678", adresaSediu: "MUN. CLUJ-NAPOCA, STR. A, NR. 1", judet: "Cluj" });
  assert.deepEqual(d, { prenume: "Andrei", nume: "Ion Popescu", telefon: "0712345678", telefonReal: true, oras: "Cluj-Napoca", judet: "Cluj", adresa: "MUN. CLUJ-NAPOCA, STR. A, NR. 1" });
  const gol = dateAntifraud({ orgName: "Asociația X" });
  assert.equal(gol.prenume, "Client");
  assert.equal(gol.nume, "Asociația X");
  assert.equal(gol.telefon, TELEFON_IMPLICIT);
  assert.equal(gol.telefonReal, false);
  assert.equal(gol.adresa, "-");
  assert.equal(gol.judet, "București");
  const unCuvant = dateAntifraud({ numeUtilizator: "Andrei", orgName: "Asociația X" });
  assert.deepEqual([unCuvant.prenume, unCuvant.nume], ["Andrei", "Asociația X"]);
});

test("limite de lungime respectate", () => {
  const d = dateAntifraud({ numeUtilizator: "A ".repeat(100), orgName: "B".repeat(200), adresaSediu: "x".repeat(500), judet: "Cluj" });
  assert.ok(d.prenume.length <= 60 && d.nume.length <= 60 && d.adresa.length <= 120 && d.oras.length <= 60);
});

test("telefonPlataValid: doar numere românești utilizabile; goale, străine sau inventate nu trec", async () => {
  const { telefonPlataValid, MESAJ_TELEFON_LIPSA } = await import("../src/lib/billing/date-antifraud.ts");
  for (const ok of ["0722123456", "+40722123456", "0040722123456", "0722 123 456", "0722-123-456"]) assert.equal(telefonPlataValid(ok), true, ok);
  for (const prost of [null, undefined, "", "   ", "12345", "abc", "+4412345678", "0722123"]) assert.equal(telefonPlataValid(prost), false, String(prost));
  assert.match(MESAJ_TELEFON_LIPSA, /telefon valid/);
});

test("numărul implicit 0700000000 nu trece drept telefon valid", async () => {
  const { telefonPlataValid } = await import("../src/lib/billing/date-antifraud.ts");
  assert.equal(telefonPlataValid("0700000000"), false);
  assert.equal(telefonPlataValid("+40700000000"), false);
});
