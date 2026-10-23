import { test } from "node:test";
import assert from "node:assert/strict";

const S = await import("../src/lib/prospectare/motor.ts");

test("administratorul și directorul general sunt prioritatea 1; directorul financiar prioritatea 2; CSR prioritatea 3", () => {
  assert.equal(S.scorDecident("Administrator").prioritate, 1);
  assert.equal(S.scorDecident("Director General").prioritate, 1);
  assert.equal(S.scorDecident("CEO").prioritate, 1);
  assert.equal(S.scorDecident("Director Financiar").prioritate, 2);
  assert.equal(S.scorDecident("CSR Manager").prioritate, 3);
  assert.equal(S.scorDecident("Marketing Director").prioritate, 4);
  assert.equal(S.scorDecident("HR Manager").prioritate, 5);
});

test("rolurile de execuție nu sunt „proprietar”: Product Owner nu e patron", () => {
  assert.notEqual(S.scorDecident("Product Owner").prioritate, 1);
  assert.equal(S.scorDecident("Owner").prioritate, 1);
});

test("stagiarii nu primesc scor; specialiștii primesc puțin", () => {
  assert.equal(S.scorDecident("Marketing Intern").scor, 0);
  assert.ok(S.scorDecident("Specialist marketing").scor < S.scorDecident("Marketing Director").scor);
});

test("funcțiile de filială sau magazin sunt penalizate, dar un administrator rămâne la nivelul lui", () => {
  const magazin = S.scorDecident("Director Magazin");
  const director = S.scorDecident("Director");
  assert.ok(magazin.scor < director.scor, `${magazin.scor} < ${director.scor}`);
  assert.equal(S.scorDecident("Administrator magazin").prioritate, 1);
});

test("mărimea firmei schimbă ordinea: la firme mici patronul urcă, la firme mari CSR și marketingul urcă", () => {
  assert.ok(S.scorDecident("Administrator", { angajati: 20 }).scor > S.scorDecident("Administrator", { angajati: 120 }).scor);
  assert.ok(S.scorDecident("CSR Manager", { angajati: 400 }).scor > S.scorDecident("CSR Manager", { angajati: 100 }).scor);
  assert.ok(S.scorDecident("Director marketing", { angajati: 400 }).scor > S.scorDecident("Director marketing", { angajati: 100 }).scor);
});

test("fără funcție și fără senioritate: scor 0", () => {
  assert.deepEqual(S.scorDecident(""), { scor: 0, prioritate: null });
});

test("cheia de nume: fără diacritice și ordine; nume cu un cuvânt tot primește cheie", () => {
  assert.equal(S.cheieNume("Popescu Ioana"), S.cheieNume("ioana POPESCU"));
  assert.equal(S.cheieNume("Ștefan Țigănuș"), S.cheieNume("Stefan Tiganus"));
  assert.equal(S.cheieNume("Ioana"), "ioana");
  assert.equal(S.cheieNume(""), "");
});

test("domeniul din site și din e-mail; webmail nu e domeniul firmei", () => {
  assert.equal(S.domeniuDinSite("https://www.Firma.ro/contact?x=1"), "firma.ro");
  assert.equal(S.domeniuDinSite("firma.ro"), "firma.ro");
  assert.equal(S.domeniuDinSite("nu un site"), null);
  assert.equal(S.domeniuDinSite(null), null);
  assert.equal(S.domeniuDinEmail("ion@firma.ro"), "firma.ro");
  assert.equal(S.domeniuDinEmail("ion@gmail.com"), null);
  assert.equal(S.domeniuDinEmail("fara-arond"), null);
});

test("linkedin: aceeași persoană indiferent de prefix", () => {
  assert.equal(S.linkedinNormalizat("https://www.linkedin.com/in/ion-popescu/"), S.linkedinNormalizat("http://linkedin.com/in/ion-popescu?trk=x"));
});

test("departamentul din CRM", () => {
  assert.equal(S.departamentCrm("finance", "Director Financiar"), "Financiar");
  assert.equal(S.departamentCrm("", "CEO"), "Conducere");
  assert.equal(S.departamentCrm("human_resources", "Recruiter"), "HR");
  assert.equal(S.departamentCrm("it", "Developer"), "");
});

// ===== Adaptoare și orchestrator, cu fetch simulat =====
const raspuns = (corp, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => corp, text: async () => JSON.stringify(corp) });
function furnizoriSimulati(rute) {
  const apeluri = [];
  const f = async (url, init = {}) => {
    apeluri.push({ url, metoda: init.method ?? "GET", headers: init.headers ?? {}, corp: init.body ? JSON.parse(init.body) : null });
    for (const [parte, r] of Object.entries(rute)) if (url.includes(parte)) return typeof r === "function" ? r(url, init) : r;
    return raspuns({}, 404);
  };
  return { f, apeluri };
}
const gol = { chei: new Set(), emailuri: new Set(), linkedin: new Set() };
const firma = { nume: "Alfa SRL", site: "https://www.alfa.ro", angajati: 30 };
const APOLLO_CAUTARE = raspuns({
  people: [
    { id: "a1", name: "Ion Popescu", title: "Administrator", seniority: "owner", departments: ["executive"], linkedin_url: "https://linkedin.com/in/ion-popescu" },
    { id: "a2", name: "Maria Ionescu", title: "Director Financiar", seniority: "director", departments: ["finance"] },
    { id: "a3", name: "Andrei Stagiar", title: "Marketing Intern" },
  ],
});
const HUNTER_DOMENIU = raspuns({ data: { emails: [{ value: "ion.popescu@alfa.ro", first_name: "Ion", last_name: "Popescu", position: "Administrator", confidence: 95, verification: { status: "valid" } }, { value: "contact@alfa.ro", first_name: "", last_name: "", position: "" }] } });
// Apollo doar cu patronul (fără omul de la finanțe): cascada continuă la Hunter, care îl găsește și pe directorul financiar.
const APOLLO_DOAR_PATRON = raspuns({ people: [{ id: "a1", name: "Ion Popescu", title: "Administrator", seniority: "owner", departments: ["executive"], linkedin_url: "https://linkedin.com/in/ion-popescu" }, { id: "a3", name: "Andrei Stagiar", title: "Marketing Intern" }] });
const HUNTER_CU_FINANCIAR = raspuns({ data: { emails: [{ value: "ion.popescu@alfa.ro", first_name: "Ion", last_name: "Popescu", position: "Administrator", verification: { status: "valid" } }, { value: "maria.ionescu@alfa.ro", first_name: "Maria", last_name: "Ionescu", position: "Director Financiar", verification: { status: "valid" } }] } });

test("cascada: Apollo găsește persoanele, Hunter adaugă e-mailul, duplicatele se unesc, stagiarii dispar", async () => {
  const { f, apeluri } = furnizoriSimulati({
    "api_search": APOLLO_DOAR_PATRON,
    "domain-search": HUNTER_CU_FINANCIAR,
    "email-finder": raspuns({ data: { email: "nu-ar-trebui@alfa.ro", verification: { status: "valid" } } }),
    "email-verifier": raspuns({ data: { status: "valid" } }),
  });
  const r = await S.cautaDecidenti({ firma, chei: { apollo: "kA", hunter: "kH" }, cunoscute: gol, suprimate: gol, fetchFn: f });
  assert.deepEqual(r.erori, []);
  assert.equal(r.domeniu, "alfa.ro");
  assert.deepEqual(r.candidati.map((c) => c.nume), ["Ion Popescu", "Maria Ionescu"]);
  const ion = r.candidati[0];
  assert.equal(ion.email, "ion.popescu@alfa.ro", "e-mailul din Hunter se unește cu persoana din Apollo");
  assert.equal(ion.linkedin, "https://linkedin.com/in/ion-popescu");
  assert.equal(ion.ids.apollo, "a1");
  assert.equal(r.candidati[1].email, "maria.ionescu@alfa.ro", "e-mailul directorului financiar vine direct din Hunter");
  assert.equal(r.candidati[1].emailStatus, "valid");
  assert.ok(!apeluri.some((a) => a.url.includes("email-finder")), "nu se plătește Email Finder când e-mailul e deja cunoscut");
  // fiecare furnizor primește cheia lui, în header (nu în adresă)
  const catreApollo = apeluri.find((a) => a.url.includes("api_search"));
  assert.equal(catreApollo.headers["X-Api-Key"], "kA");
  assert.equal(catreApollo.corp.q_organization_domains_list[0], "alfa.ro");
  assert.ok(!apeluri.some((a) => a.url.includes("kA") || a.url.includes("kH")), "cheile nu apar în adrese");
  assert.equal(apeluri.find((a) => a.url.includes("domain-search")).headers["X-API-KEY"], "kH");
});

test("jurnalul de apeluri: Apollo costă 0 unități la căutare, Hunter 1; la eșec nu se numără unități", async () => {
  const { f } = furnizoriSimulati({ "api_search": APOLLO_DOAR_PATRON, "domain-search": raspuns({ errors: [{ details: "plan epuizat" }] }, 429), "email-finder": raspuns({ data: {} }), "email-verifier": raspuns({ data: { status: "valid" } }) });
  const r = await S.cautaDecidenti({ firma, chei: { apollo: "kA", hunter: "kH" }, cunoscute: gol, suprimate: gol, fetchFn: f });
  const cautApollo = r.apeluri.find((a) => a.furnizor === "apollo" && a.operatie === "cautare");
  const cautHunter = r.apeluri.find((a) => a.furnizor === "hunter" && a.operatie === "cautare");
  assert.equal(cautApollo.unitati, 0);
  assert.equal(cautHunter.ok, false);
  assert.equal(cautHunter.unitati, 0);
  assert.ok(r.erori.some((e) => /Limita contului tău de la Hunter/.test(e)));
  assert.ok(r.candidati.length >= 1, "restul cascadei continuă după eroarea unui furnizor");
});

test("cheie respinsă (401): mesaj clar, fără candidați", async () => {
  const { f } = furnizoriSimulati({ "api_search": raspuns({}, 401) });
  const r = await S.cautaDecidenti({ firma, chei: { apollo: "gresita" }, cunoscute: gol, suprimate: gol, fetchFn: f });
  assert.equal(r.candidati.length, 0);
  assert.match(r.erori[0], /Cheia Apollo nu mai e acceptată/);
});

test("fără nicio cheie: nu se apelează nimic", async () => {
  const { f, apeluri } = furnizoriSimulati({});
  const r = await S.cautaDecidenti({ firma, chei: {}, cunoscute: gol, suprimate: gol, fetchFn: f });
  assert.equal(apeluri.length, 0);
  assert.match(r.erori[0], /Nu ai adăugat nicio cheie/);
});

test("persoanele deja cunoscute și cele suprimate nu se mai propun", async () => {
  const { f } = furnizoriSimulati({ "api_search": APOLLO_CAUTARE, "domain-search": HUNTER_DOMENIU, "email-finder": raspuns({ data: {} }), "email-verifier": raspuns({ data: { status: "valid" } }) });
  const r = await S.cautaDecidenti({
    firma,
    chei: { apollo: "kA", hunter: "kH" },
    cunoscute: { chei: new Set([S.cheieNume("Popescu Ion")]), emailuri: new Set(), linkedin: new Set() },
    suprimate: { chei: new Set([S.cheieNume("Ionescu Maria")]), emailuri: new Set(), linkedin: new Set() },
    fetchFn: f,
  });
  assert.ok(!r.candidati.some((c) => c.nume === "Ion Popescu"), "Ion e deja în CRM");
  assert.ok(!r.candidati.some((c) => c.nume === "Maria Ionescu"), "Maria a cerut să nu fie propusă");
  assert.equal(r.candidati.length, 0);
});

test("limita zilnică: când se termină apelurile rămase, căutarea se oprește cu un mesaj", async () => {
  const { f, apeluri } = furnizoriSimulati({ "api_search": APOLLO_CAUTARE, "domain-search": HUNTER_DOMENIU });
  const r = await S.cautaDecidenti({ firma, chei: { apollo: "kA", hunter: "kH" }, cunoscute: gol, suprimate: gol, limite: { apeluriRamase: 1 }, fetchFn: f });
  assert.equal(apeluri.length, 1);
  assert.ok(r.erori.some((e) => /Limita zilnică/.test(e)));
});

test("fără site și fără alt domeniu, doar cu Hunter: mesaj despre domeniu", async () => {
  const { f, apeluri } = furnizoriSimulati({});
  const r = await S.cautaDecidenti({ firma: { nume: "Beta", site: null }, chei: { hunter: "kH" }, cunoscute: gol, suprimate: gol, fetchFn: f });
  assert.equal(apeluri.length, 0);
  assert.match(r.erori[0], /site-ul firmei/);
});

test("domeniul alternativ (din e-mailul unui contact) înlocuiește site-ul lipsă", async () => {
  const { f, apeluri } = furnizoriSimulati({ "domain-search": HUNTER_DOMENIU, "email-verifier": raspuns({ data: { status: "valid" } }) });
  const r = await S.cautaDecidenti({ firma: { nume: "Beta", site: null }, domeniuAlternativ: "beta.ro", chei: { hunter: "kH" }, cunoscute: gol, suprimate: gol, fetchFn: f });
  assert.equal(r.domeniu, "beta.ro");
  assert.ok(apeluri[0].url.includes("domain=beta.ro"));
});

test("validarea cheilor: 200 = bună, 401 = respinsă, rețea căzută = mesaj", async () => {
  assert.deepEqual(await S.apolloValideaza("k", async () => raspuns({ is_logged_in: true })), { ok: true, date: true });
  const respinsa = await S.hunterValideaza("k", async () => raspuns({}, 401));
  assert.equal(respinsa.ok, false);
  assert.match(respinsa.eroare, /nu mai e acceptată/);
  const cazuta = await S.apolloValideaza("k", async () => { throw new Error("timp"); });
  assert.equal(cazuta.ok, false);
  assert.match(cazuta.eroare, /nu răspunde acum/);
});
