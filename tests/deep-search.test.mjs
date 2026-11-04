import { test } from "node:test";
import assert from "node:assert/strict";

const D = await import("../src/lib/prospectare/deep-search.ts");
const M = await import("../src/lib/prospectare/motor.ts");

const c = (nume, sursa, extra = {}) => ({ nume, rol: "Director", dept: "", linkedin: "", email: "", emailStatus: null, sursa, ids: { [sursa]: `${sursa}-${nume}` }, ...extra });

test("cheia de potrivire cere nume complet: un singur cuvânt nu are cheie", () => {
  assert.equal(D.cheieNumeComplet("Ion Popescu"), D.cheieNumeComplet("Popescu Ion"));
  assert.equal(D.cheieNumeComplet("Ștefan Țurcanu"), D.cheieNumeComplet("stefan turcanu"));
  assert.equal(D.cheieNumeComplet("Ion"), "");
  assert.equal(D.cheieNumeComplet(""), "");
});

test("cheia stocată: numele dintr-un cuvânt primește furnizorul, ca să nu se suprascrie", () => {
  assert.equal(D.cheieStocata("Popescu Ion", "apollo"), "ion popescu");
  assert.equal(D.cheieStocata("Maria", "apollo"), "maria~apollo");
  assert.notEqual(D.cheieStocata("Maria", "apollo"), D.cheieStocata("Maria", "lusha"));
});

test("aceeași persoană la doi furnizori devine una, cu „găsit și în”", () => {
  const r = D.uneste([[c("Ion Popescu", "apollo")], [c("Popescu Ion", "prospeo")]]);
  assert.equal(r.length, 1);
  assert.equal(r[0].sursa, "apollo");
  assert.deepEqual(r[0].alteSurse, ["prospeo"]);
  assert.deepEqual(r[0].ids, { apollo: "apollo-Ion Popescu", prospeo: "prospeo-Popescu Ion" });
});

test("la dublură rămâne furnizorul care are emailul", () => {
  const r = D.uneste([[c("Ion Popescu", "apollo")], [c("Ion Popescu", "hunter", { email: "ion@firma.ro", emailStatus: "valid" })]]);
  assert.equal(r.length, 1);
  assert.equal(r[0].sursa, "hunter");
  assert.equal(r[0].email, "ion@firma.ro");
  assert.deepEqual(r[0].alteSurse, ["apollo"]);
  assert.equal(r[0].ids.apollo, "apollo-Ion Popescu");
});

test("dacă primul are deja emailul, rămâne primul; câmpurile goale se completează", () => {
  const r = D.uneste([[c("Ion Popescu", "prospeo", { email: "ion@firma.ro" })], [c("Ion Popescu", "lusha", { linkedin: "https://linkedin.com/in/ion" })]]);
  assert.equal(r[0].sursa, "prospeo");
  assert.equal(r[0].linkedin, "https://linkedin.com/in/ion");
  assert.deepEqual(r[0].alteSurse, ["lusha"]);
});

test("numele dintr-un singur cuvânt nu se unesc, nici între furnizori", () => {
  const r = D.uneste([[c("Maria", "apollo")], [c("Maria", "prospeo")]]);
  assert.equal(r.length, 2);
});

test("în interiorul aceluiași furnizor nu se deduplică: două persoane cu același nume rămân două", () => {
  const r = D.uneste([[c("Ion Popescu", "apollo"), c("Ion Popescu", "apollo")], [c("Ion Popescu", "lusha")]]);
  assert.equal(r.length, 2);
  assert.deepEqual(r[0].alteSurse, ["lusha"]);
});

test("rândurile deja salvate (cu alteSurse) intră în unire fără să-și piardă sursele", () => {
  const salvat = c("Ion Popescu", "apollo", { alteSurse: ["lusha"] });
  const r = D.uneste([[salvat], [c("Ion Popescu", "prospeo")]]);
  assert.deepEqual(r[0].alteSurse.sort(), ["lusha", "prospeo"]);
});

test("antetul arată pe furnizor numărul, „(memorat)” sau motivul exact al erorii", () => {
  const nume = (f) => ({ apollo: "Apollo", prospeo: "Prospeo", lusha: "Lusha", hunter: "Hunter" })[f] ?? f;
  const t = D.antetFurnizori(
    [
      { furnizor: "apollo", gasiti: 5, memorat: false },
      { furnizor: "prospeo", gasiti: 3, memorat: true },
      { furnizor: "lusha", gasiti: 0, memorat: false, eroare: "Cheia Lusha nu mai e acceptată." },
      { furnizor: "hunter", gasiti: 0, memorat: false },
    ],
    nume,
  );
  assert.equal(t, "Apollo: 5 · Prospeo: 3 (memorat) · Lusha: Cheia Lusha nu mai e acceptată. · Hunter: 0");
});

test("planul de aprobare: plătește furnizorul care a găsit persoana, doar unde lipsește emailul", () => {
  const p = (id, sursa, email = null, telefon = null, ids = { [sursa]: `x-${id}` }) => ({ id, sursa, email, telefon, ids });
  const plan = D.planAprobare([p("1", "apollo"), p("2", "prospeo"), p("3", "hunter", "a@b.ro"), p("4", "web-ai"), p("5", "lusha", "l@b.ro"), p("6", "apollo", null, null, {})]);
  assert.deepEqual(plan.cumpara, { apollo: ["1"], prospeo: ["2"] });
  assert.deepEqual(plan.directe.sort(), ["3", "4", "5"]);
  assert.deepEqual(plan.faraId, ["6"]);
});

test("„Cere și telefonul mobil” cumpără și pentru cei care au deja emailul, dar doar la Prospeo", () => {
  const p = (id, sursa, email) => ({ id, sursa, email, telefon: null, ids: { [sursa]: `x-${id}` } });
  const plan = D.planAprobare([p("1", "prospeo", "a@b.ro"), p("2", "apollo", "c@d.ro"), p("3", "hunter", "e@f.ro")], { cuTelefon: true });
  assert.deepEqual(plan.cumpara, { prospeo: ["1"] });
  assert.deepEqual(plan.directe.sort(), ["2", "3"]);
});

test("eșecurile parțiale: cei de la furnizorul căzut rămân pentru reîncercare", () => {
  const lista = [{ sursa: "apollo", n: 1 }, { sursa: "prospeo", n: 2 }, { sursa: "apollo", n: 3 }];
  const { reusiti, ramasi } = D.separaDupaRezultat(lista, new Set(["prospeo"]));
  assert.deepEqual(reusiti.map((x) => x.n), [1, 3]);
  assert.deepEqual(ramasi.map((x) => x.n), [2]);
});

// ---- Lusha: treapta fără filtru de țară refuzată = „0 găsiți”, nu eroare ----
const raspuns = (status, corp) => new Response(JSON.stringify(corp), { status, headers: { "content-type": "application/json" } });

test("Lusha: dacă a doua treaptă e refuzată (400), rezultatul e 0 găsiți, nu eroare", async () => {
  let apeluri = 0;
  const f = async () => (++apeluri === 1 ? raspuns(200, { requestId: "r1", data: [] }) : raspuns(400, { message: "At least one contact filter must be provided" }));
  const r = await M.lushaCauta("k", { nume: "Firma", domeniu: null }, f);
  assert.equal(r.ok, true);
  assert.deepEqual(r.date.candidati, []);
  assert.equal(r.date.cereri, 2);
});

test("Lusha: o eroare de cheie la prima treaptă rămâne eroare", async () => {
  const r = await M.lushaCauta("k", { nume: "Firma", domeniu: null }, async () => raspuns(401, { message: "invalid" }));
  assert.equal(r.ok, false);
  assert.equal(r.status, 401);
});

test("Lusha: o eroare de cheie la a doua treaptă rămâne eroare (nu se ascunde)", async () => {
  let apeluri = 0;
  const f = async () => (++apeluri === 1 ? raspuns(200, { requestId: "r1", data: [] }) : raspuns(403, { message: "forbidden" }));
  const r = await M.lushaCauta("k", { nume: "Firma", domeniu: null }, f);
  assert.equal(r.ok, false);
});

test("Prospeo: cu mobil cerut, numărul vine odată cu emailul; fără cerere nu se citește", async () => {
  const corpuri = [];
  const f = async (_url, init) => {
    corpuri.push(JSON.parse(init.body));
    return raspuns(200, { matched: [{ identifier: "p1", person: { person_id: "p1", email: { revealed: true, email: "a@firma.ro", status: "VERIFIED" }, mobile: { mobile_international: "+40721123456" } } }] });
  };
  const cu = await M.prospeoImbogateste("k", ["p1"], f, { mobil: true });
  assert.equal(corpuri[0].enrich_mobile, true);
  assert.deepEqual(cu.date.p1, { email: "a@firma.ro", verificat: true, telefon: "+40721123456" });
  const fara = await M.prospeoImbogateste("k", ["p1"], f);
  assert.equal(corpuri[1].enrich_mobile, false);
  assert.equal(fara.date.p1.telefon, "");
});

// ---- Orchestratorul ----
const adaptor = (jurnal, nume, rezultat, intarziere = 0) => async (firma) => {
  jurnal.push({ eveniment: "start", nume, domeniu: firma.domeniu });
  if (intarziere) await new Promise((r) => setTimeout(r, intarziere));
  jurnal.push({ eveniment: "sfarsit", nume });
  return rezultat;
};
const gasit = (...nume) => ({ ok: true, date: { candidati: nume.map((n) => ({ nume: n, rol: "CEO", dept: "", linkedin: "", email: "", emailStatus: null, sursa: "x" })), unitati: 1 } });
const intrare = (extra = {}) => ({ firma: { nume: "Firma", domeniu: null }, furnizori: ["apollo", "prospeo", "hunter", "lusha"], memorate: {}, mod: "deep", apeluriRamase: 50, ...extra });

test("Apollo rulează primul și află domeniul o singură dată; ceilalți pornesc abia după el, în paralel, cu domeniul aflat", async () => {
  const jurnal = [];
  let cereriDomeniu = 0;
  const a = {
    domeniu: async () => {
      cereriDomeniu++;
      jurnal.push({ eveniment: "domeniu" });
      return { ok: true, date: "firma.ro" };
    },
    cauta: {
      apollo: adaptor(jurnal, "apollo", gasit("Ion Popescu"), 20),
      prospeo: adaptor(jurnal, "prospeo", gasit("Ana Ionescu"), 30),
      hunter: adaptor(jurnal, "hunter", gasit("Dan Radu"), 30),
      lusha: adaptor(jurnal, "lusha", gasit(), 30),
    },
  };
  const r = await D.ruleazaCautare(intrare(), a);
  assert.equal(cereriDomeniu, 1);
  assert.equal(r.domeniu, "firma.ro");
  const idx = (ev, nume) => jurnal.findIndex((j) => j.eveniment === ev && j.nume === nume);
  assert.ok(idx("sfarsit", "apollo") < idx("start", "prospeo"), "Apollo se termină înainte să pornească Prospeo");
  assert.ok(idx("sfarsit", "apollo") < idx("start", "hunter"));
  assert.ok(idx("start", "lusha") < idx("sfarsit", "prospeo"), "ceilalți pornesc împreună, nu pe rând");
  assert.ok(jurnal.filter((j) => j.eveniment === "start").every((j) => j.domeniu === "firma.ro"));
  assert.deepEqual(r.stari.map((s) => [s.furnizor, s.gasiti]), [["apollo", 1], ["prospeo", 1], ["hunter", 1], ["lusha", 0]]);
});

test("cu site cunoscut, domeniul nu se mai caută", async () => {
  let cereriDomeniu = 0;
  const a = { domeniu: async () => (cereriDomeniu++, { ok: true, date: "altul.ro" }), cauta: { apollo: adaptor([], "apollo", gasit()) } };
  const r = await D.ruleazaCautare(intrare({ firma: { nume: "Firma", domeniu: "firma.ro" }, furnizori: ["apollo"] }), a);
  assert.equal(cereriDomeniu, 0);
  assert.equal(r.domeniu, "firma.ro");
});

test("un furnizor cu eroare nu le pierde pe celelalte; eroarea apare ca motiv exact", async () => {
  const a = {
    cauta: {
      apollo: adaptor([], "apollo", gasit("Ion Popescu")),
      prospeo: adaptor([], "prospeo", { ok: false, eroare: "Limita contului tău de la Prospeo a fost atinsă; încearcă mai târziu." }),
      lusha: adaptor([], "lusha", gasit("Ana Ionescu")),
    },
  };
  const r = await D.ruleazaCautare(intrare({ firma: { nume: "F", domeniu: "f.ro" }, furnizori: ["apollo", "prospeo", "lusha"] }), a);
  assert.equal(r.stari[1].eroare, "Limita contului tău de la Prospeo a fost atinsă; încearcă mai târziu.");
  assert.equal(r.brut.length, 2);
  assert.equal(r.apeluri.find((x) => x.furnizor === "prospeo").ok, false);
});

test("furnizorii căutați recent sunt „memorați”: nu se apelează și nu costă", async () => {
  const jurnal = [];
  const a = { cauta: { apollo: adaptor(jurnal, "apollo", gasit()), prospeo: adaptor(jurnal, "prospeo", gasit("Ana Ionescu")) } };
  const r = await D.ruleazaCautare(intrare({ firma: { nume: "F", domeniu: "f.ro" }, furnizori: ["apollo", "prospeo"], memorate: { apollo: 4 } }), a);
  assert.deepEqual(jurnal.filter((j) => j.eveniment === "start").map((j) => j.nume), ["prospeo"]);
  assert.deepEqual(r.stari[0], { furnizor: "apollo", gasiti: 4, memorat: true });
});

test("Hunter fără domeniu e sărit cu motiv, nu cu eroare tehnică", async () => {
  const a = { cauta: { hunter: adaptor([], "hunter", gasit("Dan Radu")) } };
  const r = await D.ruleazaCautare(intrare({ furnizori: ["hunter"] }), a);
  assert.equal(r.stari[0].eroare, D.MESAJ_HUNTER_FARA_SITE);
  assert.equal(r.brut.length, 0);
});

test("limita zilnică: furnizorii care nu mai încap primesc motivul, ceilalți merg", async () => {
  const a = { cauta: { apollo: adaptor([], "apollo", gasit()), prospeo: adaptor([], "prospeo", gasit()), lusha: adaptor([], "lusha", gasit()) } };
  const r = await D.ruleazaCautare(intrare({ firma: { nume: "F", domeniu: "f.ro" }, furnizori: ["apollo", "prospeo", "lusha"], apeluriRamase: 2 }), a);
  assert.equal(r.stari[0].eroare, undefined);
  assert.equal(r.stari[1].eroare, undefined);
  assert.equal(r.stari[2].eroare, D.MESAJ_LIMITA_APELURI); // Lusha costă 2
});

test("în lanț (economic): se oprește la primul furnizor care găsește", async () => {
  const jurnal = [];
  const a = { cauta: { apollo: adaptor(jurnal, "apollo", gasit()), prospeo: adaptor(jurnal, "prospeo", gasit("Ana Ionescu")), hunter: adaptor(jurnal, "hunter", gasit("Dan Radu")) } };
  const r = await D.ruleazaCautare(intrare({ firma: { nume: "F", domeniu: "f.ro" }, furnizori: ["apollo", "prospeo", "hunter"], mod: "lant" }), a);
  assert.deepEqual(jurnal.filter((j) => j.eveniment === "start").map((j) => j.nume), ["apollo", "prospeo"]);
  assert.deepEqual(r.stari.map((s) => s.furnizor), ["apollo", "prospeo"]);
});

test("în lanț: un furnizor memorat cu rezultate oprește lanțul fără apeluri", async () => {
  const jurnal = [];
  const a = { cauta: { apollo: adaptor(jurnal, "apollo", gasit()), prospeo: adaptor(jurnal, "prospeo", gasit("Ana Ionescu")) } };
  const r = await D.ruleazaCautare(intrare({ firma: { nume: "F", domeniu: "f.ro" }, furnizori: ["apollo", "prospeo"], memorate: { apollo: 3 }, mod: "lant" }), a);
  assert.equal(jurnal.length, 0);
  assert.equal(r.stari.length, 1);
});

test("în lanț: o eroare a unui furnizor nu oprește lanțul", async () => {
  const a = { cauta: { apollo: adaptor([], "apollo", { ok: false, eroare: "Apollo nu răspunde acum. Cheia ta nu a fost modificată; încearcă din nou peste câteva minute." }), prospeo: adaptor([], "prospeo", gasit("Ana Ionescu")) } };
  const r = await D.ruleazaCautare(intrare({ firma: { nume: "F", domeniu: "f.ro" }, furnizori: ["apollo", "prospeo"], mod: "lant" }), a);
  assert.equal(r.stari.length, 2);
  assert.equal(r.brut.length, 1);
});
