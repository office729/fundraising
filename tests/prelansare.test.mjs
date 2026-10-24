import { test } from "node:test";
import assert from "node:assert/strict";

const P = await import("../src/lib/prelansare.ts");

const utc = (s) => Date.parse(s);

test("lansarea e pe 26 octombrie 2026, ora 06:00 în România (ora de iarnă, UTC+2): 04:00 UTC", () => {
  assert.equal(P.LIVE_DE_LA_MS, utc("2026-10-26T04:00:00Z"));
});

test("fazele: numărătoare până la 06:00 pe 26 octombrie, apoi live (nu mai există o zi „de ajun”)", () => {
  assert.equal(P.starePrelansare(utc("2026-10-17T12:00:00Z")), "numaratoare");
  assert.equal(P.starePrelansare(utc("2026-10-25T22:00:00Z")), "numaratoare", "26 octombrie, ora 00:00, nu mai e lansarea");
  assert.equal(P.starePrelansare(P.LIVE_DE_LA_MS - 1), "numaratoare");
  assert.equal(P.starePrelansare(P.LIVE_DE_LA_MS), "live");
  assert.equal(P.starePrelansare(utc("2027-01-01T00:00:00Z")), "live");
});

test("întrerupătorul de urgență deschide site-ul pentru toți, oricând", () => {
  assert.equal(P.starePrelansare(utc("2026-10-17T12:00:00Z"), true), "live");
});

test("cronometrul arată timpul până la lansare: 24 octombrie, ora 09:00 (România) înseamnă 1 zi și 22 de ore", () => {
  // 24 oct. ora 09:00 în România (ora de vară, UTC+3) = 06:00 UTC
  const t = P.descompune(P.LIVE_DE_LA_MS - utc("2026-10-24T06:00:00Z"));
  assert.deepEqual({ zile: t.zile, ore: t.ore, minute: t.minute, secunde: t.secunde }, { zile: 1, ore: 22, minute: 0, secunde: 0 });
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
