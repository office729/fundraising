import { test } from "node:test";
import assert from "node:assert/strict";

const P = await import("../src/lib/parcursuri-donatori.ts");

test("cele cinci parcursuri există, cu pași valabili și texte care folosesc doar variabile cunoscute", () => {
  assert.deepEqual(P.CHEI_PARCURS, ["welcome", "save", "upgrade", "reactivare", "a_doua_donatie"]);
  for (const cheie of P.CHEI_PARCURS) {
    const d = P.PARCURSURI[cheie];
    assert.equal(d.cheie, cheie);
    assert.ok(d.obiectiv.length > 5, "fiecare parcurs are un obiectiv spus în cuvinte");
    const v = P.valideazaPasi(d.pasi, cheie);
    assert.equal(v.ok, true, `${cheie}: ${JSON.stringify(v.erori)}`);
    for (const pas of d.pasi) assert.deepEqual([...P.variabileNecunoscute(pas.subiect), ...P.variabileNecunoscute(pas.corp)], [], cheie);
  }
});

test("Welcome are 3 pași (zi 1, apoi +14, apoi +21), Save 2 (zi 10, apoi 14 după), Upgrade 1 pas imediat, A doua donație 1 pas la 2 zile", () => {
  assert.deepEqual(P.PARCURSURI.welcome.pasi.map((p) => p.zile), [1, 14, 21]);
  assert.deepEqual(P.PARCURSURI.a_doua_donatie.pasi.map((p) => p.zile), [2]);
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

test("„de lei”: de la 20 în sus și la sute pline; fără „de” sub 20; un leu", () => {
  const cazuri = [[0, "0 lei"], [1, "1 leu"], [2, "2 lei"], [12, "12 lei"], [19, "19 lei"], [20, "20 de lei"], [25, "25 de lei"], [60, "60 de lei"], [100, "100 de lei"], [101, "101 lei"], [119, "119 lei"], [120, "120 de lei"], [350, "350 de lei"]];
  for (const [n, asteptat] of cazuri) assert.equal(P.formatLei(n), asteptat);
  assert.match(P.formatLei(1200), /de lei$/);
  assert.equal(P.formatLei(Number.NaN), "0 lei");
  assert.equal(P.formatLei(-5), "0 lei");
});

test("suma lunară propusă urmează donația obișnuită, în trepte mici", () => {
  assert.equal(P.sumaLunaraSugerata(20), 10);
  assert.equal(P.sumaLunaraSugerata(49.9), 10);
  assert.equal(P.sumaLunaraSugerata(50), 25);
  assert.equal(P.sumaLunaraSugerata(199), 25);
  assert.equal(P.sumaLunaraSugerata(200), 50);
  assert.equal(P.sumaLunaraSugerata(Number.NaN), 10);
});

test("grupul de control: stabil pentru aceeași adresă, aproximativ 10%, doar la Upgrade și Reactivare", () => {
  const emailuri = Array.from({ length: 5000 }, (_, i) => "donator" + i + "@exemplu.ro");
  for (const cheie of ["upgrade", "reactivare"]) {
    const control = emailuri.filter((e) => P.esteInGrupDeControl(e, cheie));
    assert.ok(control.length > 350 && control.length < 650, cheie + ": " + control.length);
    for (const e of control.slice(0, 50)) assert.equal(P.esteInGrupDeControl(e.toUpperCase(), cheie), true, "majusculele nu schimbă grupul");
  }
  for (const cheie of ["welcome", "save", "a_doua_donatie"]) assert.equal(emailuri.some((e) => P.esteInGrupDeControl(e, cheie)), false, cheie);
});

test("validare: nu se pun adrese web în text și nici {suma}/{total}/{campanie} în subiect", () => {
  const cu = (parte) => P.valideazaPasi([{ zile: 3, subiect: "Salut", corp: "Text", ...parte }], "welcome");
  assert.equal(cu({}).ok, true);
  assert.equal(cu({ corp: "Vezi https://exemplu.ro/x" }).ok, false);
  assert.equal(cu({ corp: "Vezi www.exemplu.ro" }).ok, false);
  assert.equal(cu({ subiect: "Vezi http://x.ro" }).ok, false);
  assert.equal(cu({ corp: "Vezi {link}" }).ok, true);
  for (const v of ["{suma}", "{total}", "{campanie}"]) assert.equal(cu({ subiect: "Mulțumim pentru " + v }).ok, false, v);
  assert.equal(cu({ corp: "Ai donat {suma}, total {total}, la {campanie}" }).ok, true, "în text sunt permise");
  assert.equal(cu({ subiect: "Salut {prenume} de la {organizatie}" }).ok, true);
});

test("textele implicite respectă regulile: fără sume în subiect, fără „lei” după {suma}, fără adrese web", () => {
  for (const cheie of P.CHEI_PARCURS) for (const pas of P.PARCURSURI[cheie].pasi) {
    assert.doesNotMatch(pas.subiect, /\{(suma|total|campanie)\}/, cheie);
    assert.doesNotMatch(pas.corp, /\{(suma|total)\}\s*lei/i, cheie + ": unitatea e deja în variabilă");
    assert.doesNotMatch(pas.corp + pas.subiect, /https?:\/\/|www\./i, cheie);
  }
});

test("un text vechi cu „{suma} lei” nu produce „lei lei” când variabila include deja unitatea", () => {
  assert.equal(P.aplicaVariabile("Ai donat {suma} lei.", { suma: "100 de lei" }), "Ai donat 100 de lei.");
});

test("prenumele care arată a adresă sau a cale nu intră în salut", () => {
  assert.equal(P.prenumePentruSalut("verifica.contul.ro"), "");
  assert.equal(P.prenumePentruSalut("https://x.ro"), "");
  assert.equal(P.prenumePentruSalut("Ana-Maria Pop"), "Ana-maria");
});

test("linkul de donație: pagina campaniei; la mesajele cu donație lunară, cu ?lunar=1 și suma propusă", () => {
  assert.equal(P.adresaPagina("https://alexandrit.ro", "asociatia-x", "campania-1"), "https://alexandrit.ro/strangere-fonduri/asociatia-x/campania-1");
  assert.equal(P.adresaPagina("https://alexandrit.ro", "asociatia-x", "campania-1", { suma: 25 }), "https://alexandrit.ro/strangere-fonduri/asociatia-x/campania-1?lunar=1&suma=25");
  assert.equal(P.adresaPagina("https://alexandrit.ro", "asociatia-x", "campania-1", {}), "https://alexandrit.ro/strangere-fonduri/asociatia-x/campania-1?lunar=1");
  assert.equal(P.adresaPagina("https://alexandrit.ro", "asociatia-x", null), null);
  assert.equal(P.adresaPagina("https://alexandrit.ro", "o rg", "pagină/rea"), "https://alexandrit.ro/strangere-fonduri/o%20rg/pagin%C4%83%2Frea", "segmentele se codifică");
});

test("mesajul propune donație lunară la Upgrade, A doua donație, Save sau când butonul o spune", () => {
  assert.equal(P.propuneLunar("upgrade", undefined), true);
  assert.equal(P.propuneLunar("a_doua_donatie", "Donez"), true);
  assert.equal(P.propuneLunar("save", "Reiau donația"), true);
  assert.equal(P.propuneLunar("welcome", "Vreau să donez lunar"), true);
  assert.equal(P.propuneLunar("welcome", "Vezi noutățile"), false);
  assert.equal(P.propuneLunar("reactivare", "Vezi ce am făcut"), false);
});

test("subsolul identifică organizația cu datele ei de contact, fără câmpuri goale", () => {
  assert.equal(P.subsolOrganizatie({ name: "Asociația X" }), "Asociația X");
  assert.equal(P.subsolOrganizatie({ name: "Asociația X", adresa: "  Str. Pomului 3, Iași ", telefon: "", emailContact: "contact@x.ro" }), "Asociația X (Str. Pomului 3, Iași · contact@x.ro)");
  assert.equal(P.subsolOrganizatie({ name: "X", adresa: null, telefon: null, emailContact: null }), "X");
});

test("trimiterea: respingerea clară a serverului se poate reîncerca, un timeout nu (poate a plecat)", () => {
  assert.equal(P.esteRespingereClara({ responseCode: 550 }), true);
  assert.equal(P.esteRespingereClara({ responseCode: 421 }), true);
  assert.equal(P.esteRespingereClara({ code: "EENVELOPE" }), true);
  assert.equal(P.esteRespingereClara({ code: "ECONNREFUSED" }), true);
  assert.equal(P.esteRespingereClara({ code: "ETIMEDOUT" }), false);
  assert.equal(P.esteRespingereClara({ code: "ESOCKET" }), false);
  assert.equal(P.esteRespingereClara(new Error("necunoscut")), false);
  assert.equal(P.esteRespingereClara(null), false);
});

test("plafoanele sunt în ordine: organizația nouă mai jos decât una obișnuită, global peste ambele", () => {
  assert.ok(P.PLAFON_ZI_ORGANIZATIE_NOUA < P.PLAFON_ZI_ORGANIZATIE);
  assert.ok(P.PLAFON_ZI_ORGANIZATIE <= P.PLAFON_ZI_GLOBAL);
  assert.equal(P.MAX_EMAILURI_30_ZILE, 3);
});
