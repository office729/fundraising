import { test } from "node:test";
import assert from "node:assert/strict";

const F = await import("../src/lib/functii-contact.ts");

const cat = (rol, dept = null) => F.categoriiPersoana(rol, dept);

test("funcții românești uzuale intră în categoria potrivită, cu sau fără diacritice", () => {
  assert.deepEqual(cat("Director General"), ["conducere"]);
  assert.deepEqual(cat("Administrator"), ["conducere"]);
  assert.deepEqual(cat("Director financiar"), ["financiar"]);
  assert.deepEqual(cat("Contabil șef"), ["financiar"]);
  assert.deepEqual(cat("Contabil sef"), ["financiar"]);
  assert.deepEqual(cat("Manager Marketing și Comunicare"), ["marketing"]);
  assert.deepEqual(cat("Responsabil relații publice"), ["marketing"]);
  assert.deepEqual(cat("Coordonator CSR"), ["csr"]);
  assert.deepEqual(cat("Director resurse umane"), ["hr"]);
  assert.deepEqual(cat("Director vânzări"), ["vanzari"]);
  assert.deepEqual(cat("Consilier juridic"), ["juridic"]);
  assert.deepEqual(cat("Asistent director"), ["secretariat"]);
});

test("funcții în engleză, așa cum le aduce îmbogățirea datelor", () => {
  assert.deepEqual(cat("Chief Executive Officer"), ["conducere"]);
  assert.deepEqual(cat("CEO"), ["conducere"]);
  assert.deepEqual(cat("Chief Financial Officer"), ["financiar"]);
  assert.deepEqual(cat("Head of Marketing"), ["marketing"]);
  assert.deepEqual(cat("HR Manager"), ["hr"]);
  assert.deepEqual(cat("Head of Sustainability"), ["csr"]);
  assert.deepEqual(cat("Executive Assistant"), ["secretariat"]);
});

test("departamentul contează: „Manager” din „Marketing” e în marketing", () => {
  assert.deepEqual(cat("Manager", "Marketing"), ["marketing"]);
  assert.deepEqual(cat(null, "Conducere"), []);
  assert.deepEqual(cat(null, "Resurse umane"), ["hr"]);
});

test("o persoană poate fi în mai multe categorii", () => {
  assert.deepEqual(cat("Director marketing și vânzări"), ["marketing", "vanzari"]);
});

test("cuvintele „întregi” nu prind pe bucăți de alte cuvinte", () => {
  assert.deepEqual(cat("Ceok"), []);
  assert.deepEqual(cat("Prieten al casei"), []); // „pr” ca prefix nu intră în marketing
  assert.deepEqual(cat("Prim-ministru"), []);
  assert.equal(F.potriveste("marketing", "PR Manager", null), true);
});

test("fără funcție și fără departament nu intră în nicio categorie", () => {
  assert.deepEqual(cat(null, null), []);
  assert.deepEqual(cat("", "  "), []);
});

test("selecția din adresă păstrează doar chei valide, fără dubluri", () => {
  assert.deepEqual(F.curataSelectieFunctii(["hr", "hr", "nimic", "nespecificat", "marketing"]), ["hr", "nespecificat", "marketing"]);
  assert.deepEqual(F.curataSelectieFunctii([]), []);
});

test("fiecare categorie are o expresie regulată validă", () => {
  for (const c of F.CHEI_FUNCTII) assert.doesNotThrow(() => new RegExp(F.regexFunctie(c)), c);
});
