import { test } from "node:test";
import assert from "node:assert/strict";

const S = await import("../src/lib/suport/date-personale.ts");

test("e-mailurile, telefoanele, CNP-ul și IBAN-ul dispar din mesajele de eroare", () => {
  const brut = "Nu am putut trimite către ion.popescu@exemplu.ro (tel +40 722 123 456 / 0733 456 789), CNP 1850315123456, cont RO49AAAA1B31007593840000";
  const curat = S.curataPersonale(brut);
  assert.ok(!curat.includes("ion.popescu"), curat);
  assert.ok(!curat.includes("722 123 456"), curat);
  assert.ok(!curat.includes("0733"), curat);
  assert.ok(!curat.includes("1850315123456"), curat);
  assert.ok(!curat.includes("RO49AAAA"), curat);
  assert.match(curat, /\[email\]/);
  assert.match(curat, /\[telefon\]/);
  assert.match(curat, /\[cnp\]/);
  assert.match(curat, /\[iban\]/);
});

test("parametrii interogărilor Drizzle (după „params:”) sunt tăiați", () => {
  const brut = 'Failed query: insert into "contacts" ("nume", "email") values ($1, $2)\nparams: Ion Popescu,ion@x.ro';
  const curat = S.curataPersonale(brut);
  assert.ok(!curat.includes("Ion Popescu"));
  assert.ok(!curat.includes("ion@x.ro"));
  assert.ok(curat.includes("insert into"));
});

test("detaliul Postgres «Key (col)=(valoare)» păstrează coloana și ascunde valoarea", () => {
  const curat = S.curataPersonale("duplicate key value violates unique constraint. Key (email)=(ana@exemplu.ro) already exists.");
  assert.ok(!curat.includes("ana@exemplu.ro"));
  assert.ok(curat.includes("Key (email)=([valoare])"));
});

test("tokenurile din adrese și din query string sunt ascunse", () => {
  assert.equal(S.curataPersonale("GET /invite/abcDEF123456789xyz"), "GET /invite/:token");
  assert.equal(S.curataPersonale("https://x.ro/p?token=abc123&a=1"), "https://x.ro/p?token=[ascuns]&a=1");
  assert.match(S.curataPersonale("Authorization eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcDEF123"), /\[token\]/);
  assert.match(S.curataPersonale("cheie sk_live_51Habcdefgh12345678"), /\[cheie\]/);
});

test("textul tehnic obișnuit rămâne neschimbat", () => {
  const t = 'relation "companies" does not exist (code 42P01) la rândul 12';
  assert.equal(S.curataPersonale(t), t);
  assert.equal(S.curataPersonale("UUID 6f1c2b7e-8a3d-4c1e-9b5a-0d2e3f4a5b6c"), "UUID 6f1c2b7e-8a3d-4c1e-9b5a-0d2e3f4a5b6c");
});

test("mascarea e-mailurilor, telefoanelor și numelor", () => {
  assert.equal(S.mascheazaEmail("vlad.placinta@alexandrit.ro"), "v***@a***.ro");
  assert.equal(S.mascheazaEmail(null), "—");
  assert.equal(S.mascheazaEmail("fara-arond"), "***");
  assert.equal(S.mascheazaTelefon("0722 123 456"), "********56");
  assert.equal(S.mascheazaTelefon(""), "—");
  assert.equal(S.mascheazaNume("Ion Popescu"), "I. P.");
  assert.equal(S.mascheazaNume("  "), "—");
});

test("accesul de suport: durate valide și stare", () => {
  assert.equal(S.esteDurataSuportValida(7), true);
  assert.equal(S.esteDurataSuportValida(30), false);
  assert.equal(S.esteDurataSuportValida(0), false);
  const acum = new Date("2026-10-20T12:00:00Z");
  assert.equal(S.stareAccesSuport({ expiraLa: "2026-10-27T12:00:00Z", retrasLa: null }, acum), "activ");
  assert.equal(S.stareAccesSuport({ expiraLa: "2026-10-20T11:59:59Z", retrasLa: null }, acum), "expirat");
  assert.equal(S.stareAccesSuport({ expiraLa: "2026-10-27T12:00:00Z", retrasLa: "2026-10-21T00:00:00Z" }, acum), "retras");
  assert.equal(S.stareAccesSuport({ expiraLa: "2026-10-20T12:00:00Z", retrasLa: null }, acum), "expirat");
});
