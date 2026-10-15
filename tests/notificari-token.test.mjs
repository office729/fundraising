import { test } from "node:test";
import assert from "node:assert/strict";

const { esteTipNotificare, semneazaNotificare, verificaSemnaturaNotificare } = await import("../src/lib/notificari-token.ts");

const CHEIE = "cheie-de-test-cu-destula-lungime-0123456789";
const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";

test("linkul de dezabonare e valid doar pentru același utilizator, același tip și aceeași cheie", () => {
  const t = semneazaNotificare(CHEIE, "rezumat-calendar", U1);
  assert.equal(verificaSemnaturaNotificare(CHEIE, "rezumat-calendar", U1, t), true);
  assert.equal(verificaSemnaturaNotificare(CHEIE, "rezumat-calendar", U2, t), false); // alt utilizator
  assert.equal(verificaSemnaturaNotificare(CHEIE, "invitatie-feedback", U1, t), false); // alt tip de notificare
  assert.equal(verificaSemnaturaNotificare("alta-cheie-complet-diferita-0123456789", "rezumat-calendar", U1, t), false);
  assert.equal(verificaSemnaturaNotificare(CHEIE, "rezumat-calendar", U1, t + "x"), false); // semnătură modificată
});

test("intrările lipsă sau invalide sunt respinse fără erori", () => {
  const t = semneazaNotificare(CHEIE, "rezumat-calendar", U1);
  assert.equal(verificaSemnaturaNotificare(CHEIE, null, U1, t), false);
  assert.equal(verificaSemnaturaNotificare(CHEIE, "rezumat-calendar", null, t), false);
  assert.equal(verificaSemnaturaNotificare(CHEIE, "rezumat-calendar", U1, null), false);
  assert.equal(verificaSemnaturaNotificare(CHEIE, "rezumat-calendar", "nu-e-uuid", t), false);
  assert.equal(verificaSemnaturaNotificare(CHEIE, "tip-inventat", U1, t), false);
  assert.equal(verificaSemnaturaNotificare("", "rezumat-calendar", U1, t), false);
});

test("majusculele din UUID nu schimbă semnătura; tipurile cunoscute sunt doar cele două", () => {
  assert.equal(semneazaNotificare(CHEIE, "rezumat-calendar", U1.toUpperCase()), semneazaNotificare(CHEIE, "rezumat-calendar", U1));
  assert.equal(esteTipNotificare("rezumat-calendar"), true);
  assert.equal(esteTipNotificare("invitatie-feedback"), true);
  assert.equal(esteTipNotificare("altceva"), false);
  assert.equal(esteTipNotificare(5), false);
});
