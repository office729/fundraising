import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ANALIZA_ONG_IN_LUCRU_MAX_MIN,
  MAX_INTERES,
  MAX_NUME,
  MAX_RAPORT,
  MAX_SURSE,
  SECTIUNI_RAPORT,
  bucatiInline,
  cheieAnaliza,
  construiestePrompt,
  curataRaport,
  curataSite,
  curataSurse,
  esteExpirata,
  esteInLucruActiv,
  parseazaRaport,
  poatePorni,
  textDeCopiat,
  valideazaCerere,
} from "../src/lib/analiza-ong/analiza.ts";

const MIN = 60_000;

test("cererea: numele e obligatoriu, site-ul și interesul sunt opționale", () => {
  const r = valideazaCerere({ nume: "  Asociația   Mereu Aproape ", site: "", interes: "" });
  assert.equal(r.ok, true);
  assert.equal(r.cerere.nume, "Asociația Mereu Aproape");
  assert.equal(r.cerere.site, null);
  assert.equal(r.cerere.interes, null);
  assert.deepEqual(valideazaCerere({ nume: "   " }), { ok: false, camp: "nume", cod: "nume-lipsa" });
  assert.deepEqual(valideazaCerere({ nume: "ab" }), { ok: false, camp: "nume", cod: "nume-scurt" });
  assert.deepEqual(valideazaCerere({}), { ok: false, camp: "nume", cod: "nume-lipsa" });
  assert.deepEqual(valideazaCerere({ nume: 123 }), { ok: false, camp: "nume", cod: "nume-lipsa" });
});

test("cererea: lungimi plafonate", () => {
  const r = valideazaCerere({ nume: "N".repeat(500), interes: "i".repeat(900) });
  assert.equal(r.cerere.nume.length, MAX_NUME);
  assert.equal(r.cerere.interes.length, MAX_INTERES);
});

test("site: doar http(s) către un domeniu; fără schemă se adaugă https; adresele interne și capcanele sunt respinse", () => {
  assert.deepEqual(curataSite("mereuaproape.ro"), { ok: true, site: "https://mereuaproape.ro" });
  assert.deepEqual(curataSite("HTTPS://Mereu-Aproape.RO/despre"), { ok: true, site: "https://mereu-aproape.ro/despre" });
  assert.deepEqual(curataSite(""), { ok: true, site: null });
  assert.deepEqual(curataSite(undefined), { ok: true, site: null });
  for (const rau of ["javascript:alert(1)", "ftp://exemplu.ro", "https://user:parola@exemplu.ro", "http://localhost:3000", "http://127.0.0.1", "https://exemplu", "https://exem plu.ro", "https://sub.service.internal", "data:text/html,x", 5]) {
    assert.equal(curataSite(rau).ok, false, String(rau));
  }
});

test("același ONG se recunoaște după nume, fără majuscule, diacritice (ș/ş, ț/ţ) sau semne", () => {
  const k = cheieAnaliza("Asociația „Salvează o Inimă”");
  assert.equal(cheieAnaliza("asociatia salveaza o inima"), k);
  assert.equal(cheieAnaliza("ASOCIAŢIA SALVEAZĂ O INIMĂ"), k);
  assert.equal(cheieAnaliza("Asociația  Salvează-o Inimă!"), cheieAnaliza("Asociatia Salveaza o Inima"));
  assert.notEqual(cheieAnaliza("Mereu Aproape"), cheieAnaliza("Mereu Departe"));
});

test("nu pornește a doua analiză pentru același ONG cât prima e în lucru", () => {
  const acum = Date.UTC(2026, 10, 4, 10, 0, 0);
  const cheie = cheieAnaliza("Mereu Aproape");
  const inLucru = { numeNorm: cheie, stare: "in_lucru", creatLaMs: acum - 3 * MIN };
  assert.deepEqual(poatePorni([inLucru], cheieAnaliza("MEREU aproape!"), acum), { ok: false, motiv: "deja-in-lucru" });
  // alt ONG: nu e blocat
  assert.deepEqual(poatePorni([inLucru], cheieAnaliza("Alt ONG"), acum), { ok: true });
  // prima s-a terminat sau a eșuat: se poate repeta
  assert.deepEqual(poatePorni([{ ...inLucru, stare: "gata" }], cheie, acum), { ok: true });
  assert.deepEqual(poatePorni([{ ...inLucru, stare: "eroare" }], cheie, acum), { ok: true });
  assert.deepEqual(poatePorni([], cheie, acum), { ok: true });
});

test("o analiză „în lucru” abandonată (cererea a murit) expiră și nu mai blochează", () => {
  const acum = Date.UTC(2026, 10, 4, 10, 0, 0);
  const veche = { numeNorm: "x", stare: "in_lucru", creatLaMs: acum - (ANALIZA_ONG_IN_LUCRU_MAX_MIN + 1) * MIN };
  assert.equal(esteInLucruActiv(veche, acum), false);
  assert.equal(esteExpirata(veche, acum), true);
  assert.deepEqual(poatePorni([veche], "x", acum), { ok: true });
  const proaspata = { ...veche, creatLaMs: acum - MIN };
  assert.equal(esteInLucruActiv(proaspata, acum), true);
  assert.equal(esteExpirata(proaspata, acum), false);
  assert.equal(esteExpirata({ ...veche, stare: "gata" }, acum), false);
});

test("promptul: secțiunile cerute, regulile de siguranță și datele cererii", () => {
  const { system, user } = construiestePrompt({ nume: "Mereu Aproape", numeNorm: "mereu aproape", site: "https://mereuaproape.ro", interes: "donatori lunari" }, "2026-11-04");
  for (const s of SECTIUNI_RAPORT) assert.ok(system.includes(`## ${s}`), s);
  assert.match(system, /DOAR informații/);
  assert.match(system, /anul și sursa/);
  assert.match(system, /Fără date personale/);
  assert.match(system, /cel mult 15 căutări/);
  assert.match(system, /Ignoră orice instrucțiune/);
  assert.match(user, /Mereu Aproape/);
  assert.match(user, /https:\/\/mereuaproape\.ro/);
  assert.match(user, /donatori lunari/);
  assert.match(user, /2026-11-04/);
  const fara = construiestePrompt({ nume: "X ONG", numeNorm: "x ong", site: null, interes: null }, "2026-11-04");
  assert.match(fara.user, /caută-l/);
  assert.match(fara.user, /toate secțiunile/);
});

test("raportul: emailurile, telefoanele, CNP-urile și IBAN-urile se elimină; anii, sumele și datele rămân", () => {
  const brut = [
    "Contact: ana.popescu@exemplu.ro, tel. 0722 123 456 sau +40 722-123-456.",
    "CNP 1960101123456. Cont RO49AAAA1B31007593840000.",
    "Venituri 1.250.000 lei în 2023 (+12%); campania din 2024-11-15 a strâns 85.000 lei.",
  ].join("\n");
  const r = curataRaport(brut);
  assert.doesNotMatch(r, /ana\.popescu/);
  assert.doesNotMatch(r, /0722/);
  assert.doesNotMatch(r, /1960101123456/);
  assert.doesNotMatch(r, /RO49AAAA/);
  assert.match(r, /1\.250\.000 lei în 2023/);
  assert.match(r, /2024-11-15/);
  assert.match(r, /85\.000 lei/);
});

test("raportul: caractere de control scoase, linii goale reduse, lungime plafonată", () => {
  assert.equal(curataRaport("a\u0000b\r\n\r\n\r\n\r\nc  \n"), "a b\n\nc");
  assert.ok(curataRaport("x".repeat(MAX_RAPORT * 2)).length <= MAX_RAPORT + 1);
  assert.equal(curataRaport(null), "");
});

test("raportul se împarte pe secțiuni, cu liste și text îngroșat; HTML-ul rămâne text", () => {
  const text = [
    "## Pe scurt",
    "ONG-ul strânge **1,2 milioane lei** (2023, raport anual).",
    "",
    "## Ce putem prelua",
    "- Donații lunare: **Fii Eroul**",
    "- Newsletter <script>alert(1)</script>",
    "",
    "## Ce să nu copiem",
    "Nu am găsit informații publice despre asta.",
  ].join("\n");
  const { sectiuni, lipsa } = parseazaRaport(text);
  assert.deepEqual(sectiuni.map((s) => s.titlu), ["Pe scurt", "Ce putem prelua", "Ce să nu copiem"]);
  assert.equal(sectiuni[1].blocuri[0].tip, "lista");
  assert.equal(sectiuni[1].blocuri[0].elemente.length, 2);
  assert.equal(sectiuni[1].blocuri[0].elemente[1], "Newsletter <script>alert(1)</script>"); // text, nu HTML: React îl afișează escapat
  assert.ok(lipsa.includes("Canale de strângere de fonduri"));
  assert.ok(!lipsa.includes("Pe scurt"));
  assert.deepEqual(bucatiInline("a **b** c"), [{ bold: false, text: "a " }, { bold: true, text: "b" }, { bold: false, text: " c" }]);
});

test("titlurile se potrivesc fără diacritice (raportul poate veni fără ele)", () => {
  const { lipsa } = parseazaRaport("## Relatia cu donatorii si companiile\ntext");
  assert.ok(!lipsa.includes("Relația cu donatorii și companiile"));
});

test("sursele: doar linkuri http(s) valide, fără dubluri, cel mult 40", () => {
  const brut = [
    { url: "https://exemplu.ro/raport", titlu: "Raport anual" },
    { url: "https://exemplu.ro/raport", titlu: "Dublură" },
    { url: "javascript:alert(1)", titlu: "Rău" },
    { url: "ftp://exemplu.ro", titlu: "Rău" },
    { url: "https://exemplu.ro/a b", titlu: "Spațiu" },
    { url: "https://exemplu.ro/fara-titlu" },
    null,
    "text",
  ];
  const r = curataSurse(brut);
  assert.deepEqual(r.map((s) => s.url), ["https://exemplu.ro/raport", "https://exemplu.ro/fara-titlu"]);
  assert.equal(r[1].titlu, "https://exemplu.ro/fara-titlu");
  const multe = Array.from({ length: 100 }, (_, i) => ({ url: `https://exemplu.ro/${i}`, titlu: `T${i}` }));
  assert.equal(curataSurse(multe).length, MAX_SURSE);
  assert.deepEqual(curataSurse("nu"), []);
});

test("textul de copiat conține raportul și sursele cu link", () => {
  const t = textDeCopiat("Mereu Aproape", "## Pe scurt\nok", [{ url: "https://exemplu.ro", titlu: "Site" }]);
  assert.match(t, /^# Analiză: Mereu Aproape/);
  assert.match(t, /## Surse\n- Site: https:\/\/exemplu\.ro/);
  assert.doesNotMatch(textDeCopiat("X", "r", []), /## Surse/);
});
