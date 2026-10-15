import { test } from "node:test";
import assert from "node:assert/strict";

import { areModul, MODULE_PACHET } from "../src/lib/billing/packages.ts";
import { pachetPentruModule } from "../src/lib/billing/trial.ts";

const TOATE = Object.keys(MODULE_PACHET);

test("conturile administratorilor platformei văd toate modulele deschise, indiferent de pachetul organizației", () => {
  for (const email of ["office@salveazaoinima.ro", "OFFICE@salveazaoinima.ro", "vlad.placinta@alexandrit.ro", "andrei.placinta@alexandrit.ro"]) {
    for (const pkg of ["start", "crestere", "impact", "trial", "custom"]) {
      const efectiv = pachetPentruModule(pkg, email);
      for (const m of TOATE) assert.equal(areModul(efectiv, m), true, `${email} / ${pkg} / ${m}`);
    }
  }
});

test("ceilalți utilizatori rămân pe regulile pachetului", () => {
  assert.equal(pachetPentruModule("start", "client@exemplu.ro"), "start");
  assert.equal(areModul(pachetPentruModule("start", "client@exemplu.ro"), "granturi"), false);
  assert.equal(areModul(pachetPentruModule("crestere", "client@exemplu.ro"), "comunicat-presa"), false);
  assert.equal(areModul(pachetPentruModule("crestere", "client@exemplu.ro"), "kpi"), true);
  assert.equal(pachetPentruModule("start", null), "start");
  assert.equal(pachetPentruModule("start", undefined), "start");
  assert.equal(pachetPentruModule("start", ""), "start");
});
