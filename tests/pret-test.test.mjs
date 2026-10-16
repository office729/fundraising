import { test } from "node:test";
import assert from "node:assert/strict";

import { pretDeTest, PRET_TEST_MAXIM_LEI } from "../src/lib/billing/pret-test.ts";

const env = (o) => ({ NETOPIA_PRET_TEST_ORG: "test", NETOPIA_PRET_TEST_LEI: "1", ...o });

test("fără variabile: nicio suprascriere", () => {
  assert.equal(pretDeTest("test", {}), null);
  assert.equal(pretDeTest("test", { NETOPIA_PRET_TEST_LEI: "1" }), null, "fără organizație țintă");
  assert.equal(pretDeTest("test", { NETOPIA_PRET_TEST_ORG: "test" }), null, "fără sumă");
});

test("organizația potrivită primește suma de test", () => {
  assert.equal(pretDeTest("test", env({})), 1);
  assert.equal(pretDeTest("test", env({ NETOPIA_PRET_TEST_LEI: " 3 " })), 3);
});

test("orice altă organizație rămâne la prețul real", () => {
  assert.equal(pretDeTest("alta-org", env({})), null);
  assert.equal(pretDeTest("test2", env({})), null);
  assert.equal(pretDeTest("Test", env({})), null, "slug-ul se compară exact");
});

test("valori invalide sau peste plafon sunt ignorate", () => {
  for (const v of ["0", "-1", "1.5", "abc", "", `${PRET_TEST_MAXIM_LEI + 1}`, "49", "1e1"]) {
    assert.equal(pretDeTest("test", env({ NETOPIA_PRET_TEST_LEI: v })), null, v);
  }
  assert.equal(pretDeTest("test", env({ NETOPIA_PRET_TEST_LEI: `${PRET_TEST_MAXIM_LEI}` })), PRET_TEST_MAXIM_LEI);
});
