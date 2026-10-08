import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeazaTelefon } from "../src/lib/telefon.ts";

test("numere valide se curăță la cifre", () => {
  assert.equal(normalizeazaTelefon("0722 123 456"), "0722123456");
  assert.equal(normalizeazaTelefon("0722-123-456"), "0722123456");
  assert.equal(normalizeazaTelefon("(0722) 123.456"), "0722123456");
  assert.equal(normalizeazaTelefon("+40 722 123 456"), "+40722123456");
});

test("valori care nu sunt telefoane sunt respinse", () => {
  assert.equal(normalizeazaTelefon(""), null);
  assert.equal(normalizeazaTelefon("telefon"), null);
  assert.equal(normalizeazaTelefon("0722 abc 456"), null);
  assert.equal(normalizeazaTelefon("12345"), null);
  assert.equal(normalizeazaTelefon("1".repeat(20)), null);
});
