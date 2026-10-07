import { test } from "node:test";
import assert from "node:assert/strict";

import { culoareTextPeFundal } from "../src/lib/culoare-text.ts";

test("fundal închis → text alb", () => {
  assert.equal(culoareTextPeFundal("#154a85"), "#ffffff");
  assert.equal(culoareTextPeFundal("#7C3AED"), "#ffffff");
});

test("fundal deschis → text închis", () => {
  assert.equal(culoareTextPeFundal("#5fb6ab"), "#0f172a");
  assert.equal(culoareTextPeFundal("#fde047"), "#0f172a");
});

test("valori invalide → alb (comportamentul de până acum)", () => {
  assert.equal(culoareTextPeFundal(null), "#ffffff");
  assert.equal(culoareTextPeFundal("rosu"), "#ffffff");
  assert.equal(culoareTextPeFundal("#fff"), "#ffffff");
});
