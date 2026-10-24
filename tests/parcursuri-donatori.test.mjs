import { test } from "node:test";
import assert from "node:assert/strict";

const P = await import("../src/lib/parcursuri-donatori.ts");

test("cele trei parcursuri există, cu pași valabili și texte care folosesc doar variabile cunoscute", () => {
  assert.deepEqual(P.CHEI_PARCURS, ["welcome", "save", "upgrade", "reactivare"]);
  for (const cheie of P.CHEI_PARCURS) {
    const d = P.PARCURSURI[cheie];
    assert.equal(d.cheie, cheie);
    assert.ok(d.obiectiv.length > 5, "fiecare parcurs are un obiectiv spus în cuvinte");
    const v = P.valideazaPasi(d.pasi, cheie);
    assert.equal(v.ok, true, `${cheie}: ${JSON.stringify(v.erori)}`);
    for (const pas of d.pasi) assert.deepEqual([...P.variabileNecunoscute(pas.subiect), ...P.variabileNecunoscute(pas.corp)], [], cheie);
  }
});

test("Welcome are 2 pași (zi 3, apoi 11 zile după), Save 2 (zi 10, apoi 14 după), Upgrade 1 pas imediat", () => {
  assert.deepEqual(P.PARCURSURI.welcome.pasi.map((p) => p.zile), [3, 11]);
  assert.deepEqual(P.PARCURSURI.save.pasi.map((p) => p.zile), [10, 14]);
  assert.deepEqual(P.PARCURSURI.upgrade.pasi.map((p) => p.zile), [0]);
  assert.deepEqual(P.PARCURSURI.reactivare.pasi.map((p) => p.zile), [0, 14]);
});

test("variabile necunoscute (greșeli de scriere) sunt prinse la salvare", () => {
  assert.deepEqual(P.variabileNecunoscute("Bună {prenme}, {organizatie} {total} {x_y}"), ["prenme", "x_y"]);
  const r = P.valideazaPasi([{ zile: 3, subiect: "Salut {prenme}", corp: "Text {link}" }], "welcome");
  assert.equal(r.ok, false);
  assert.match(r.erori[0].mesaj, /\{prenme\}/);
});

test("validare: lipsuri, lungimi, zile; Upgrade poate avea 0 zile, restul minimum 1", () => {
  assert.equal(P.valideazaPasi([], "welcome").ok, false);
  assert.equal(P.valideazaPasi("nu", "welcome").ok, false);
  assert.equal(P.valideazaPasi(Array.from({ length: 5 }, () => ({ zile: 1, subiect: "a", corp: "b" })), "welcome").ok, false);
  const gol = P.valideazaPasi([{ zile: 3, subiect: "", corp: "" }], "welcome");
  assert.equal(gol.ok, false);
  assert.equal(gol.erori.length, 2);
  assert.equal(P.valideazaPasi([{ zile: 0, subiect: "a", corp: "b" }], "upgrade").ok, true);
  assert.equal(P.valideazaPasi([{ zile: 0, subiect: "a", corp: "b" }], "welcome").ok, false);
  assert.equal(P.valideazaPasi([{ zile: 366, subiect: "a", corp: "b" }], "welcome").ok, false);
  assert.equal(P.valideazaPasi([{ zile: 3, subiect: "x".repeat(141), corp: "b" }], "welcome").ok, false);
  assert.equal(P.valideazaPasi([{ zile: 3, subiect: "a", corp: "b".repeat(4001) }], "welcome").ok, false);
  assert.equal(P.valideazaPasi([{ zile: 3, subiect: "a", corp: "b", buton: "x".repeat(41) }], "welcome").ok, false);
});

test("validare: textele se curăță (rânduri noi în subiect, spații), butonul gol dispare, nu intră câmpuri străine", () => {
  const r = P.valideazaPasi([{ zile: 3.4, subiect: " Salut\r\n{prenume} ", corp: " Text\r\n\r\nAl doilea ", buton: "  ", extra: "x" }], "welcome");
  assert.equal(r.ok, true);
  assert.deepEqual(r.pasi[0], { zile: 3, subiect: "Salut {prenume}", corp: "Text\n\nAl doilea" });
});

test("variabilele se înlocuiesc; cele fără valoare dispar fără să lase spații sau „{}” în mesaj", () => {
  assert.equal(P.aplicaVariabile("Bună, {prenume}! Donezi {suma} lei.", { prenume: "Ana", suma: "50" }), "Bună, Ana! Donezi 50 lei.");
  assert.equal(P.aplicaVariabile("Bună, {prenume}!", {}), "Bună,!");
  assert.equal(P.aplicaVariabile("Proiect ({campanie}) merge.", {}), "Proiect merge.");
  assert.ok(!P.aplicaVariabile("{campanie} {link} {x}", {}).includes("{"));
});

test("randare HTML: paragrafe, linkuri clicabile, iar numele donatorului nu poate introduce HTML", () => {
  const html = P.corpHtml("Bună, {prenume}!\n\nVezi {link}", { prenume: '<img src=x onerror=alert(1)>', link: "https://alexandrit.ro/strangere-fonduri/ong/camp" });
  assert.equal((html.match(/<p /g) ?? []).length, 2);
  assert.ok(!html.includes("<img"), "HTML-ul din nume e escapat");
  assert.ok(html.includes("&lt;img"));
  assert.match(html, /<a href="https:\/\/alexandrit\.ro\/strangere-fonduri\/ong\/camp"/);
});

test("subiectul randat nu poate avea rânduri noi (injectare de antete)", () => {
  assert.equal(P.subiectRandat("Salut {prenume}", { prenume: "Ana\r\nBcc: x@y.ro" }), "Salut Ana Bcc: x@y.ro");
});

test("prenumele pentru salut: primul cuvânt cu inițială mare; gol dacă nu arată a nume", () => {
  assert.equal(P.prenumePentruSalut("ion POPESCU"), "Ion");
  assert.equal(P.prenumePentruSalut("  maria  ionescu"), "Maria");
  assert.equal(P.prenumePentruSalut("ion@gmail.com"), "");
  assert.equal(P.prenumePentruSalut("12345"), "");
  assert.equal(P.prenumePentruSalut(null), "");
});

test("termene: un pas e scadent după N zile și rămâne valabil 14 zile, apoi se pierde", () => {
  const ancora = new Date("2026-11-01T10:00:00Z");
  const zi = (n) => new Date(ancora.getTime() + n * 86_400_000);
  assert.equal(P.pasScadent(ancora, 3, zi(2.9)), false, "înainte de scadență");
  assert.equal(P.pasScadent(ancora, 3, zi(3)), true, "la scadență");
  assert.equal(P.pasScadent(ancora, 3, zi(10)), true, "cron întârziat câteva zile");
  assert.equal(P.pasScadent(ancora, 3, zi(17)), true, "ultima zi a ferestrei");
  assert.equal(P.pasScadent(ancora, 3, zi(17.1)), false, "prea târziu: mesajul ar suna deplasat");
  assert.equal(P.pasScadent(ancora, 0, ancora), true, "Upgrade: imediat");
  assert.equal(P.pasScadent(ancora, 10, zi(55), 50), true, "Save: abonamentul oprit e observat târziu, fereastră de 50 de zile");
  assert.equal(P.pasScadent(ancora, 10, zi(61), 50), false);
});

test("procentul de conversie: rotunjit, fără împărțire la zero", () => {
  assert.equal(P.procentConversie(1, 3), 33);
  assert.equal(P.procentConversie(2, 3), 67);
  assert.equal(P.procentConversie(0, 10), 0);
  assert.equal(P.procentConversie(5, 0), null);
  assert.equal(P.procentConversie(Number.NaN, 4), null);
  assert.equal(P.FEREASTRA_CONVERSIE_ZILE, 30);
});

test("ore de liniște: mesaje doar între 9:00 și 19:00, ora României (vară și iarnă)", () => {
  // Iarnă (UTC+2): 08:00 UTC = 10:00 la București; 06:59 UTC = 08:59; 16:59 UTC = 18:59; 17:00 UTC = 19:00.
  assert.equal(P.inIntervalDeTrimitere(new Date("2026-12-01T08:00:00Z")), true);
  assert.equal(P.inIntervalDeTrimitere(new Date("2026-12-01T06:59:00Z")), false);
  assert.equal(P.inIntervalDeTrimitere(new Date("2026-12-01T07:00:00Z")), true);
  assert.equal(P.inIntervalDeTrimitere(new Date("2026-12-01T16:59:00Z")), true);
  assert.equal(P.inIntervalDeTrimitere(new Date("2026-12-01T17:00:00Z")), false);
  // Vară (UTC+3): 08:00 UTC = 11:00; 05:59 UTC = 08:59; 16:00 UTC = 19:00.
  assert.equal(P.inIntervalDeTrimitere(new Date("2026-07-01T08:00:00Z")), true);
  assert.equal(P.inIntervalDeTrimitere(new Date("2026-07-01T05:59:00Z")), false);
  assert.equal(P.inIntervalDeTrimitere(new Date("2026-07-01T16:00:00Z")), false);
  assert.equal(P.inIntervalDeTrimitere(new Date("2026-07-02T00:30:00Z")), false);
});
