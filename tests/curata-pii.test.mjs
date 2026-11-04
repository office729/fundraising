import { test } from "node:test";
import assert from "node:assert/strict";

const { curataPii } = await import("../src/lib/curata-pii.ts");

test("adresele de email dispar din textul trimis la AI", () => {
  assert.equal(curataPii("scrie-i pe ana.pop+ong@exemplu.ro, e ok"), "scrie-i pe [email eliminat], e ok");
  assert.equal(curataPii("a@b.ro și C.D@E-F.COM"), "[email eliminat] și [email eliminat]");
});

test("telefoanele și CNP-urile dispar, în formate obișnuite", () => {
  assert.equal(curataPii("sună la 0722 123 456 mâine"), "sună la [număr eliminat] mâine");
  assert.equal(curataPii("tel +40 722.123.456"), "tel [număr eliminat]");
  assert.equal(curataPii("tel 0722-123-456."), "tel [număr eliminat].");
  assert.equal(curataPii("CNP 1850101123456"), "CNP [număr eliminat]");
  assert.equal(curataPii("(0722) 123 456"), "[număr eliminat]");
});

test("IBAN-ul dispare", () => {
  assert.equal(curataPii("cont RO49AAAA1B31007593840000 deschis"), "cont [cont eliminat] deschis");
});

test("datele calendaristice, anii, sumele și numerele mici rămân", () => {
  assert.equal(curataPii("evenimentul din 15.12.2026 ora 19"), "evenimentul din 15.12.2026 ora 19");
  assert.equal(curataPii("pe 3/12/2026 și 2026-12-15"), "pe 3/12/2026 și 2026-12-15");
  assert.equal(curataPii("am strâns 12.500 lei din 340 de donații în 2025"), "am strâns 12.500 lei din 340 de donații în 2025");
});

test("o dată urmată de un telefon: data rămâne, telefonul dispare", () => {
  assert.equal(curataPii("la 15.12.2026 sună la 0722 123 456"), "la 15.12.2026 sună la [număr eliminat]");
});

test("controalele și spațiile se strâng, textul se plafonează la max, valorile nestring dau gol", () => {
  assert.equal(curataPii("  ton \n\n personal​  "), "ton personal");
  assert.equal(curataPii("x".repeat(900), 400).length, 400);
  assert.equal(curataPii("abcdef", 3), "abc");
  assert.equal(curataPii(undefined), "");
  assert.equal(curataPii(42), "");
  assert.equal(curataPii(null), "");
});

test("emailul lung nu scapă la tăiere: se curăță înainte de plafonare", () => {
  const s = `${"a".repeat(380)} scrie la ana.pop@exemplu.ro`;
  assert.ok(!curataPii(s, 400).includes("ana.pop"));
  assert.ok(!curataPii(s, 400).includes("@"));
});
