import { test } from "node:test";
import assert from "node:assert/strict";

const A = await import("../src/lib/reclame/atribuire.ts");
const C = await import("../src/lib/reclame/calcule.ts");
const U = await import("../src/lib/reclame/utm.ts");
const S = await import("../src/lib/reclame/csv-costuri.ts");

const ACUM = Date.UTC(2026, 9, 15, 12, 0, 0);
const zile = (n) => n * 86_400_000;

// ───────────── atribuire ─────────────

test("coduri UTM: doar litere mici, cifre și . _ : -, fără spații sau diacritice", () => {
  assert.equal(A.curataCod("CMP_026"), "cmp_026");
  assert.equal(A.curataCod("cmp 026"), null);
  assert.equal(A.curataCod("ion popescu"), null);
  assert.equal(A.curataCod("campanie-ăâ"), null);
  assert.equal(A.curataCod("x".repeat(61)), null);
  assert.equal(A.curataCod(5), null);
});

test("clasa traficului: reclamele plătite sunt separate de social organic, email și restul", () => {
  assert.equal(A.clasaTrafic("paid_social"), "platita");
  assert.equal(A.clasaTrafic("cpc"), "platita");
  assert.equal(A.clasaTrafic("organic_social"), "organica");
  assert.equal(A.clasaTrafic("email"), "email");
  assert.equal(A.clasaTrafic("whatsapp"), "organica");
  assert.equal(A.clasaTrafic("ceva"), "alta");
  assert.equal(A.clasaTrafic(null), "alta");
});

test("platforma din sursă: valorile Meta {{site_source_name}} (fb, ig, an, msg) duc tot la Meta", () => {
  for (const s of ["facebook", "fb", "instagram", "ig", "an", "msg", "meta"]) assert.equal(A.platformaDinSursa(s), "meta", s);
  assert.equal(A.platformaDinSursa("tiktok"), "tiktok");
  assert.equal(A.platformaDinSursa("linkedin"), "linkedin");
  assert.equal(A.platformaDinSursa("newsletter"), "altele");
});

test("contextul vine din utm_source; fără el nu există clic de atribuit", () => {
  const q = (o) => (n) => o[n] ?? null;
  assert.equal(A.touchDinParametri(q({}), ACUM), null);
  assert.equal(A.touchDinParametri(q({ fbclid: "abc" }), ACUM), null); // fbclid singur nu dovedește o reclamă plătită
  const t = A.touchDinParametri(q({ utm_source: "Facebook", utm_medium: "paid_social", utm_campaign: "cmp_026", utm_content: "cr_014" }), ACUM);
  assert.deepEqual(t, { s: "facebook", m: "paid_social", c: "cmp_026", k: "cr_014", t: ACUM });
});

test("serverul nu are încredere în browser: coduri curățate, timp plauzibil, clasa recalculată", () => {
  const bun = A.valideazaTouch({ s: "facebook", m: "paid_social", c: "cmp_026", k: "cr_014", t: ACUM - zile(2), st: 1 }, ACUM);
  assert.equal(bun.clasa, "platita");
  assert.equal(bun.platforma, "meta");
  assert.equal(bun.st, 1);
  // clasa nu se citește din client: un mesaj care pretinde „platita” fără medium plătit nu o obține
  assert.equal(A.valideazaTouch({ s: "facebook", m: "organic_social", t: ACUM, clasa: "platita" }, ACUM).clasa, "organica");
  assert.equal(A.valideazaTouch({ s: "facebook", m: "organic_social", t: ACUM }, ACUM).platforma, null);
  assert.equal(A.valideazaTouch({ s: "facebook", t: ACUM + zile(2) }, ACUM), null); // din viitor
  assert.equal(A.valideazaTouch({ s: "facebook", t: ACUM - zile(31) }, ACUM), null); // prea vechi
  assert.equal(A.valideazaTouch({ s: "Ion Popescu", t: ACUM }, ACUM), null);
  assert.equal(A.valideazaTouch({ t: ACUM }, ACUM), null);
  assert.equal(A.valideazaTouch("x", ACUM), null);
  assert.equal(A.valideazaTouch({ s: "facebook", t: "azi" }, ACUM), null);
});

test("fereastra de atribuire: clicul trebuie să preceadă donația cu cel mult N zile", () => {
  const click = new Date(ACUM - zile(3));
  const donatie = new Date(ACUM);
  assert.equal(A.inFereastra(click, donatie, 7), true);
  assert.equal(A.inFereastra(click, donatie, 1), false);
  assert.equal(A.inFereastra(null, donatie, 7), false);
  assert.equal(A.inFereastra(new Date(ACUM + zile(1)), donatie, 7), false); // clic după donație
});

// ───────────── calcule ─────────────

test("valoarea netă scade rambursările; ROAS și suma rămasă pornesc de la ea", () => {
  const t = { ...C.totaluriGoale(), cheltuieliBani: 100_000, donatii: 20, brutBani: 500_000, rambursatBani: 20_000, donatoriNoi: 10 };
  const i = C.calculeazaIndicatori(t);
  assert.equal(i.netBani, 480_000); // 5.000 − 200 lei rambursați
  assert.equal(i.roasBrut, 5);
  assert.equal(i.roasNet, 4.8);
  assert.equal(i.ramasBani, 380_000);
  assert.equal(i.costPerDonatieBani, 5_000);
  assert.equal(i.costPerDonatorNouBani, 10_000);
  assert.equal(i.mediaDonatieBani, 25_000);
  // cu 300 lei de ajustări (rambursări + comisioane, dacă ar fi cunoscute) se ajunge la 4.700 net și 4,70×, ca în exemplul din specificație
  const ajustat = C.calculeazaIndicatori({ ...t, rambursatBani: 30_000 });
  assert.equal(ajustat.netBani, 470_000);
  assert.equal(ajustat.roasNet, 4.7);
  assert.equal(ajustat.ramasBani, 370_000);
});

test("numitor zero: indicatorii sunt null, nu infinit sau zero fals", () => {
  const i = C.calculeazaIndicatori(C.totaluriGoale());
  assert.equal(i.roasNet, null);
  assert.equal(i.roasBrut, null);
  assert.equal(i.costPerDonatieBani, null);
  assert.equal(i.costPerDonatorNouBani, null);
  assert.equal(i.mediaDonatieBani, null);
  assert.equal(C.calculeazaIndicatori({ ...C.totaluriGoale(), donatii: 3, brutBani: 3000 }).roasNet, null); // fără cheltuieli nu există ROAS
  assert.equal(C.formatRoas(null), "—");
  assert.equal(C.formatLei(null), "—");
});

test("variația față de perioada anterioară lipsește când baza e zero sau necunoscută", () => {
  assert.deepEqual(C.variatie(150, 100), { procent: 50, sens: "sus" });
  assert.deepEqual(C.variatie(50, 100), { procent: -50, sens: "jos" });
  assert.equal(C.variatie(10, 0), null);
  assert.equal(C.variatie(null, 5), null);
  assert.equal(C.variatie(5, null), null);
});

test("perioada anterioară are aceeași lungime și se termină cu o zi înainte", () => {
  assert.deepEqual(C.perioadaAnterioara("2026-10-09", "2026-10-15"), { de: "2026-10-02", pana: "2026-10-08" });
  assert.deepEqual(C.perioadaAnterioara("2026-10-15", "2026-10-15"), { de: "2026-10-14", pana: "2026-10-14" });
  assert.equal(C.numarZile("2026-10-01", "2026-10-31"), 31);
  assert.deepEqual(C.perioadaAnterioara("2026-03-01", "2026-03-31"), { de: "2026-01-29", pana: "2026-02-28" });
});

test("presetările de perioadă, cu revenire sigură la 30 de zile", () => {
  assert.deepEqual(C.rezolvaPerioada("7z", "2026-10-15"), { preset: "7z", de: "2026-10-09", pana: "2026-10-15" });
  assert.deepEqual(C.rezolvaPerioada("ieri", "2026-10-15"), { preset: "ieri", de: "2026-10-14", pana: "2026-10-14" });
  assert.deepEqual(C.rezolvaPerioada(undefined, "2026-10-15"), { preset: "30z", de: "2026-09-16", pana: "2026-10-15" });
  assert.equal(C.rezolvaPerioada("personalizat", "2026-10-15", "2026-10-10", "2026-10-12").de, "2026-10-10");
  assert.equal(C.rezolvaPerioada("personalizat", "2026-10-15", "2026-10-12", "2026-10-10").preset, "30z"); // interval inversat
  assert.equal(C.rezolvaPerioada("personalizat", "2026-10-15", "2026-02-30", "2026-03-01").preset, "30z"); // dată inexistentă
  assert.equal(C.rezolvaPerioada("personalizat", "2026-10-15", "2020-01-01", "2026-10-15").preset, "30z"); // peste un an
});

test("formatare ro-RO", () => {
  assert.equal(C.formatLei(1_245_050).replace(/ /g, " "), "12.450,50 lei");
  assert.equal(C.formatRoas(4.7).replace(/ /g, " "), "4,70×");
  assert.equal(C.formatProcent(12.5), "12,5%");
});

test("propoziția de rezumat spune ce lipsește, nu inventează", () => {
  const gol = C.totaluriGoale();
  assert.match(C.propozitieRezumat(gol, C.calculeazaIndicatori(gol), false), /Nu există încă/);
  const faraCost = { ...gol, donatii: 2, brutBani: 5000 };
  assert.match(C.propozitieRezumat(faraCost, C.calculeazaIndicatori(faraCost), false), /nu există cheltuieli/);
  const ok = { ...gol, cheltuieliBani: 10_000, donatii: 2, brutBani: 47_000 };
  assert.match(C.propozitieRezumat(ok, C.calculeazaIndicatori(ok), false), /la fiecare 1 leu cheltuit au fost atribuiți 4,70 lei/);
  assert.match(C.propozitieRezumat(ok, C.calculeazaIndicatori(ok), true), /incomplete/);
});

test("eșantion: sub 10 donații nu se trage nicio concluzie", () => {
  assert.equal(C.esteEsantionSuficient(1), false);
  assert.equal(C.esteEsantionSuficient(10), true);
  assert.equal(C.rata(1, 0), null);
  assert.equal(C.rata(1, 4), 25);
});

// ───────────── UTM ─────────────

test("linkul UTM: parametri validați, păstrează parametrii existenți, fără date personale", () => {
  const r = U.construiesteLink({ url: "https://salveazaoinima.ro/doneaza?x=1", source: "Facebook", medium: "paid_social", campaign: "cmp_026", content: "cr_014" });
  assert.equal(r.ok, true);
  const u = new URL(r.url);
  assert.equal(u.searchParams.get("x"), "1");
  assert.equal(u.searchParams.get("utm_source"), "facebook");
  assert.equal(u.searchParams.get("utm_campaign"), "cmp_026");
  assert.equal(u.searchParams.get("utm_content"), "cr_014");
  assert.equal(U.construiesteLink({ url: "nu e adresa", source: "a", medium: "b", campaign: "c" }).ok, false);
  assert.equal(U.construiesteLink({ url: "ftp://x.ro", source: "a", medium: "b", campaign: "c" }).ok, false);
  assert.equal(U.construiesteLink({ url: "https://x.ro", source: "a", medium: "b", campaign: "Maria Ionescu" }).ok, false);
  assert.equal(U.construiesteLink({ url: "https://x.ro", source: "a", medium: "b", campaign: "c", content: "ăă" }).ok, false);
  // un utm_content vechi din adresă dispare când nu se mai dă unul nou
  const fara = U.construiesteLink({ url: "https://x.ro/?utm_content=vechi", source: "a", medium: "b", campaign: "c" });
  assert.equal(new URL(fara.url).searchParams.has("utm_content"), false);
});

test("următorul cod liber din serie", () => {
  assert.equal(U.urmatorulCod("cmp", []), "cmp_001");
  assert.equal(U.urmatorulCod("cmp", ["cmp_001", "cmp_026", "cr_030", "cmp_x"]), "cmp_027");
  assert.equal(U.PARAMETRI_META("cmp_026", "cr_014"), "utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign=cmp_026&utm_content=cr_014");
});

// ───────────── import CSV ─────────────

test("CSV: ghilimele, separator ; și BOM", () => {
  const r = S.parseCsv('﻿Ziua;Campanie;Cost\r\n2026-10-01;"Ion; \\"Mare\\"";12,5\r\n');
  assert.deepEqual(r[0], ["Ziua", "Campanie", "Cost"]);
  assert.equal(r[1][2], "12,5");
  assert.equal(S.parseCsv("a,b\n1,2\n\n3,4").length, 3);
});

test("numere în formate uzuale", () => {
  const n = S.parseNumar;
  assert.equal(n("1.234,56"), 1234.56);
  assert.equal(n("1,234.56"), 1234.56);
  assert.equal(n("1234.56"), 1234.56);
  assert.equal(n("12,5 lei"), 12.5);
  assert.equal(n("1 234,56"), 1234.56);
  assert.equal(n("1.234"), 1234); // un singur separator urmat de 3 cifre = mii
  assert.equal(n("0,750"), 0.75);
  assert.equal(n("0"), 0);
  assert.equal(n("(25,00)"), -25);
  assert.equal(Number.isNaN(n("abc")), true);
  assert.equal(Number.isNaN(n("")), true);
});

test("date: ISO și zi.lună.an, respinge datele inexistente", () => {
  assert.equal(S.parseData("2026-10-05"), "2026-10-05");
  assert.equal(S.parseData("05.10.2026"), "2026-10-05");
  assert.equal(S.parseData("5/10/2026"), "2026-10-05");
  assert.equal(S.parseData("2026-10-05 13:00:00"), "2026-10-05");
  assert.equal(S.parseData("2026-02-30"), null);
  assert.equal(S.parseData("31.02.2026"), null);
  assert.equal(S.parseData("ieri"), null);
  assert.equal(S.parseData("1999-01-01"), null);
});

test("coloanele din exporturile Meta (română și engleză) se recunosc singure", () => {
  const ro = S.detecteazaColoane(["Ziua", "Numele campaniei", "Numele setului de reclame", "Numele reclamei", "Suma cheltuită (RON)", "Afișări", "Clicuri pe link", "ID campanie"]);
  assert.deepEqual([ro.ziua, ro.campanieNume, ro.setNume, ro.reclamaNume, ro.cheltuiala, ro.afisari, ro.clicuri, ro.campanieCheie], [0, 1, 2, 3, 4, 5, 6, 7]);
  const en = S.detecteazaColoane(["Day", "Campaign name", "Ad set name", "Ad name", "Amount spent (EUR)", "Impressions", "Link clicks", "Platform"]);
  assert.deepEqual([en.ziua, en.campanieNume, en.cheltuiala, en.clicuri, en.plasament], [0, 1, 4, 6, 7]);
  assert.equal(S.monedaDinAntet(["Day", "Amount spent (EUR)"], { cheltuiala: 1 }), "EUR");
  assert.equal(S.monedaDinAntet(["Day", "Cost"], { cheltuiala: 1 }), null);
});

test("normalizare: adună rândurile cu aceeași cheie, ignoră totalurile, raportează erorile cu linia", () => {
  const rows = [
    ["Day", "Campaign name", "Amount spent (RON)", "Impressions", "Link clicks"],
    ["2026-10-01", "Campanie A", "10,50", "1.000", "20"],
    ["2026-10-01", "Campanie A", "4,50", "500", "5"], // aceeași cheie (ex. defalcare pe vârstă): se adună
    ["2026-10-02", "Campanie B", "7", "", ""],
    ["Total", "", "22", "", ""],
    ["31.02.2026", "Campanie A", "1", "", ""],
    ["2026-10-03", "Campanie A", "abc", "", ""],
    ["2026-10-03", "Campanie A", "-3", "", ""],
  ];
  const m = S.detecteazaColoane(rows[0]);
  const r = S.normalizeaza(rows, m);
  assert.equal(r.randuri.length, 2);
  const a = r.randuri.find((x) => x.campanieNume === "Campanie A");
  assert.equal(a.cheltuialaMinor, 1500);
  assert.equal(a.afisari, 1500);
  assert.equal(a.clicuri, 25);
  assert.equal(r.randuri.find((x) => x.campanieNume === "Campanie B").afisari, null);
  assert.equal(r.totalMinor, 2200);
  assert.equal(r.ignorate, 1);
  assert.deepEqual(r.erori.map((e) => e.linie), [6, 7, 8]);
  assert.deepEqual([r.de, r.pana], ["2026-10-01", "2026-10-02"]);
  assert.deepEqual(r.campanii.map((c) => c.nume), ["Campanie A", "Campanie B"]);
});

test("fără coloanele obligatorii nu se importă nimic", () => {
  const r = S.normalizeaza([["Campanie", "Altceva"], ["x", "y"]], { campanieNume: 0 });
  assert.equal(r.randuri.length, 0);
  assert.equal(r.erori.length, 1);
});

// ───────────── asamblarea raportului ─────────────

const R = await import("../src/lib/reclame/raport.ts");
const ETICHETE = { meta: "Meta", tiktok: "TikTok" };

test("raport: costurile unei campanii cu mai multe seturi/reclame se adună o singură dată și nu se înmulțesc cu numărul donațiilor", () => {
  const costuri = [
    { platforma: "meta", ziua: "2026-10-01", campanieCheie: "111", campanieNume: "Inimă pentru Ana", costBani: 10_000, afisari: 1000, clicuri: 30 },
    { platforma: "meta", ziua: "2026-10-02", campanieCheie: "111", campanieNume: "Inimă pentru Ana", costBani: 5_000, afisari: null, clicuri: null },
  ];
  const donatii = [
    { ziua: "2026-10-01", platforma: "meta", utmCampanie: "cmp_026", clasaDonator: "nou", n: 3, brutBani: 15_000, rambursatBani: 0 },
    { ziua: "2026-10-02", platforma: "meta", utmCampanie: "cmp_026", clasaDonator: "existent", n: 2, brutBani: 10_000, rambursatBani: 2_000 },
  ];
  const r = R.asambleaza({ de: "2026-10-01", pana: "2026-10-03", costuri, donatii, legaturi: [{ platforma: "meta", campanieCheie: "111", campanieNume: "Inimă pentru Ana", utmCampanie: "cmp_026" }], etichetePlatforme: ETICHETE });
  assert.equal(r.totaluri.cheltuieliBani, 15_000); // nu 15.000 × 5 donații
  assert.equal(r.totaluri.donatii, 5);
  assert.equal(r.totaluri.brutBani, 25_000);
  assert.equal(r.totaluri.rambursatBani, 2_000);
  assert.equal(r.totaluri.donatoriNoi, 3);
  assert.equal(r.totaluri.donatoriExistenti, 2);
  assert.equal(r.peCampanie.length, 1);
  assert.equal(r.peCampanie[0].legata, true);
  assert.equal(r.peCampanie[0].totaluri.cheltuieliBani, 15_000);
  assert.equal(r.peCampanie[0].totaluri.donatii, 5);
  assert.equal(r.peCampanie[0].afisari, 1000);
  assert.equal(r.pePlatforma.length, 1);
  assert.equal(r.pePlatforma[0].eticheta, "Meta");
  assert.equal(r.pePlatforma[0].totaluri.cheltuieliBani, 15_000);
  // totalul pe zile = totalul general; zilele fără activitate apar cu zero
  assert.equal(r.peZi.length, 3);
  assert.equal(r.peZi.reduce((s, z) => s + z.cheltuieliBani, 0), r.totaluri.cheltuieliBani);
  assert.equal(r.peZi.reduce((s, z) => s + z.netBani, 0), 23_000);
  assert.equal(r.peZi[2].donatii, 0);
  assert.equal(r.costNealocatBani, 0);
  assert.equal(r.donatiiFaraCostLegat, 0);
});

test("raport: cheltuiala fără cod UTM legat rămâne vizibilă ca nealocată, iar donațiile cu cod necunoscut sunt semnalate", () => {
  const costuri = [{ platforma: "meta", ziua: "2026-10-01", campanieCheie: "222", campanieNume: "Altă campanie", costBani: 7_000, afisari: null, clicuri: null }];
  const donatii = [
    { ziua: "2026-10-01", platforma: "meta", utmCampanie: "cmp_999", clasaDonator: "necl", n: 1, brutBani: 5_000, rambursatBani: 0 },
    { ziua: "2026-10-01", platforma: "tiktok", utmCampanie: null, clasaDonator: "necl", n: 1, brutBani: 3_000, rambursatBani: 0 },
  ];
  const r = R.asambleaza({ de: "2026-10-01", pana: "2026-10-01", costuri, donatii, legaturi: [], etichetePlatforme: ETICHETE });
  assert.equal(r.costNealocatBani, 7_000);
  assert.equal(r.donatiiFaraCostLegat, 2);
  assert.equal(r.totaluri.cheltuieliBani, 7_000);
  assert.equal(r.totaluri.donatoriNeclasificati, 2);
  assert.equal(r.peCampanie.length, 3);
  assert.ok(r.peCampanie.every((l) => l.legata === false));
  // platforma fără cheltuială apare totuși cu donațiile ei
  assert.equal(r.pePlatforma.find((p) => p.platforma === "tiktok").totaluri.donatii, 1);
});

test("raport: fără date, zero peste tot și fără împărțiri la zero", () => {
  const r = R.asambleaza({ de: "2026-10-01", pana: "2026-10-02", costuri: [], donatii: [], legaturi: [], etichetePlatforme: ETICHETE });
  assert.equal(r.peCampanie.length, 0);
  assert.equal(r.peZi.length, 2);
  const i = C.calculeazaIndicatori(r.totaluri);
  assert.equal(i.roasNet, null);
  assert.equal(R.totaluriSimple([{ costBani: 5 }], []).cheltuieliBani, 5);
});

// ───────────── export CSV ─────────────

const X = await import("../src/lib/reclame/export-csv.ts");

test("export: celulele care ar putea rula ca formule sunt neutralizate, iar ghilimelele și virgulele sunt protejate", () => {
  assert.equal(X.celulaSigura("=HYPERLINK(\"http://x\")"), "\"'=HYPERLINK(\"\"http://x\"\")\"");
  assert.equal(X.celulaSigura("+1"), "'+1");
  assert.equal(X.celulaSigura("@SUM(A1)"), "'@SUM(A1)");
  assert.equal(X.celulaSigura("-cmd"), "'-cmd");
  assert.equal(X.celulaSigura("Campanie, 2"), "\"Campanie, 2\"");
  assert.equal(X.celulaSigura(-5), "-5"); // numerele reale nu se modifică
  assert.equal(X.celulaSigura(null), "");
});

test("export: antetul spune perioada, fusul orar, moneda, modelul, fereastra și ultima actualizare", () => {
  const csv = X.construiesteCsv(
    { perioada: "2026-10-01 – 2026-10-15", fusOrar: "Europe/Bucharest", moneda: "RON", model: "ultim-clic-v1", fereastraZile: 7, actualizat: "2026-10-15" },
    [{ platforma: "Meta", campanie: "=evil()", codUtm: "cmp_026", cheltuieliLei: 100, donatii: 2, brutLei: 450, netLei: 440, costPerDonatieLei: 50, roasNet: 4.4, donatoriNoi: 1 }],
  );
  assert.match(csv, /Europe\/Bucharest/);
  assert.match(csv, /ultim-clic-v1/);
  assert.match(csv, /Fereastra de atribuire \(zile\),7/);
  assert.ok(csv.includes("'=evil()"));
  assert.ok(csv.endsWith("\r\n"));
  assert.equal(X.baniInLei(12345), 123.45);
});
