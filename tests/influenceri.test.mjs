import { test } from "node:test";
import assert from "node:assert/strict";

const R = await import("../src/lib/influenceri/reguli.ts");
const T = await import("../src/lib/influenceri/import-tabel.ts");
const M = await import("../src/lib/influenceri/mesaje.ts");

// ---------- handle-uri și emailuri normalizate ----------

test("Instagram: handle, @handle și link ajung la aceeași formă; linkurile de postări nu sunt profiluri", () => {
  assert.equal(R.normInstagram("@Ana.Pop"), "ana.pop");
  assert.equal(R.normInstagram("https://www.instagram.com/Ana.Pop/?hl=ro"), "ana.pop");
  assert.equal(R.normInstagram("instagram.com/ana.pop"), "ana.pop");
  assert.equal(R.normInstagram("https://ig.me/m/ana.pop"), "ana.pop");
  assert.equal(R.normInstagram("https://instagram.com/stories/ana.pop/3141592"), "ana.pop");
  assert.equal(R.normInstagram("https://www.instagram.com/p/Cabc123/"), null);
  assert.equal(R.normInstagram("https://www.instagram.com/reel/Cabc123/"), null);
  assert.equal(R.normInstagram("https://exemplu.ro/ana"), null);
  assert.equal(R.normInstagram("ana popescu"), null);
  assert.equal(R.normInstagram(""), null);
  assert.equal(R.normInstagram(undefined), null);
});

test("Facebook: profile.php?id=…, /people/…/<id>, /pages/…/<id> și /p/Nume-<id> se recunosc după id; restul după nume", () => {
  assert.equal(R.normFacebook("https://www.facebook.com/profile.php?id=100012345678901"), "id:100012345678901");
  assert.equal(R.normFacebook("https://m.facebook.com/profile.php?id=100012345678901&ref=bookmarks"), "id:100012345678901");
  assert.equal(R.normFacebook("profile.php?id=100012345678901"), "id:100012345678901");
  assert.equal(R.normFacebook("https://www.facebook.com/people/Ana-Pop/100012345678901/"), "id:100012345678901");
  assert.equal(R.normFacebook("https://www.facebook.com/pages/Ana-Pop/123456789012345"), "id:123456789012345");
  assert.equal(R.normFacebook("https://www.facebook.com/p/Ana-Pop-100012345678901/"), "id:100012345678901");
  assert.equal(R.normFacebook("https://www.facebook.com/AnaPop.Oficial?locale=ro_RO"), "anapop.oficial");
  assert.equal(R.normFacebook("fb.com/AnaPop"), "anapop");
  assert.equal(R.normFacebook("https://m.me/AnaPop"), "anapop");
  assert.equal(R.normFacebook("100012345678901"), "id:100012345678901");
  assert.equal(R.normFacebook("https://www.facebook.com/groups/12345/"), null);
  assert.equal(R.normFacebook("https://www.facebook.com/profile.php"), null);
  assert.equal(R.normFacebook("https://exemplu.ro/ana"), null);
});

test("TikTok și YouTube: @handle, linkuri; canalul YouTube după id (/channel/…) se recunoaște", () => {
  assert.equal(R.normTiktok("https://www.tiktok.com/@Ana.Pop?lang=ro"), "ana.pop");
  assert.equal(R.normTiktok("@ana.pop"), "ana.pop");
  assert.equal(R.normTiktok("https://www.tiktok.com/video/123"), null);
  assert.equal(R.normYoutube("https://www.youtube.com/@AnaPop"), "anapop");
  assert.equal(R.normYoutube("https://www.youtube.com/c/AnaPop"), "anapop");
  assert.equal(R.normYoutube("https://www.youtube.com/user/AnaPop"), "anapop");
  assert.equal(R.normYoutube("https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv"), "channel:ucabcdefghijklmnopqrstuv");
  assert.equal(R.normYoutube("UCabcdefghijklmnopqrstuv"), "channel:ucabcdefghijklmnopqrstuv");
  assert.equal(R.normYoutube("@AnaPop"), "anapop");
  assert.equal(R.normYoutube("https://www.youtube.com/watch?v=abc"), null);
});

test("email: litere mici, validare; cheile pentru excludere conțin toate profilurile și emailul", () => {
  assert.equal(R.normEmail("  Ana.Pop@Exemplu.RO "), "ana.pop@exemplu.ro");
  assert.equal(R.normEmail("fara-arond"), null);
  const chei = R.listaChei({ instagram: "@ana", facebook: "https://facebook.com/profile.php?id=100012345678901", tiktok: "@ana_t", youtube: "https://youtube.com/channel/UCabcdefghijklmnopqrstuv", email: "A@B.ro" });
  assert.deepEqual(chei, ["ig:ana", "fb:id:100012345678901", "tt:ana_t", "yt:channel:ucabcdefghijklmnopqrstuv", "em:a@b.ro"]);
  assert.deepEqual(R.listaChei({}), []);
  // același profil scris diferit => aceleași chei (baza indexurilor unice)
  assert.deepEqual(R.listaChei({ instagram: "https://instagram.com/Ana/" }), R.listaChei({ instagram: "@ANA" }));
});

test("numele din handle când lipsește", () => {
  assert.equal(R.numeDinContacte({ instagram: "https://instagram.com/ana.pop" }), "@ana.pop");
  assert.equal(R.numeDinContacte({ facebook: "https://facebook.com/profile.php?id=100012345678901" }), "Facebook 100012345678901");
  assert.equal(R.numeDinContacte({ email: "ana@exemplu.ro" }), "ana@exemplu.ro");
  assert.equal(R.numeDinContacte({}), null);
});

test("adrese de profil și de conversație sunt construite din forma normalizată, niciodată din textul brut", () => {
  assert.equal(R.urlConversatie("instagram", "@Ana.Pop"), "https://ig.me/m/ana.pop");
  assert.equal(R.urlConversatie("facebook", "https://www.facebook.com/AnaPop"), "https://m.me/anapop");
  assert.equal(R.urlConversatie("facebook", "profile.php?id=100012345678901"), "https://m.me/100012345678901");
  assert.equal(R.urlProfil("tiktok", "@ana"), "https://www.tiktok.com/@ana");
  assert.equal(R.urlProfil("youtube", "https://youtube.com/channel/UCabcdefghijklmnopqrstuv"), "https://www.youtube.com/channel/ucabcdefghijklmnopqrstuv");
  assert.equal(R.urlProfil("instagram", "javascript:alert(1)"), null);
  assert.equal(R.urlConversatie("tiktok", "@ana"), "https://www.tiktok.com/@ana");
});

test("textul din profil în listă", () => {
  assert.equal(R.etichetaProfil("instagram", "https://instagram.com/ana.pop"), "@ana.pop");
  assert.equal(R.etichetaProfil("facebook", "https://facebook.com/AnaPop"), "anapop");
  assert.equal(R.etichetaProfil("youtube", "https://youtube.com/channel/UCabcdefghijklmnopqrstuv"), "YouTube");
});

// ---------- parserul CSV / Excel lipit ----------

test("parserul: ghilimele, virgule în celule, ghilimea dublă și celule pe mai multe rânduri", () => {
  const t = 'nume,instagram,note\r\n"Popescu, Ana",@ana,"a spus ""poate""\nsă revină"\r\nIon,@ion,\r\n';
  const r = T.parseazaTabel(t);
  assert.equal(r.length, 3);
  assert.deepEqual(r[0], ["nume", "instagram", "note"]);
  assert.deepEqual(r[1], ["Popescu, Ana", "@ana", 'a spus "poate"\nsă revină']);
  assert.deepEqual(r[2], ["Ion", "@ion", ""]);
});

test("parserul: separatorul se alege după primul rând (tab, ;, ,) și BOM-ul dispare", () => {
  assert.deepEqual(T.parseazaTabel("a\tb\tc\n1\t2\t3"), [["a", "b", "c"], ["1", "2", "3"]]);
  assert.deepEqual(T.parseazaTabel("a;b;c\n1;2,5;3"), [["a", "b", "c"], ["1", "2,5", "3"]]);
  assert.deepEqual(T.parseazaTabel("﻿a,b\n1,2"), [["a", "b"], ["1", "2"]]);
  // tab-ul dintr-o celulă între ghilimele nu schimbă separatorul
  assert.deepEqual(T.parseazaTabel('a,b\n"x\ty",z'), [["a", "b"], ["x\ty", "z"]]);
});

test("parserul: rândurile goale se sar, ultimul rând fără sfârșit de linie se păstrează", () => {
  assert.deepEqual(T.parseazaTabel("a,b\n\n1,2\n   \n3,4"), [["a", "b"], ["1", "2"], ["3", "4"]]);
  assert.deepEqual(T.parseazaTabel(""), []);
  assert.deepEqual(T.parseazaTabel("a,b\n1,"), [["a", "b"], ["1", ""]]);
});

test("potrivirea coloanelor: antete în română și engleză, diacritice, urmăritori pe platformă", () => {
  const tabel = T.potrivesteTabel([
    ["Nume", "Instagram", "Urmăritori Instagram", "Followers TikTok", "Județ", "Oraș", "E-mail", "Categorie", "ceva"],
    ["Ana Pop", "@ana", "45.000", "1200", "Iași", "Iași", "ana@exemplu.ro", "familie", "x"],
    ["", "@ion", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],
  ]);
  assert.deepEqual(tabel.harta, ["numePublic", "instagram", "urm_instagram", "urm_tiktok", "judet", "oras", "email", "categorie", null]);
  assert.equal(tabel.randuri.length, 2);
  assert.equal(tabel.goale, 1);
  assert.deepEqual(tabel.randuri[0].urmaritori, { instagram: 45000, tiktok: 1200 });
  assert.equal(tabel.randuri[0].judet, "Iași");
  assert.equal(tabel.randuri[1].numePublic, undefined);
  assert.equal(R.numeDinContacte({ instagram: tabel.randuri[1].instagram }), "@ion"); // handle-ul ca nume
  assert.equal(tabel.depasire, false);
});

test("potrivirea coloanelor: o coloană recunoscută de două ori se folosește o singură dată; limita de rânduri", () => {
  const t = T.potrivesteTabel([["nume", "Name"], ["A", "B"]]);
  assert.deepEqual(t.harta, ["numePublic", null]);
  const mari = [["nume"], ...Array.from({ length: 2005 }, (_, i) => [`N${i}`])];
  const m = T.potrivesteTabel(mari);
  assert.equal(m.randuri.length, T.MAX_RANDURI_IMPORT);
  assert.equal(m.depasire, true);
  assert.deepEqual(T.inBucati([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.equal(T.LIMITA_BUCATA, 200);
});

test("categoria dintr-un text liber", () => {
  assert.equal(R.categorieDin("familie"), "familie");
  assert.equal(R.categorieDin("Sportivi"), "sportivi");
  assert.equal(R.categorieDin("Artiști și cântăreți"), "artisti");
  assert.equal(R.categorieDin("micro local"), "micro_local");
  assert.equal(R.categorieDin("Athletes"), "sportivi");
  assert.equal(R.categorieDin("ceva necunoscut"), null);
  assert.equal(R.categorieDin(""), null);
});

// ---------- ordonare pe platformă ----------

test("ordonarea: cu platformă aleasă apar doar cei de acolo, după urmăritorii de pe acea platformă", () => {
  const f = (id, nume, urm, extra = {}) => ({ id, numePublic: nume, actualizatLa: "2026-11-01T10:00:00Z", urmaritori: urm, instagram: null, facebook: null, tiktok: null, youtube: null, ...extra });
  const lista = [
    f("a", "Ana", { instagram: 1000, tiktok: 900000 }, { instagram: "@ana", tiktok: "@ana" }),
    f("b", "Bia", { instagram: 50000 }, { instagram: "@bia" }),
    f("c", "Cezar", { facebook: 70000 }, { facebook: "cezar" }),
    f("d", "Dan", { instagram: 50000 }, { instagram: "@dan", actualizatLa: "2026-11-03T10:00:00Z" }),
  ];
  assert.deepEqual(R.ordoneazaInfluenceri(lista, "instagram").map((x) => x.id), ["d", "b", "a"]); // egalitate: cel modificat mai recent; Cezar nu are Instagram
  assert.deepEqual(R.ordoneazaInfluenceri(lista, "tiktok").map((x) => x.id), ["a"]);
  assert.deepEqual(R.ordoneazaInfluenceri(lista, "facebook").map((x) => x.id), ["c"]);
  assert.deepEqual(R.ordoneazaInfluenceri(lista, "youtube").map((x) => x.id), []);
  // fără platformă: cei modificați mai recent, toți apar
  assert.equal(R.ordoneazaInfluenceri(lista, null)[0].id, "d");
  assert.equal(R.ordoneazaInfluenceri(lista, null).length, 4);
  // audiența: cu platformă doar de acolo, fără platformă cea mai mare
  assert.equal(R.urmaritoriPe({ instagram: 1000, tiktok: 900000 }, "instagram"), 1000);
  assert.equal(R.urmaritoriPe({ instagram: 1000, tiktok: 900000 }, null), 900000);
  assert.equal(R.urmaritoriPe(null, "tiktok"), 0);
});

// ---------- verificări și reveniri ----------

const ACUM = new Date("2026-11-04T10:00:00Z");
const zile = (d, n) => new Date(d.getTime() + n * 86_400_000);

test("după „Am trimis”: verificare la +3 zile; primul mesaj nu e revenire, următoarele se numără", () => {
  const s = R.SETARI_IMPLICITE;
  assert.deepEqual({ v: s.verificareZile, r: s.revenireZile, m: s.maxReveniri }, { v: 3, r: 7, m: 2 });
  const prim = R.dupaTrimitere(s, { nrReveniri: 0, amContactat: false }, ACUM);
  assert.equal(prim.nrReveniri, 0);
  assert.equal(prim.verificareLa.toISOString(), zile(ACUM, 3).toISOString());
  assert.equal(prim.limitaAtinsa, false);
  const a2 = R.dupaTrimitere(s, { nrReveniri: 0, amContactat: true }, ACUM);
  assert.equal(a2.nrReveniri, 1);
  assert.equal(a2.limitaAtinsa, false);
  const a3 = R.dupaTrimitere(s, { nrReveniri: 1, amContactat: true }, ACUM);
  assert.equal(a3.nrReveniri, 2);
  assert.equal(a3.limitaAtinsa, true);
  // fără reveniri permise, chiar a doua trimitere atinge limita
  assert.equal(R.dupaTrimitere({ ...s, maxReveniri: 0 }, { nrReveniri: 0, amContactat: true }, ACUM).limitaAtinsa, true);
});

test("fără răspuns la verificare: revenirea la +7 zile de la ultimul mesaj, imediat dacă a trecut, niciodată peste limită", () => {
  const s = R.SETARI_IMPLICITE;
  const ultima = ACUM;
  const devreme = R.dupaVerificareFaraRaspuns(s, { nrReveniri: 0, ultimaContactare: ultima }, zile(ACUM, 3));
  assert.equal(devreme.revenireLa?.toISOString(), zile(ACUM, 7).toISOString());
  const tarziu = R.dupaVerificareFaraRaspuns(s, { nrReveniri: 1, ultimaContactare: ultima }, zile(ACUM, 20));
  assert.equal(tarziu.revenireLa?.toISOString(), zile(ACUM, 20).toISOString());
  const limita = R.dupaVerificareFaraRaspuns(s, { nrReveniri: 2, ultimaContactare: ultima }, zile(ACUM, 20));
  assert.equal(limita.revenireLa, null);
  assert.equal(limita.limitaAtinsa, true);
});

test("poți reveni doar după termen și cât mai sunt reveniri", () => {
  const s = R.SETARI_IMPLICITE;
  assert.equal(R.poateReveni(s, { nrReveniri: 0, ultimaContactare: null }, ACUM), false);
  assert.equal(R.poateReveni(s, { nrReveniri: 0, ultimaContactare: ACUM }, zile(ACUM, 6)), false);
  assert.equal(R.poateReveni(s, { nrReveniri: 0, ultimaContactare: ACUM }, zile(ACUM, 7)), true);
  assert.equal(R.poateReveni(s, { nrReveniri: 2, ultimaContactare: ACUM }, zile(ACUM, 30)), false);
  assert.equal(R.reveniriRamase(s, 1), 1);
  assert.equal(R.reveniriRamase(s, 5), 0);
});

test("setările de urmărire sunt plafonate", () => {
  assert.deepEqual(R.curataSetari({ verificareZile: 0, revenireZile: 1, maxReveniri: 99, blocareColegZile: -4 }), { verificareZile: 1, revenireZile: 2, maxReveniri: 5, blocareColegZile: 0 });
  assert.deepEqual(R.curataSetari({ verificareZile: "x", revenireZile: null }), R.SETARI_IMPLICITE);
  assert.deepEqual(R.curataSetari(null), R.SETARI_IMPLICITE);
});

test("coordonare: doar mesajul altei colege, din ultimele zile setate, blochează", () => {
  assert.equal(R.blocatDeColega({ userId: "u2", la: zile(ACUM, -3) }, "u1", ACUM, 14), true);
  assert.equal(R.blocatDeColega({ userId: "u1", la: zile(ACUM, -3) }, "u1", ACUM, 14), false);
  assert.equal(R.blocatDeColega({ userId: "u2", la: zile(ACUM, -20) }, "u1", ACUM, 14), false);
  assert.equal(R.blocatDeColega({ userId: "u2", la: zile(ACUM, -1) }, "u1", ACUM, 0), false);
  assert.equal(R.blocatDeColega(null, "u1", ACUM, 14), false);
});

// ---------- linkul unic ----------

test("codul aleator: 8 caractere din alfabetul fără litere ambigue; octeții peste limită se ignoră", () => {
  const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 250, 251]);
  assert.equal(R.codDinOcteti(bytes), "abcdefgh");
  assert.equal(R.codDinOcteti(new Uint8Array([255, 254, 253, 252, 250, 249, 248, 0, 1, 2, 3, 4, 5, 6, 7])), "abcdefgh"); // 248+ ignorați
  assert.equal(R.codDinOcteti(new Uint8Array([0, 1, 2])), null);
  assert.equal(R.ALFABET_COD.length, 31);
  assert.ok(!/[ilo01]/.test(R.ALFABET_COD));
});

test("slugul linkului: <campanie>-i<cod>, cel mult 60 de caractere, fără numele influencerului", () => {
  assert.equal(R.construiesteSlugLink("mihai-nicu", "abcdefgh"), "mihai-nicu-iabcdefgh");
  assert.equal(R.bazaSlugLink("Ajută-l pe Șerban!"), "ajuta-l-pe-serban");
  assert.equal(R.bazaSlugLink("!!!"), "caz");
  const lung = R.construiesteSlugLink("x".repeat(120), "abcdefgh");
  assert.ok(lung.length <= R.MAX_SLUG_LINK, lung);
  assert.ok(R.esteSlugLink(lung));
  const cuLiniute = R.construiesteSlugLink("a".repeat(49) + "-" + "b".repeat(20), "abcdefgh");
  assert.ok(cuLiniute.length <= 60 && R.esteSlugLink(cuLiniute), cuLiniute);
  // slugul e o etichetă UTM validă (aceeași regulă ca în lib/reclame/atribuire.ts: ^[a-z0-9][a-z0-9_.:-]{0,59}$)
  assert.ok(/^[a-z0-9][a-z0-9_.:-]{0,59}$/.test(lung));
});

test("slugul se validează strict înainte de orice interogare", () => {
  assert.equal(R.esteSlugLink("mihai-nicu-iabcdefgh"), true);
  assert.equal(R.esteSlugLink("mihai-nicu"), false);
  assert.equal(R.esteSlugLink("mihai-nicu-iabcdefg"), false); // 7 caractere
  assert.equal(R.esteSlugLink("mihai-nicu-iabcdefgi"), false); // „i” nu e în alfabet
  assert.equal(R.esteSlugLink("Mihai-iabcdefgh"), false);
  assert.equal(R.esteSlugLink("a/../b-iabcdefgh"), false);
  assert.equal(R.esteSlugLink("-x-iabcdefgh"), false);
  assert.equal(R.esteSlugLink(`${"a".repeat(60)}-iabcdefgh`), false);
  assert.equal(R.esteSlugLink(undefined), false);
});

test("parametrii UTM ai redirecționării: slugul exact în utm_campaign", () => {
  assert.deepEqual(R.parametriUtm("instagram", "mihai-nicu-iabcdefgh"), { utm_source: "instagram", utm_medium: "social", utm_campaign: "mihai-nicu-iabcdefgh", utm_content: "influenceri" });
  assert.equal(R.parametriUtm("email", "x-iabcdefgh").utm_medium, "email");
});

// ---------- filtrele din adresă ----------

test("filtrele: valorile necunoscute sunt ignorate, un parametru repetat dă primul, praguri fixe", () => {
  const f = R.parseazaFiltre({ q: ["  ana  ", "x"], plat: "instagram", cat: "sportivi", etapa: "asteptam", resp: "fara", caz: "nu-uuid", judet: "diaspora", urm: "20000", scad: "1" });
  assert.deepEqual(f, { q: "ana", platforma: "instagram", categorie: "sportivi", etapa: "asteptam", responsabil: "fara", judet: "diaspora", urmMin: 20000, scadente: true });
  assert.deepEqual(R.parseazaFiltre({ plat: "myspace", cat: "x", etapa: "y", urm: "123", resp: "'; drop table", scad: "0" }), {});
  assert.equal(R.parseazaFiltre({ resp: "3f2504e0-4f89-41d3-9a0c-0305e82c3301" }).responsabil, "3f2504e0-4f89-41d3-9a0c-0305e82c3301");
  // dus-întors prin adresă
  const p = R.parametriDinFiltre(f);
  assert.deepEqual(R.parseazaFiltre(Object.fromEntries(p)), f);
  assert.equal(R.parametriDinFiltre(f, { plat: undefined, q: "zzz" }).get("plat"), null);
  assert.equal(R.parametriDinFiltre(f, { q: "zzz" }).get("q"), "zzz");
});

test("urmăritorii: doar cele patru platforme, întregi pozitive, plafonate", () => {
  assert.deepEqual(R.curataUrmaritori({ instagram: "45.000", tiktok: 12, youtube: -3, facebook: "x", twitter: 5 }), { instagram: 45000, tiktok: 12 });
  assert.deepEqual(R.curataUrmaritori({ instagram: 1e15 }), { instagram: 10_000_000_000 });
  assert.deepEqual(R.curataUrmaritori(null), {});
});

// ---------- mesajele ----------

const DATE = {
  influencer: { nume: "Ana Pop", categorie: "Sportivi", domeniu: null, oras: "Iași", tara: "România" },
  campanie: { titlu: "Mihai are nevoie de noi", judet: "Iași", ramasLei: 12345.4 },
  link: "https://alexandrit.ro/r/mihai-nicu-iabcdefgh",
  expeditor: "Ioana Ionescu",
  organizatie: "Asociația Test",
  indicatii: null,
};

test("șablonul: trei variante, fiecare cu linkul unic o singură dată", () => {
  const s = M.sablonMesaje(DATE);
  for (const k of M.CHEI_VARIANTE) {
    assert.equal(s[k].split(DATE.link).length - 1, 1, k);
    assert.ok(s[k].includes("Ana Pop") && s[k].includes("Ioana"));
  }
  assert.ok(!s.instagram.includes("Ionescu"));
});

test("răspunsul AI: JSON în ```, linkul adăugat dacă lipsește, variantă lipsă => null", () => {
  const raspuns = '```json\n{"instagram": "Bună Ana!", "facebook": "Salut, Ana. ' + DATE.link + '", "colaborare": "Propunere"}\n```';
  const v = M.citesteVariante(raspuns, DATE.link);
  assert.ok(v);
  assert.ok(v.instagram.endsWith(DATE.link));
  assert.equal(v.facebook.split(DATE.link).length - 1, 1);
  assert.ok(v.colaborare.includes(DATE.link));
  assert.equal(M.citesteVariante("nu e json", DATE.link), null);
  assert.equal(M.citesteVariante('{"instagram": "x"}', DATE.link), null);
  assert.equal(M.citesteVariante('{"instagram": "x", "facebook": 4}', DATE.link), null);
  assert.equal(M.asiguraLink("Salut", "https://x.ro/r/a"), "Salut\n\nhttps://x.ro/r/a");
});

test("către AI pleacă doar datele publice: fără contact, note sau povestea campaniei", () => {
  const c = M.cerereAi({ ...DATE, indicatii: "a postat despre fiica ei" });
  assert.ok(c.includes("Ana Pop") && c.includes("Mihai are nevoie de noi") && c.includes(DATE.link));
  assert.ok(!/@|email|telefon|poveste|diagnostic/i.test(c.replace(DATE.link, "")));
  assert.ok(M.instructiuniAi("Asociația Test").includes("Asociația Test"));
  assert.equal(M.prenume("Ioana Ionescu"), "Ioana");
  assert.equal(M.prenume(null), "Echipa");
});

// ---------- listele, dicționarul, pachetul ----------

test("etichete RO și EN pentru categorii, etape, platforme și activități", () => {
  assert.equal(R.CATEGORII.length, 11);
  for (const lista of [R.CATEGORII, R.ETAPE, R.PLATFORME]) for (const x of lista) assert.ok(x.ro && x.en, x.k);
  for (const [k, v] of Object.entries(R.ACTIVITATI)) assert.ok(v.ro && v.en, k);
  assert.ok(R.ETAPE.some((e) => e.k === "asteptam"));
  assert.deepEqual([...R.PLATFORME_CHEI], ["instagram", "facebook", "tiktok", "youtube"]);
  assert.equal(R.ETAPE_FARA_CONTACT.has("stop"), true);
  assert.equal(R.ETAPE_FARA_CONTACT.has("asteptam"), false);
});

function forma(v) {
  if (typeof v === "function") return `fn/${v.length}`;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, forma(x)]));
  return typeof v;
}

test("dicționarul paginii: aceeași structură în română și engleză", async () => {
  const { INFLUENCERI_UI_DICT } = await import("../src/lib/i18n/dictionaries/influenceri-ui.ts");
  assert.deepEqual(forma(INFLUENCERI_UI_DICT.en), forma(INFLUENCERI_UI_DICT.ro));
  assert.ok(/[ăâîșț]/.test(JSON.stringify(INFLUENCERI_UI_DICT.ro)), "română cu diacritice");
  assert.ok(!/[ăâîșțĂÂÎȘȚ]/.test(INFLUENCERI_UI_DICT.en.titlu + INFLUENCERI_UI_DICT.en.subtitlu + INFLUENCERI_UI_DICT.en.fisa.contact.pas3));
});

test("modulul „influenceri” e în IMPACT, ruta /r e rezervată, metrica KPI are tradus textul", async () => {
  const P = await import("../src/lib/billing/packages.ts");
  assert.equal(P.MODULE_PACHET.influenceri.minim, "impact");
  assert.equal(P.areModul("start", "influenceri"), false);
  assert.equal(P.areModul("crestere", "influenceri"), false);
  assert.equal(P.areModul("impact", "influenceri"), true);
  assert.equal(P.areModul("trial", "influenceri"), true);
  const { esteSlugRezervat } = await import("../src/lib/reserved-slugs.ts");
  assert.equal(esteSlugRezervat("r"), true);
  const { METRICA_PE_ID } = await import("../src/lib/performanta-metrici.ts");
  const m = METRICA_PE_ID.get("influenceri_identificati");
  assert.ok(m && m.eticheta && m.formula && !m.snapshot);
  const { PERFORMANTA_UI3_DICT } = await import("../src/lib/i18n/dictionaries/performanta-ui-3.ts");
  assert.ok(PERFORMANTA_UI3_DICT.en.metrici.influenceri_identificati?.eticheta);
});
