import { test } from "node:test";
import assert from "node:assert/strict";

const C = await import("../src/lib/cai-calde.ts");

const ioana = { nume: "Ioana Popescu", rol: "Director marketing", email: "Ioana.Popescu@firma.ro", telefon: "+40 722 111 222" };

test("telefonul se compară pe ultimele 9 cifre, indiferent de prefix și formatare", () => {
  assert.equal(C.ultimele9("+40 722 111 222"), "722111222");
  assert.equal(C.ultimele9("0722.111.222"), "722111222");
  assert.equal(C.ultimele9("0040722111222"), "722111222");
  assert.equal(C.ultimele9("12345"), "");
  assert.equal(C.ultimele9(null), "");
});

test("numele se normalizează: fără diacritice, titluri sau ordine", () => {
  assert.equal(C.numeNormalizat("Popescu Ioana"), C.numeNormalizat("ioana POPESCU"));
  assert.equal(C.numeNormalizat("Dr. Ioana Popescu"), C.numeNormalizat("Ioana Popescu"));
  assert.equal(C.numeNormalizat("Ștefan Țigănuș"), C.numeNormalizat("Stefan Tiganus"));
  assert.equal(C.numeNormalizat("Ioana"), "", "un singur cuvânt nu se compară");
  assert.equal(C.numeNormalizat(""), "");
});

test("e-mailul identic = potrivire sigură; telefon identic = sigură; doar numele = posibilă", () => {
  assert.deepEqual(C.potrivire(ioana, { nume: "Altcineva", email: "ioana.popescu@FIRMA.ro", telefon: null }), { prin: "email", incredere: "sigur" });
  assert.deepEqual(C.potrivire(ioana, { nume: "Altcineva", email: null, telefon: "0722111222" }), { prin: "telefon", incredere: "sigur" });
  assert.deepEqual(C.potrivire(ioana, { nume: "Popescu Ioana", email: null, telefon: null }), { prin: "nume", incredere: "posibil" });
  assert.equal(C.potrivire(ioana, { nume: "Maria Ionescu", email: "m@x.ro", telefon: "0733000000" }), null);
});

test("pentru donatori nu se acceptă potrivirea doar pe nume (prea nesigură pentru date personale)", () => {
  assert.equal(C.potrivire(ioana, { nume: "Ioana Popescu", email: null, telefon: null }, false), null);
});

test("persoanele firmei: duplicatele (același e-mail, telefon sau nume) se unesc", () => {
  const lista = C.persoaneUnice([
    ioana,
    { nume: "I. Popescu", rol: null, email: "ioana.popescu@firma.ro", telefon: null },
    { nume: "Ioana Popescu", rol: null, email: null, telefon: null },
    { nume: "Mihai Radu", rol: null, email: null, telefon: "0744 555 666" },
  ]);
  assert.deepEqual(lista.map((p) => p.nume), ["Ioana Popescu", "Ioana Popescu", "Mihai Radu"]);
});

test("căile se construiesc per legătură și se ordonează: sigur înaintea posibil, apoi donator, sponsor, voluntar", () => {
  const donatori = C.potriveste([ioana], [{ e: { nume: "Ioana Popescu", email: "ioana.popescu@firma.ro", telefon: null }, detaliu: "Donator · 3 donații" }], "donator", false);
  const voluntari = C.potriveste([ioana], [{ e: { nume: "Ioana Popescu", email: null, telefon: null }, detaliu: "Voluntar" }], "voluntar");
  const sponsori = C.potriveste([ioana], [{ e: { nume: "Popescu Ioana", email: null, telefon: "0722111222" }, detaliu: "Contact la „Alfa SRL”", companyId: "x" }], "sponsor");
  const ordonat = C.deduplicaSiOrdoneaza([...voluntari, ...sponsori, ...donatori]);
  assert.deepEqual(ordonat.map((c) => `${c.tip}:${c.incredere}`), ["donator:sigur", "sponsor:sigur", "voluntar:posibil"]);
});

test("aceeași legătură găsită de două ori apare o singură dată, cu varianta sigură", () => {
  const posibil = { contactNume: "Ioana Popescu", contactRol: null, contactEmail: null, contactTelefon: null, tip: "voluntar", prin: "nume", incredere: "posibil", detaliu: "Voluntar" };
  const sigur = { ...posibil, prin: "email", incredere: "sigur" };
  const rez = C.deduplicaSiOrdoneaza([posibil, sigur]);
  assert.equal(rez.length, 1);
  assert.equal(rez[0].incredere, "sigur");
});
