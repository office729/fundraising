import { test } from "node:test";
import assert from "node:assert/strict";

const C = await import("../src/lib/cronologie-donator.ts");

test("donația: titlu cu suma, lunară, stare; donațiile eșuate și rambursate au ton diferit", () => {
  const ok = C.evenimentDonatie({ id: "1", la: "2026-10-01T10:00:00Z", suma: 100, status: "reusita", recurenta: false, proiect: "Campania X" });
  assert.equal(ok.titlu, "Donație: 100 lei");
  assert.equal(ok.detaliu, "Proiect: Campania X");
  assert.equal(ok.ton, "verde");
  assert.equal(C.evenimentDonatie({ id: "2", la: "2026-10-01", suma: 25, status: "reusita", recurenta: true }).titlu, "Donație: 25 lei (lunară)");
  assert.equal(C.evenimentDonatie({ id: "3", la: "2026-10-01", suma: 25, status: "esuata", recurenta: false }).ton, "rosu");
  assert.equal(C.evenimentDonatie({ id: "4", la: "2026-10-01", suma: 25, status: "rambursata", recurenta: false }).titlu, "Donație rambursată: 25 lei");
  assert.match(C.evenimentDonatie({ id: "5", la: "2026-10-01", suma: 25, status: "ciudat", recurenta: false }).titlu, /ciudat/);
});

test("notița și apelul: apelul arată rezultatul; refuzul e roșu; un tip necunoscut devine notiță", () => {
  const apel = C.evenimentNota({ id: "a", la: "2026-10-02T09:00:00Z", tip: "apel", text: "A zis că revine", rezultat: "raspuns", autor: "Ana" });
  assert.equal(apel.tip, "apel");
  assert.equal(apel.titlu, "Apel: A răspuns");
  assert.equal(apel.autor, "Ana");
  assert.equal(C.evenimentNota({ id: "b", la: "2026-10-02", tip: "apel", text: "x", rezultat: "refuz" }).ton, "rosu");
  assert.equal(C.evenimentNota({ id: "c", la: "2026-10-02", tip: "apel", text: "x", rezultat: "inventat" }).titlu, "Apel");
  assert.equal(C.evenimentNota({ id: "d", la: "2026-10-02", tip: "zzz", text: "x" }).tip, "nota");
  assert.equal(C.evenimentNota({ id: "e", la: "2026-10-02", tip: "email", text: "x" }).tip, "email_echipa");
  assert.equal(C.evenimentNota({ id: "f", la: "2026-10-02", tip: "intalnire", text: "x" }).titlu, "Întâlnire");
});

test("e-mailurile de parcurs: trimis, în curs și grup de control", () => {
  assert.equal(C.evenimentParcurs({ id: "1", la: "2026-10-03", numeParcurs: "Welcome", pas: 2, stare: "trimis" }).titlu, "E-mail din parcursul „Welcome”, pasul 2");
  assert.match(C.evenimentParcurs({ id: "2", la: "2026-10-03", numeParcurs: "Welcome", pas: 1, stare: "in_curs" }).titlu, /în curs de trimitere/);
  const control = C.evenimentParcurs({ id: "3", la: "2026-10-03", numeParcurs: "Upgrade", pas: 1, stare: "control" });
  assert.match(control.titlu, /grupul de control/);
  assert.equal(control.ton, "neutru");
});

test("evenimentele de stare: acord, dezabonare, adresă respinsă, marcaje; nimic când lipsesc datele", () => {
  assert.deepEqual(C.evenimenteDeStare({}), []);
  const toate = C.evenimenteDeStare({ acordLa: "2026-09-01", acordSursa: "declarat_echipa", dezabonatLa: "2026-10-05", adresaLa: "2026-10-06", adresaStare: "respins", adresaMotiv: "Serverul a răspuns că adresa nu există", sunatLa: "2026-10-07", multumitLa: "2026-10-08" });
  assert.equal(toate.length, 5);
  assert.match(toate.find((e) => e.tip === "acord_email").detaliu, /nu intră în parcursurile automate/);
  assert.equal(toate.find((e) => e.tip === "adresa").ton, "rosu");
  assert.equal(C.evenimenteDeStare({ adresaLa: "2026-10-06", adresaStare: "ok" }).length, 0, "o adresă „ok” nu e un eveniment");
  assert.match(C.evenimenteDeStare({ adresaLa: "2026-10-06", adresaStare: "reclamat" })[0].titlu, /spam/);
});

test("ordinea: cele mai noi întâi, date invalide ignorate, ordine stabilă la dată egală, limită", () => {
  const e = (id, la) => ({ id, tip: "nota", la, titlu: id, ton: "neutru" });
  const lista = C.ordoneazaCronologie([e("vechi", "2026-01-01T00:00:00Z"), e("nou", "2026-10-01T00:00:00Z"), e("rau", "nu e dată"), e("egal1", "2026-05-01T00:00:00Z"), e("egal2", "2026-05-01T00:00:00Z")]);
  assert.deepEqual(lista.map((x) => x.id), ["nou", "egal1", "egal2", "vechi"]);
  assert.equal(C.ordoneazaCronologie(lista, 2).length, 2);
  assert.equal(C.ordoneazaCronologie(lista, 0).length, 0);
});

test("gruparea pe luni păstrează ordinea și pune la un loc lunile consecutive", () => {
  const e = (id, la) => ({ id, tip: "nota", la, titlu: id, ton: "neutru" });
  const g = C.grupeazaPeLuni([e("a", "2026-10-20T10:00:00Z"), e("b", "2026-10-02T10:00:00Z"), e("c", "2026-08-15T10:00:00Z")]);
  assert.equal(g.length, 2);
  assert.match(g[0].luna, /octombrie 2026/);
  assert.deepEqual(g[0].evenimente.map((x) => x.id), ["a", "b"]);
  assert.match(g[1].luna, /august 2026/);
});

test("textul notiței: curățat, tăiat, gol = null; tipurile și rezultatele cunoscute", () => {
  assert.equal(C.curataTextNota("  Sunat\r\nRevine  "), "Sunat\nRevine");
  assert.equal(C.curataTextNota("   "), null);
  assert.equal(C.curataTextNota(7), null);
  assert.equal(C.curataTextNota("a\u0000b"), "ab");
  assert.equal(C.curataTextNota("x".repeat(9000)).length, C.MAX_TEXT_NOTA);
  for (const t of ["nota", "apel", "intalnire", "email"]) assert.equal(C.esteTipNota(t), true);
  assert.equal(C.esteTipNota("sms"), false);
  assert.equal(C.esteRezultatApel("mesaj_vocal"), true);
  assert.equal(C.esteRezultatApel("x"), false);
});
