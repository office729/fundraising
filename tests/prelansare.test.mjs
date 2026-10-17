import { test } from "node:test";
import assert from "node:assert/strict";

const P = await import("../src/lib/prelansare.ts");

const utc = (s) => Date.parse(s);

test("25 octombrie 00:00 e încă ora de vară (UTC+3), 26 octombrie 00:00 e ora de iarnă (UTC+2)", () => {
  assert.equal(P.CRONOMETRU_PANA_MS, utc("2026-10-24T21:00:00Z"));
  assert.equal(P.LIVE_DE_LA_MS, utc("2026-10-25T22:00:00Z"));
  // între cele două momente trec 25 de ore: ziua în care se schimbă ora are 25 de ore
  assert.equal((P.LIVE_DE_LA_MS - P.CRONOMETRU_PANA_MS) / 3_600_000, 25);
});

test("fazele: numărătoare, ajun (25 octombrie, doar administratorii), live (de pe 26 octombrie)", () => {
  assert.equal(P.starePrelansare(utc("2026-10-17T12:00:00Z")), "numaratoare");
  assert.equal(P.starePrelansare(P.CRONOMETRU_PANA_MS - 1), "numaratoare");
  assert.equal(P.starePrelansare(P.CRONOMETRU_PANA_MS), "ajun");
  assert.equal(P.starePrelansare(P.LIVE_DE_LA_MS - 1), "ajun");
  assert.equal(P.starePrelansare(P.LIVE_DE_LA_MS), "live");
  assert.equal(P.starePrelansare(utc("2027-01-01T00:00:00Z")), "live");
});

test("întrerupătorul de urgență deschide site-ul pentru toți, oricând", () => {
  assert.equal(P.starePrelansare(utc("2026-10-17T12:00:00Z"), true), "live");
});

test("cronometrul numără spre 25 octombrie, apoi spre 26 octombrie", () => {
  assert.equal(P.tintaCronometru("numaratoare"), P.CRONOMETRU_PANA_MS);
  assert.equal(P.tintaCronometru("ajun"), P.LIVE_DE_LA_MS);
});

test("descompunerea timpului rămas în zile, ore, minute, secunde", () => {
  assert.deepEqual(P.descompune(((7 * 24 + 3) * 3600 + 25 * 60 + 9) * 1000 + 999), { zile: 7, ore: 3, minute: 25, secunde: 9, total: (7 * 24 + 3) * 3600 + 25 * 60 + 9 });
  assert.deepEqual(P.descompune(0), { zile: 0, ore: 0, minute: 0, secunde: 0, total: 0 });
  assert.equal(P.descompune(-5000).total, 0); // niciodată negativ
  assert.equal(P.descompune(59_999).secunde, 59);
});

test("paginile comerciale sunt închise publicului, cele operaționale și legale rămân deschise", () => {
  for (const c of ["/", "/hub", "/signup", "/cine-suntem", "/ce-facem", "/automatizari", "/premii", "/blog", "/blog/un-articol", "/hub/"]) assert.equal(P.esteCaleInchisaPublicului(c), true, c);
  for (const c of [
    "/login",
    "/forgot-password",
    "/contact",
    "/termeni",
    "/termeni-donatori",
    "/gdpr",
    "/dpa",
    "/cookies",
    "/strangere-fonduri/ong/campanie",
    "/strangere-fonduri/ong/campanie/embed",
    "/f230/ong/beneficiar",
    "/api/stripe/webhook/ong",
    "/api/netopia/ipn",
    "/api/cron/reclame-meta",
    "/dezabonare",
    "/dezabonare-notificare",
    "/invite/token",
    "/ong-test/crm",
    "/v/cod",
    "/s/cod",
    "/prelansare",
    "/embed.js",
  ])
    assert.equal(P.esteCaleInchisaPublicului(c), false, c);
});

test("înscrierea cu invitație rămâne deschisă (clienții existenți își adaugă colegi)", () => {
  assert.equal(P.esteCaleInchisaPublicului("/signup", false), true);
  assert.equal(P.esteCaleInchisaPublicului("/signup", true), false);
});
