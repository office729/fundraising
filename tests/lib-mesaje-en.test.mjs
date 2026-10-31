import { test } from "node:test";
import assert from "node:assert/strict";

// Verifică că mesajele din src/lib care au variantă în engleză nu lasă română în interfața engleză și că româna rămâne neschimbată.
// Mesajele care trec prin traduceri după text (lib-mesaje-ui.ts) sunt generate de bibliotecile reale: dacă un text sursă se schimbă, testul pică.

const M = await import("../src/lib/prospectare/motor.ts");
const T = await import("../src/lib/i18n/dictionaries/lib-mesaje-ui.ts");
const MA = await import("../src/lib/reclame/meta-api.ts");
const P = await import("../src/lib/billing/packages.ts");
const Q = await import("../src/lib/campuri-personalizate.ts");
const G = await import("../src/lib/granturi/stari.ts");
const AN = await import("../src/lib/analiza-donator.ts");
const CR = await import("../src/lib/cronologie-donator.ts");
const SC = await import("../src/lib/scor-companie.ts");
const CL = await import("../src/lib/atribuire/clasificare.ts");
const UTM = await import("../src/lib/reclame/utm.ts");
const CSV = await import("../src/lib/reclame/csv-costuri.ts");
const AL = await import("../src/lib/alocari-sponsorizare.ts");
const PS = await import("../src/lib/pagini-sociale.ts");
const SCH = await import("../src/lib/billing/schimbare-plan.ts");
const AF = await import("../src/lib/prospectare/afisare.ts");

const ARE_RO = /[ăâîșțĂÂÎȘȚ]/;
const faraRo = (s, ctx = "") => assert.ok(!ARE_RO.test(s), `română rămasă${ctx ? ` (${ctx})` : ""}: ${s}`);

const raspuns = (corp, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => corp, text: async () => JSON.stringify(corp) });

test("prospectare: fiecare eroare reală a furnizorilor are traducere", async () => {
  const erori = new Set();
  for (const status of [401, 403, 429, 500, 503, 400]) {
    const f = async () => raspuns({ message: "" }, status);
    for (const v of [M.apolloValideaza, M.hunterValideaza, M.prospeoValideaza, M.lushaValideaza, M.waalaxyValideaza]) {
      const r = await v("cheie-de-test-lunga", f);
      if (!r.ok) erori.add(r.eroare);
    }
  }
  const retea = async () => {
    throw new Error("rețea");
  };
  for (const v of [M.apolloValideaza, M.hunterValideaza, M.prospeoValideaza, M.lushaValideaza, M.waalaxyValideaza]) {
    const r = await v("cheie-de-test-lunga", retea);
    if (!r.ok) erori.add(r.eroare);
  }
  assert.ok(erori.size >= 10, "s-au generat mesaje reale");
  for (const e of erori) {
    const en = T.traduEroareProspectare(e, "en");
    assert.notEqual(en, e, `fără traducere: ${e}`);
    faraRo(en, e);
    assert.equal(T.traduEroareProspectare(e, "ro"), e);
  }
});

test("prospectare: limitele și avertismentele căutării au traducere", async () => {
  // Fără chei și fără site: Hunter e sărit; limita de apeluri 0 produce mesajul de limită.
  const gol = { chei: new Set(), emailuri: new Set(), linkedin: new Set() };
  const f = async () => raspuns({ people: [], data: { emails: [] } });
  const r = await M.cautaDecidenti({ firma: { nume: "Alfa", site: null }, chei: { hunter: "cheie-hunter-lunga" }, cunoscute: gol, suprimate: gol, limite: { apeluriRamase: 0 }, fetchFn: f });
  const r2 = await M.cautaDecidenti({ firma: { nume: "Alfa", site: null }, chei: { hunter: "cheie-hunter-lunga" }, cunoscute: gol, suprimate: gol, fetchFn: f });
  const toate = [...r.erori, ...r2.erori];
  assert.ok(toate.length >= 1);
  for (const e of toate) {
    const en = T.traduEroareProspectare(e, "en");
    assert.notEqual(en, e, `fără traducere: ${e}`);
    faraRo(en, e);
  }
});

test("meta: fiecare mesaj al clasificatorului are traducere", () => {
  const cazuri = [
    [401, {}],
    [200, { error: { code: 10 } }],
    [200, { error: { code: 100, error_subcode: 1487534 } }],
    [429, {}],
    [200, { error: { code: 100 } }],
    [500, {}],
    [200, { error: { code: 9999 } }],
  ];
  for (const [status, corp] of cazuri) {
    const e = MA.claseazaEroare(status, corp);
    const en = T.traduEroareMeta(e.message, "en");
    assert.notEqual(en, e.message, `fără traducere: ${e.message}`);
    faraRo(en, e.message);
  }
  // Mesajele din meta-sync.ts nu se pot genera fără bază de date: se verifică lista de texte cunoscute.
  for (const ro of [
    "Sincronizarea nu a reușit. Încearcă din nou peste puțin timp.",
    "Conexiunea cere reconectare: generează un token nou și reconectează contul.",
    "O sincronizare e deja în curs.",
    "Contul folosește moneda USD: setează cursul de conversie în lei la reconectare.",
    "Moneda contului s-a schimbat (USD față de EUR). Reconectează contul.",
    "Contul folosește moneda USD. Introdu cursul de conversie în lei (de exemplu 4,60).",
    "Nu am putut verifica contul acum. Încearcă din nou peste puțin timp.",
  ]) faraRo(T.traduEroareMeta(ro, "en"), ro);
});

test("pachete: numele modulelor, recomandarea și etichetele au engleză; româna rămâne", () => {
  for (const m of Object.keys(P.MODULE_PACHET)) {
    assert.equal(P.numeModul(m), P.MODULE_PACHET[m].nume);
    faraRo(P.numeModul(m, "en"), m);
  }
  assert.equal(P.etichetaPachet("start", 2), "Pachet START + 2 utilizatori suplimentari");
  assert.equal(P.etichetaPachet("start", 2, "en"), "START plan + 2 extra users");
  const u = { utilizatori: 14, contactePf: 60_000, companiiPj: 20_000, module: ["granturi", "api-webhooks"] };
  const ro = P.recomandaPachet(u);
  const en = P.recomandaPachet(u, "en");
  assert.equal(ro.depaseste, en.depaseste);
  assert.equal(ro.alegere.pachet, en.alegere.pachet);
  assert.match(ro.folosit[0], /utilizatori/);
  for (const e of en.evaluari) for (const l of e.lipsuri) faraRo(l);
  for (const f of en.folosit) faraRo(f);
  assert.match(en.folosit.join(" "), /Grants/);
});

test("pachete: schimbarea de plan blocată are mesaj în ambele limbi", () => {
  const acum = new Date("2026-10-14T10:00:00Z");
  const curent = { package: "start", extraUsers: 0, subscriptionStatus: "active", currentPeriodEnd: new Date(acum.getTime() + 100 * 86_400_000) };
  const ro = SCH.schimbarePlanBlocata(curent, { package: "impact", extraUsers: 0 }, acum);
  const en = SCH.schimbarePlanBlocata(curent, { package: "impact", extraUsers: 0 }, acum, "en");
  assert.match(ro, /abonament plătit până la/);
  assert.match(en, /subscription paid until/);
  faraRo(en);
});

test("câmpuri personalizate: validările au engleză, româna rămâne", () => {
  const r = Q.valideazaDefinitie({ entitate: "x", eticheta: "", tip: "y" }, "en");
  assert.equal(r.ok, false);
  for (const e of r.erori) faraRo(e.mesaj);
  const ro = Q.valideazaDefinitie({ entitate: "x", eticheta: "", tip: "y" });
  assert.equal(ro.erori[0].mesaj, "Alege unde apare câmpul (donatori sau firme).");
  const def = { entitate: "donator", cheie: "c", eticheta: "C", tip: "numar", optiuni: [] };
  faraRo(Q.curataValoare(def, "abc", "en").mesaj);
  assert.equal(Q.formateazaValoare({ tip: "da_nu" }, true, "en"), "Yes");
  assert.equal(Q.formateazaValoare({ tip: "da_nu" }, true), "Da");
  assert.equal(Q.etichetaTipCamp("alegere", "en"), "Choice from a list");
});

test("granturi: validarea și termenele au engleză", () => {
  const baza = { id: null, finantator: "", titlu: "", tipFinantator: "alt", stare: "identificat", suma: "", moneda: "RON", termen: "", link: "", responsabilId: null, nota: "", cerinte: "", eligibilitate: [], documente: [], draft: "", sumaCastigata: "", dataDecizie: "", termenRaportare: "" };
  const cazuri = [{}, { finantator: "F" }, { finantator: "F", titlu: "T", stare: "x" }, { finantator: "F", titlu: "T", termen: "2026-02-31" }, { finantator: "F", titlu: "T", dataDecizie: "x" }, { finantator: "F", titlu: "T", termenRaportare: "x" }, { finantator: "F", titlu: "T", suma: "abc" }, { finantator: "F", titlu: "T", sumaCastigata: "abc" }, { finantator: "F", titlu: "T", link: "nu e link" }];
  for (const c of cazuri) {
    const ro = G.valideazaGrant({ ...baza, ...c });
    const en = G.valideazaGrant({ ...baza, ...c }, "en");
    assert.equal(ro.ok, false);
    assert.equal(en.ok, false);
    assert.notEqual(ro.eroare, en.eroare);
    faraRo(en.eroare);
  }
  for (const z of [null, 0, 1, -1, 5, -5]) faraRo(G.textTermen(z, "en"));
  assert.equal(G.textTermen(3), "în 3 zile");
  assert.equal(G.textTermen(3, "en"), "in 3 days");
  for (const s of G.STARI_GRANT) faraRo(G.etichetaStare(s, "en"));
  for (const t of G.TIPURI_FINANTATOR) faraRo(G.etichetaTipFinantator(t, "en"));
});

test("analiza donatorului: motivul, eticheta și ritmul în engleză", () => {
  const acum = new Date("2026-10-31T00:00:00Z");
  const zile = (n) => new Date(acum.getTime() - n * 86_400_000).toISOString();
  const intrari = [
    { primaAt: null, ultimaAt: null, nr: 0, total: 0 },
    { primaAt: zile(300), ultimaAt: zile(10), nr: 4, total: 400 },
    { primaAt: zile(300), ultimaAt: zile(150), nr: 4, total: 400 },
    { primaAt: zile(900), ultimaAt: zile(700), nr: 3, total: 300 },
    { primaAt: zile(60), ultimaAt: zile(60), nr: 1, total: 50 },
    { primaAt: zile(400), ultimaAt: zile(400), nr: 1, total: 50 },
  ];
  for (const i of intrari) {
    const ro = AN.analizeazaDonator(i, acum);
    const en = AN.analizeazaDonator(i, acum, "en");
    assert.equal(ro.risc, en.risc);
    assert.notEqual(ro.riscMotiv, en.riscMotiv);
    faraRo(en.riscMotiv);
    faraRo(en.eticheta);
    faraRo(AN.ritmInCuvinte(en.cadentaZile, "en"));
  }
  for (const c of [null, 20, 100, 400, 700]) faraRo(AN.ritmInCuvinte(c, "en"));
});

test("cronologia donatorului: evenimentele sunt în limba cerută", () => {
  const la = "2026-10-01T10:00:00Z";
  const ev = [
    CR.evenimentDonatie({ id: "1", la, suma: 1234, status: "reusita", recurenta: true, proiect: "P" }, "en"),
    CR.evenimentDonatie({ id: "2", la, suma: 5, status: "esuata", recurenta: false }, "en"),
    CR.evenimentDonatieImportata({ id: "3", la, suma: 10, proiect: "P", procesator: "Stripe" }, "en"),
    CR.evenimentNota({ id: "4", la, tip: "apel", text: "x", rezultat: "refuz" }, "en"),
    CR.evenimentParcurs({ id: "5", la, numeParcurs: "Welcome", pas: 2, stare: "in_curs" }, "en"),
    CR.evenimentParcurs({ id: "6", la, numeParcurs: "Welcome", pas: 1, stare: "control" }, "en"),
    ...CR.evenimenteDeStare({ acordLa: la, acordSursa: "declarat_echipa", dezabonatLa: la, adresaLa: la, adresaStare: "reclamat", sunatLa: la, multumitLa: la }, "en"),
  ];
  for (const e of ev) {
    faraRo(e.titlu, e.id);
    if (e.detaliu && e.tip !== "apel") faraRo(e.detaliu, e.id);
  }
  assert.equal(CR.evenimentDonatie({ id: "1", la, suma: 1234, status: "reusita", recurenta: true }).titlu, "Donație: 1.234 lei (lunară)");
  assert.equal(ev[0].titlu, "Donation: 1,234 lei (monthly)");
  assert.equal(CR.grupeazaPeLuni([ev[0]], "en")[0].luna, "October 2026");
});

test("scor companie și provenienta: detalii în engleză", () => {
  const input = { sumaDisponibila: 100000, ca: 2_000_000, profit: 5, nrAngajati: 20, recurent: false, temperatura: "cald", sumaSponsorizata: null, stage: "contactat", contacte: [{ dept: "Conducere", cheie: true }], luna: 11, sumaEstimata: true, cald: false };
  const en = SC.calculeazaScor(input, "en");
  assert.equal(en.total, SC.calculeazaScor(input).total);
  for (const l of en.linii) faraRo(l.detaliu, l.cheie);
  for (const c of CL.CANALE) faraRo(CL.etichetaCanal(c, "en"));
  for (const t of CL.TIPURI) faraRo(CL.etichetaTipPromovare(t, "en"));
  for (const m of ["utm", "identificator_reclame", "referrer", "necunoscut"]) faraRo(CL.etichetaMetoda(m, "en"));
  for (const f of CL.FLUXURI) faraRo(CL.etichetaFlux(f, "en"));
  faraRo(CL.etichetaProvenienta({ sursa: null, canal: null, tip: null }, "en"));
  faraRo(CL.etichetaProvenienta({ sursa: "facebook", canal: "social_nedeterminat", tip: "nedeterminat", campanie: "cmp" }, "en"));
  assert.equal(CL.etichetaProvenienta({ sursa: null, canal: null, tip: null }), "Fără sursă măsurată");
});

test("reclame și alocări: mesajele de validare au engleză", () => {
  faraRo(UTM.construiesteLink({ url: "nu e url", source: "a", medium: "b", campaign: "c" }, "en").eroare);
  faraRo(UTM.construiesteLink({ url: "ftp://a.ro", source: "a", medium: "b", campaign: "c" }, "en").eroare);
  faraRo(UTM.construiesteLink({ url: "https://a.ro", source: "A B", medium: "b", campaign: "c" }, "en").eroare);
  faraRo(UTM.construiesteLink({ url: "https://a.ro", source: "a", medium: "b", campaign: "c", content: "X Y" }, "en").eroare);
  assert.match(UTM.construiesteLink({ url: "https://a.ro", source: "A B", medium: "b", campaign: "c" }).eroare, /^Sursa: folosește/);
  const mapare = { ziua: 0, cheltuiala: 1 };
  const antet = ["zi", "suma"];
  for (const randuri of [[antet, ["nu e data", "10"]], [antet, ["2026-10-05", "abc"]], [antet, ["2026-10-05", "-5"]]]) {
    const en = CSV.normalizeaza(randuri, mapare, { locale: "en" });
    assert.ok(en.erori.length > 0);
    faraRo(en.erori[0].mesaj);
  }
  faraRo(CSV.normalizeaza([antet], {}, { locale: "en" }).erori[0].mesaj);
  faraRo(AL.valideazaAlocari(100, [{ nume: "", suma: 5 }], "en").eroare);
  faraRo(AL.valideazaAlocari(100, [{ nume: "A", suma: -5 }], "en").eroare);
  faraRo(AL.valideazaAlocari(100, [{ nume: "A", suma: 500 }], "en").eroare);
  for (const l of ["https://x.ro", "https://linkedin.com/in/ion"]) faraRo(PS.valideazaLinkedin(l, "en").eroare ?? "");
  for (const l of ["https://x.ro", "https://facebook.com", "https://facebook.com/groups/1", "https://facebook.com/pages", "https://facebook.com/profile.php"]) faraRo(PS.valideazaFacebook(l, "en").eroare ?? "");
});

test("prospectare: afișarea scurtă a timpului în engleză", () => {
  const acum = Date.parse("2026-10-31T12:00:00Z");
  const iso = (ms) => new Date(acum - ms).toISOString();
  for (const ms of [30_000, 10 * 60_000, 3 * 3_600_000, 30 * 3_600_000, 5 * 86_400_000, 30 * 86_400_000, 200 * 86_400_000]) faraRo(AF.vechime(iso(ms), acum, "en"));
  assert.equal(AF.vechime(iso(5 * 86_400_000), acum), "acum 5 zile");
  assert.equal(AF.vechime(iso(5 * 86_400_000), acum, "en"), "5 days ago");
  assert.equal(AF.stareTermen("2026-10-29", "2026-10-31", "en").text, "2 days overdue");
  assert.equal(AF.stareTermen("2026-11-02", "2026-10-31", "en").text, "in 2 days");
});

test("import donatori: motivele adreselor de e-mail au traducere", async () => {
  const CC = await import("../src/lib/curatare-contacte.ts");
  const probe = ["", "ion", "a@b@c.ro", "@gmail.com", "ion@", `${"a".repeat(70)}@gmail.com`, "ionel@gmail.com", "ion..p@gmail.ro", "ion@gmail", "ion@exemplu", "ion@a_b.ro", "ion@gmail.c", "test@test.com", "aaaaa@gmail.com", "nu@are.ro", "ion@example.com", "ion.popescu@gmial.con", "<ion@gmail.com> ", "a@b.ro, c@d.ro", "ion popescu@gmail.com", "ion@yahho.co", "ion@gmail.ro", "ion@mail.ro.", "iónel@gmail.com", "i!on#@gmail.com", "ion@gmail.com mailto:", "ion@sub..domeniu.ro"];
  const motive = new Set();
  for (const p of probe) {
    const ev = CC.evalueazaEmail(p);
    if (ev.motiv) for (const m of ev.motiv.split("; ")) motive.add(m);
  }
  assert.ok(motive.size >= 10, "s-au generat motive reale");
  for (const m of motive) {
    const en = T.traduMotivEmail(m, "en");
    assert.notEqual(en, m, `fără traducere: ${m}`);
    faraRo(en, m);
  }
  assert.equal(T.traduMotivEmail("Adresa nu conține @", "ro"), "Adresa nu conține @");
});
