import { test } from "node:test";
import assert from "node:assert/strict";

const S = await import("../src/lib/prospectare/motor.ts");

// Prospeo, Lusha și Waalaxy, cu fetch simulat (fără apeluri reale).
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

const NUME_6 = ["Andrei Barbu", "Bianca Cojocaru", "Cosmin Dragomir", "Diana Enache", "Eugen Florea", "Flavia Gheorghe"];
const APOLLO_6 = raspuns({ people: NUME_6.map((n, i) => ({ id: `x${i}`, name: n, title: "Administrator", seniority: "owner" })) });
const HUNTER_DOMENIU = raspuns({ data: { emails: [{ value: "ion.popescu@alfa.ro", first_name: "Ion", last_name: "Popescu", position: "Administrator", verification: { status: "valid" } }] } });
const PROSPEO_CAUTARE = raspuns({
  error: false,
  results: [
    { person: { person_id: "p1", full_name: "Elena Dumitru", current_job_title: "Director General", linkedin_url: "https://linkedin.com/in/elena-dumitru" } },
    { person: { person_id: "p2", full_name: "Radu Stagiar", current_job_title: "Marketing Intern" } },
  ],
});
const PROSPEO_ENRICH = raspuns({ error: false, matched: [{ identifier: "p1", person: { person_id: "p1", email: { status: "VERIFIED", revealed: true, email: "elena@alfa.ro" } } }] });
const LUSHA_CAUTARE = raspuns({ requestId: "req-1", data: [{ contactId: "l1", name: "Vlad Marin", jobTitle: "Chief Financial Officer", departments: ["Finance"] }] });
const LUSHA_ENRICH = raspuns({ contacts: [{ isSuccess: true, data: { fullName: "Vlad Marin", emailAddresses: [{ email: "vlad.marin@alfa.ro" }], socialLinks: { linkedin: "https://linkedin.com/in/vlad-marin" } } }] });

test("Prospeo: cheia în header, căutare după domeniu, rolurile fără decizie dispar, e-mailul vine la îmbogățire", async () => {
  const { f, apeluri } = furnizoriSimulati({ "search-person": PROSPEO_CAUTARE, "bulk-enrich-person": PROSPEO_ENRICH });
  const r = await S.cautaDecidenti({ firma, chei: { prospeo: "kP" }, cunoscute: gol, suprimate: gol, fetchFn: f });
  assert.deepEqual(r.erori, []);
  assert.deepEqual(r.candidati.map((c) => c.nume), ["Elena Dumitru"]);
  assert.equal(r.candidati[0].email, "elena@alfa.ro");
  assert.equal(r.candidati[0].emailStatus, "valid");
  assert.equal(r.candidati[0].sursa, "prospeo");
  const cautare = apeluri.find((a) => a.url.includes("search-person"));
  assert.equal(cautare.headers["X-KEY"], "kP");
  assert.deepEqual(cautare.corp.filters.company.websites.include, ["alfa.ro"]);
  assert.ok(!apeluri.some((a) => a.url.includes("kP")), "cheia nu apare în adrese");
  assert.deepEqual(r.apeluri.map((a) => [a.furnizor, a.operatie, a.unitati]), [["prospeo", "cautare", 1], ["prospeo", "email", 1]]);
});

test("Prospeo: NO_RESULTS nu e o eroare", async () => {
  const { f } = furnizoriSimulati({ "search-person": raspuns({ error: true, error_code: "NO_RESULTS" }, 400) });
  assert.deepEqual(await S.prospeoCauta("kP", { nume: "Alfa", domeniu: "alfa.ro" }, f), { ok: true, date: [] });
});

test("Lusha: caută întâi în România, apoi fără țară; e-mailul se potrivește pe nume", async () => {
  let cereri = 0;
  const { f, apeluri } = furnizoriSimulati({
    "contact/search": () => (++cereri === 1 ? raspuns({ requestId: "r0", data: [] }) : LUSHA_CAUTARE),
    "contact/enrich": LUSHA_ENRICH,
  });
  const r = await S.cautaDecidenti({ firma, chei: { lusha: "kL" }, cunoscute: gol, suprimate: gol, fetchFn: f });
  assert.deepEqual(r.erori, []);
  assert.equal(cereri, 2);
  assert.equal(r.candidati[0].nume, "Vlad Marin");
  assert.equal(r.candidati[0].email, "vlad.marin@alfa.ro");
  assert.equal(r.candidati[0].linkedin, "https://linkedin.com/in/vlad-marin");
  assert.equal(r.candidati[0].dept, "Financiar");
  assert.equal(apeluri[0].headers.api_key, "kL");
  assert.deepEqual(apeluri[0].corp.filters.contacts.include.locations, [{ country: "Romania" }]);
  assert.equal(apeluri[1].corp.filters.contacts.include.locations, undefined, "a doua treaptă nu mai filtrează după țară");
  const enrich = apeluri.find((a) => a.url.includes("contact/enrich"));
  assert.equal(enrich.corp.requestId, "req-1");
  assert.deepEqual(enrich.corp.contactIds, ["l1"]);
  assert.equal(r.apeluri.find((a) => a.operatie === "cautare").unitati, 2);
});

test("cascada se oprește când sunt destui candidați: furnizorii plătiți nu se mai apelează", async () => {
  const { f, apeluri } = furnizoriSimulati({ "api_search": APOLLO_6, "people/bulk_match": raspuns({ matches: [] }), "search-person": PROSPEO_CAUTARE, "domain-search": HUNTER_DOMENIU, "contact/search": LUSHA_CAUTARE });
  const r = await S.cautaDecidenti({ firma, chei: { apollo: "kA", prospeo: "kP", hunter: "kH", lusha: "kL" }, cunoscute: gol, suprimate: gol, fetchFn: f });
  assert.equal(r.candidati.length, 5);
  assert.ok(!apeluri.some((a) => a.url.includes("search-person") || a.url.includes("domain-search") || a.url.includes("contact/search")));
});

test("aceeași persoană găsită de doi furnizori e una singură, cu id-urile ambilor", async () => {
  const { f } = furnizoriSimulati({
    "api_search": raspuns({ people: [{ id: "a9", name: "Elena Dumitru", title: "Director General", seniority: "c_suite" }] }),
    "search-person": PROSPEO_CAUTARE,
    "bulk-enrich-person": PROSPEO_ENRICH,
    "people/bulk_match": raspuns({ matches: [] }),
  });
  const r = await S.cautaDecidenti({ firma, chei: { apollo: "kA", prospeo: "kP" }, cunoscute: gol, suprimate: gol, fetchFn: f });
  const elena = r.candidati.filter((c) => c.nume === "Elena Dumitru");
  assert.equal(elena.length, 1);
  assert.deepEqual(elena[0].ids, { apollo: "a9", prospeo: "p1" });
  assert.equal(elena[0].email, "elena@alfa.ro", "e-mailul vine de la furnizorul care îl are");
});

test("validare tolerantă: 401/403 respinge cheia, o eroare fără legătură cu autentificarea nu", async () => {
  assert.equal((await S.prospeoValideaza("k", async () => raspuns({}, 401))).ok, false);
  assert.equal((await S.lushaValideaza("k", async () => raspuns({}, 403))).ok, false);
  assert.equal((await S.prospeoValideaza("k", async () => raspuns({ error_code: "INVALID_API_KEY", message: "invalid api key" }, 400))).ok, false);
  assert.equal((await S.lushaValideaza("k", async () => raspuns({ message: "not found" }, 404))).ok, true);
  assert.equal((await S.prospeoValideaza("k", async () => raspuns({ error: false }))).ok, true);
  assert.equal((await S.lushaValideaza("k", async () => raspuns({}, 500))).ok, false);
});

test("Waalaxy: validare, liste și campanii din forme diferite de răspuns", async () => {
  assert.equal((await S.waalaxyValideaza("kW", async () => raspuns({ ok: true }))).ok, true);
  const respinsa = await S.waalaxyValideaza("kW", async () => raspuns({ message: "x" }, 401));
  assert.equal(respinsa.ok, false);
  assert.match(respinsa.eroare, /Cheia Waalaxy nu mai e acceptată/);
  assert.deepEqual(S.elementeWaalaxy([{ _id: "1", name: "Sponsori" }, { id: "2", title: "Campanie" }, { name: "fără id" }]), [{ id: "1", nume: "Sponsori" }, { id: "2", nume: "Campanie" }]);
  assert.deepEqual(S.elementeWaalaxy({ data: [{ _id: "9", name: "Lista" }] }), [{ id: "9", nume: "Lista" }]);
  assert.deepEqual(S.elementeWaalaxy(null), []);
  const { f, apeluri } = furnizoriSimulati({ "getProspectLists": raspuns([{ _id: "l1", name: "Firme" }]), "campaigns/getAll": raspuns({ campaigns: [{ _id: "c1", name: "Sponsorizări" }] }) });
  const r = await S.waalaxyListe("kW", f);
  assert.deepEqual(r, { ok: true, date: { liste: [{ id: "l1", nume: "Firme" }], campanii: [{ id: "c1", nume: "Sponsorizări" }] } });
  assert.equal(apeluri[0].headers.Authorization, "Bearer kW");
});

test("Waalaxy: trimiterea prospecților către listă și campanie, fără duplicate", async () => {
  const { f, apeluri } = furnizoriSimulati({ "addProspectFromIntegration": raspuns({ ok: true }) });
  const p = S.prenumeSiNume("Elena Maria Dumitru");
  assert.deepEqual(p, { prenume: "Elena", nume: "Maria Dumitru" });
  const r = await S.waalaxyTrimite("kW", { listaId: "l1", campanieId: "c1", prospecti: [{ linkedinUrl: "https://linkedin.com/in/elena", ...p, firma: "Alfa SRL", rol: "Director General" }] }, f);
  assert.equal(r.ok, true);
  const corp = apeluri[0].corp;
  assert.equal(apeluri[0].metoda, "POST");
  assert.equal(corp.prospectListId, "l1");
  assert.equal(corp.campaignId, "c1");
  assert.equal(corp.canCreateDuplicates, false);
  assert.equal(corp.addExistingProspectInCampaign, true);
  assert.equal(corp.prospects[0].url, "https://linkedin.com/in/elena");
  assert.deepEqual(corp.prospects[0].customProfile, { firstName: "Elena", lastName: "Maria Dumitru", company: { name: "Alfa SRL" }, occupation: "Director General" });
  const { f: f2, apeluri: a2 } = furnizoriSimulati({ "addProspectFromIntegration": raspuns({}) });
  await S.waalaxyTrimite("kW", { listaId: "l1", prospecti: [{ linkedinUrl: "u", prenume: "A", nume: "B" }] }, f2);
  assert.equal(a2[0].corp.campaignId, undefined);
  assert.equal(a2[0].corp.addExistingProspectInCampaign, false);
});

test("Waalaxy: eroarea API-ului ajunge ca mesaj, cheia nu apare nicăieri", async () => {
  const { f } = furnizoriSimulati({ "addProspectFromIntegration": raspuns({ message: "list not found" }, 400) });
  const r = await S.waalaxyTrimite("secret-w", { listaId: "x", prospecti: [] }, f);
  assert.equal(r.ok, false);
  assert.match(r.eroare, /list not found/);
  assert.ok(!r.eroare.includes("secret-w"));
});

test("credite: Hunter, Prospeo și Lusha se citesc din răspunsurile de cont; Apollo nu expune credite; forme neașteptate dau necunoscut", async () => {
  assert.deepEqual(S.crediteDinRaspuns("hunter", { data: { requests: { credits: { used: 120, available: 500 } } } }), { ramase: 380, total: 500 });
  assert.deepEqual(S.crediteDinRaspuns("hunter", { data: { requests: { searches: { used: 10, available: 25 } } } }), { ramase: 15, total: 25 });
  assert.deepEqual(S.crediteDinRaspuns("prospeo", { error: false, response: { remaining_credits: 900, used_credits: 100 } }), { ramase: 900, total: 1000 });
  assert.deepEqual(S.crediteDinRaspuns("lusha", { usage: { used: 30, remaining: 70, total: 100 } }), { ramase: 70, total: 100 });
  assert.deepEqual(S.crediteDinRaspuns("lusha", { used: 30, total: 100 }), { ramase: 70, total: 100 });
  assert.deepEqual(S.crediteDinRaspuns("apollo", { orice: 1 }), { ramase: null, total: null });
  assert.deepEqual(S.crediteDinRaspuns("hunter", {}), { ramase: null, total: null });
  assert.deepEqual(S.crediteDinRaspuns("prospeo", null), { ramase: null, total: null });
});

test("credite: apelul de cont folosește cheia în header; Apollo nu face niciun apel; 401 dă mesaj", async () => {
  const { f, apeluri } = furnizoriSimulati({ "/account": raspuns({ data: { requests: { credits: { used: 1, available: 50 } } } }) });
  const r = await S.crediteFurnizor("hunter", "kH", f);
  assert.deepEqual(r, { ok: true, date: { ramase: 49, total: 50 } });
  assert.equal(apeluri[0].headers["X-API-KEY"], "kH");
  const { f: f2, apeluri: a2 } = furnizoriSimulati({});
  assert.deepEqual(await S.crediteFurnizor("apollo", "kA", f2), { ok: true, date: { ramase: null, total: null } });
  assert.equal(a2.length, 0);
  const respinsa = await S.crediteFurnizor("lusha", "k", async () => raspuns({}, 401));
  assert.equal(respinsa.ok, false);
  assert.match(respinsa.eroare, /Cheia Lusha nu mai e acceptată/);
});
