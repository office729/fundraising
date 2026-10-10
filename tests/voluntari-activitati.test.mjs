import { test } from "node:test";
import assert from "node:assert/strict";

import {
  calculeazaOre,
  dinOraRo,
  laOraRo,
  linkCuUtm,
  normalizeazaLink,
  sarcinaDeschisa,
  statusInscriereNoua,
  statusVoluntar,
} from "../src/lib/voluntari-activitati.ts";

test("ora României: iarna UTC+2, vara UTC+3, dus-întors", () => {
  assert.equal(dinOraRo("2026-01-15T09:00").toISOString(), "2026-01-15T07:00:00.000Z");
  assert.equal(dinOraRo("2026-07-15T09:00").toISOString(), "2026-07-15T06:00:00.000Z");
  assert.equal(laOraRo(dinOraRo("2026-07-15T09:30")), "2026-07-15T09:30");
  assert.equal(laOraRo(dinOraRo("2026-01-15T23:45")), "2026-01-15T23:45");
  assert.equal(dinOraRo("nu e o dată"), null);
});

test("orele se rotunjesc la sfert de oră și nu sunt negative", () => {
  assert.equal(calculeazaOre(new Date("2026-01-01T09:00Z"), new Date("2026-01-01T12:10Z")), 3.25);
  assert.equal(calculeazaOre(new Date("2026-01-01T12:00Z"), new Date("2026-01-01T09:00Z")), 0);
});

test("statusul voluntarului: nou, activ, inactiv după 90 de zile", () => {
  assert.equal(statusVoluntar(null), "nou");
  assert.equal(statusVoluntar(new Date(Date.now() - 10 * 86400000)), "activ");
  assert.equal(statusVoluntar(new Date(Date.now() - 100 * 86400000)), "inactiv");
});

test("statusul unei înscrieri noi: manual, confirmată sau pe rezervă", () => {
  assert.equal(statusInscriereNoua("manuala", 0, 5), "in_asteptare");
  assert.equal(statusInscriereNoua("automata", 4, 5), "confirmata");
  assert.equal(statusInscriereNoua("automata", 5, 5), "rezerva");
});

test("linkurile: doar http(s); orice altă schemă e refuzată", () => {
  assert.equal(normalizeazaLink("javascript:alert(1)"), null);
  assert.equal(normalizeazaLink("mailto:a@b.ro"), null);
  assert.equal(normalizeazaLink("data:text/html,x"), null);
  assert.equal(normalizeazaLink("exemplu.ro/x"), "https://exemplu.ro/x");
  assert.equal(normalizeazaLink("http://ex.ro"), "http://ex.ro/");
  assert.equal(normalizeazaLink(""), null);
});

test("UTM: litere mici, fără diacritice, păstrează parametrii existenți, fără date personale", () => {
  const l = new URL(linkCuUtm("https://ex.ro/p?a=1", { canal: "WhatsApp", campanie: "Operație Ștefan", sarcina: "a2ce6fd6" }));
  assert.equal(l.searchParams.get("utm_source"), "voluntar");
  assert.equal(l.searchParams.get("utm_medium"), "whatsapp");
  assert.equal(l.searchParams.get("utm_campaign"), "operatie-stefan");
  assert.equal(l.searchParams.get("utm_content"), "a2ce6fd6");
  assert.equal(l.searchParams.get("a"), "1");
});

test("o sarcină e deschisă doar publicată, în interval și cât mai sunt locuri", () => {
  const s = { stare: "publicata", inceputLa: null, termen: "2026-05-01", nrVoluntari: 2, finalizari: 1 };
  assert.equal(sarcinaDeschisa(s, "2026-04-30"), true);
  assert.equal(sarcinaDeschisa(s, "2026-05-02"), false);
  assert.equal(sarcinaDeschisa({ ...s, finalizari: 2 }, "2026-04-30"), false);
  assert.equal(sarcinaDeschisa({ ...s, stare: "inchisa" }, "2026-04-30"), false);
  assert.equal(sarcinaDeschisa({ ...s, inceputLa: "2026-05-01" }, "2026-04-30"), false);
});
