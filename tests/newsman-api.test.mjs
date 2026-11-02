import { test } from "node:test";
import assert from "node:assert/strict";

const { construiesteCerereInitSubscribe, interpreteazaRaspunsInit, NEWSMAN_API_BAZA } = await import("../src/lib/newsman-api.ts");

const cred = { userId: "12345", apiKey: "cheie/cu+caractere", listId: "14305" };

test("cererea de abonare cu confirmare: adresa API 1.2 cu cheia codificată, toți parametrii obligatorii în corp", () => {
  const { url, corp } = construiesteCerereInitSubscribe(cred, { email: "a+b@exemplu.ro", ip: "203.0.113.7" });
  assert.equal(url, `${NEWSMAN_API_BAZA}/12345/cheie%2Fcu%2Bcaractere/subscriber.initSubscribe.json`);
  const p = new URLSearchParams(corp);
  assert.equal(p.get("list_id"), "14305");
  assert.equal(p.get("email"), "a+b@exemplu.ro", "plus-ul din adresă se păstrează (codificat în corp)");
  assert.equal(p.get("ip"), "203.0.113.7");
  assert.equal(p.get("firstname"), "");
  assert.equal(p.get("lastname"), "");
  assert.ok(p.has("props[tag_sursa-site]"));
});

test("se folosește doar initSubscribe (confirmare), niciodată saveSubscribe (abonare directă)", () => {
  const { url } = construiesteCerereInitSubscribe(cred, { email: "x@y.ro", ip: "1.2.3.4" });
  assert.ok(url.endsWith("/subscriber.initSubscribe.json"));
  assert.ok(!url.includes("saveSubscribe"));
});

test("răspunsul: ID-ul acțiunii = confirmare trimisă; codurile cunoscute se mapează; restul e eroare", () => {
  assert.deepEqual(interpreteazaRaspunsInit(200, "3012"), { rezultat: "confirmare_trimisa" });
  assert.deepEqual(interpreteazaRaspunsInit(200, '"3012"'), { rezultat: "confirmare_trimisa" });
  assert.deepEqual(interpreteazaRaspunsInit(200, "3012\n"), { rezultat: "confirmare_trimisa" });
  const eroare = (code) => interpreteazaRaspunsInit(200, JSON.stringify({ err: true, message: "x", code }));
  assert.deepEqual(eroare(130), { rezultat: "deja_abonat", cod: 130 });
  assert.deepEqual(eroare(128), { rezultat: "prea_des", cod: 128 });
  assert.deepEqual(eroare(123), { rezultat: "email_invalid", cod: 123 });
  assert.deepEqual(eroare(122), { rezultat: "ip_invalid", cod: 122 });
  for (const cod of [101, 108, 126, 144, 201, 407, 10001]) assert.equal(eroare(cod).rezultat, "eroare", String(cod));
});

test("răspunsuri neașteptate nu sunt considerate succes", () => {
  assert.equal(interpreteazaRaspunsInit(500, "3012").rezultat, "eroare", "status HTTP de eroare");
  assert.equal(interpreteazaRaspunsInit(200, "").rezultat, "eroare");
  assert.equal(interpreteazaRaspunsInit(200, "<html>Eroare</html>").rezultat, "eroare");
  assert.equal(interpreteazaRaspunsInit(200, "[]").rezultat, "eroare");
  assert.equal(interpreteazaRaspunsInit(200, "null").rezultat, "eroare");
  assert.equal(interpreteazaRaspunsInit(200, JSON.stringify({ err: true })).rezultat, "eroare", "eroare fără cod");
});
