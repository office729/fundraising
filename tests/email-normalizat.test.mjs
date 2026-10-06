import { test } from "node:test";
import assert from "node:assert/strict";

import { emailNormalizatPentruRegistru } from "../src/lib/email-normalizat.ts";

test("același cont de poștă = aceeași valoare", () => {
  assert.equal(emailNormalizatPentruRegistru("N.ume+1@Gmail.com"), "nume@gmail.com");
  assert.equal(emailNormalizatPentruRegistru("nume+altceva@googlemail.com"), "nume@gmail.com");
  assert.equal(emailNormalizatPentruRegistru(" Ion.Popescu+x@firma.ro "), "ion.popescu@firma.ro"); // punctele rămân la alte domenii
});

test("valoare fără @ rămâne neschimbată (normalizată)", () => {
  assert.equal(emailNormalizatPentruRegistru("  Altceva "), "altceva");
});
