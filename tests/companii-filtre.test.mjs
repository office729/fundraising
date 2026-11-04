import { test } from "node:test";
import assert from "node:assert/strict";

const F = await import("../src/app/(app)/[orgSlug]/crm/companii/lib/filtre-extra.ts");

const sp = (qs) => new URLSearchParams(qs);
const baza = { perioadaTip: "toate", judet: "toate", contact: "toate", functie: [], functieText: "", banda: "", ordine: "", eligibil: false, sprint: false, cald: false, imbogatit: false, vezi: "toata" };

test("parserul citește contact, sponsor, waalaxy și deep din adresă", () => {
  assert.deepEqual(F.parseFiltreExtra(sp("")), { contact: "toate", sponsor: "", waalaxy: "", deep: false });
  assert.deepEqual(F.parseFiltreExtra(sp("contact=ai&sponsori=1&waalaxy=trimise&deep=1")), { contact: "ai", sponsor: "da", waalaxy: "trimise", deep: true });
  assert.equal(F.parseFiltreExtra(sp("nesponsori=1")).sponsor, "nu");
});

test("valorile necunoscute se ignoră (listă albă)", () => {
  assert.deepEqual(F.parseFiltreExtra(sp("contact=oricine&waalaxy=toate&deep=2&sponsori=0")), { contact: "toate", sponsor: "", waalaxy: "", deep: false });
});

test("„Sponsorii noștri” și „Nu sunt sponsori” se exclud: dacă vin amândouă, rămân sponsorii", () => {
  assert.equal(F.parseFiltreExtra(sp("sponsori=1&nesponsori=1")).sponsor, "da");
  assert.deepEqual(F.parametriSponsor("da"), { sponsori: "1", nesponsori: null });
  assert.deepEqual(F.parametriSponsor("nu"), { sponsori: null, nesponsori: "1" });
  assert.deepEqual(F.parametriSponsor(""), { sponsori: null, nesponsori: null });
});

test("Waalaxy e doar pentru administrator", () => {
  assert.equal(F.waalaxyPermis("trimise", true), "trimise");
  assert.equal(F.waalaxyPermis("trimise", false), "");
});

test("fără filtre active nu apare nicio etichetă", () => {
  assert.deepEqual(F.filtreActive(baza), []);
});

test("„Doar firme lucrate” apare ca etichetă și se scoate cu vezi=null", () => {
  const e = F.filtreActive({ ...baza, vezi: "lucrate" });
  assert.deepEqual(e, [{ id: "lucrate", scoate: { vezi: null } }]);
});

test("etichetele pentru județ, funcție, perioadă și benzi au parametrii lor de scos", () => {
  const e = F.filtreActive({ ...baza, judet: "Cluj", functie: ["financiar"], functieText: "director", perioadaTip: "luna", banda: "A", eligibil: true });
  assert.deepEqual(e.map((x) => x.id), ["perioada", "judet", "functie", "banda", "eligibil"]);
  assert.deepEqual(e.find((x) => x.id === "functie").scoate, { functie: [], functieq: null });
  assert.equal(e.find((x) => x.id === "functie").valoare, "financiar, director");
  assert.ok("luna" in e.find((x) => x.id === "perioada").scoate);
});

test("ultima listă: se păstrează doar parametrii cunoscuți, fără goluri și fără r=1", () => {
  assert.equal(F.curataQsLista("vezi=lucrate&r=1&x=ceva&q="), "vezi=lucrate");
  assert.equal(F.curataQsLista("?judet=Cluj&marcaj=d177&marcaj=caz&pagina=3"), "judet=Cluj&marcaj=d177&marcaj=caz&pagina=3");
  assert.equal(F.curataQsLista("r=1"), "");
  assert.equal(F.curataQsLista(""), "");
  assert.equal(F.curataQsLista("redirect=https://rau.ro&vezi=lucrate"), "vezi=lucrate");
});

test("ultima listă: un șir prea lung nu se memorează", () => {
  assert.equal(F.curataQsLista("q=" + "a".repeat(100) + "&judet=" + "b".repeat(100) + "&functieq=" + "c".repeat(100) + "&functie=" + "d".repeat(100) + "&marcaj=" + "e".repeat(100) + "&vezi=x"), "");
});

test("cheia numerelor include organizația și ignoră pagina, sortarea și Top", () => {
  const f = { q: "ab", vezi: "toata", contact: "cu", pagina: 4, top: true, ordine: "contactabilitate" };
  const a = F.cheieNumere("org-1", "u1", f, false);
  assert.equal(a, F.cheieNumere("org-1", "u2", { ...f, pagina: 1, top: false, ordine: "" }, false));
  assert.notEqual(a, F.cheieNumere("org-2", "u1", f, false));
  assert.notEqual(a, F.cheieNumere("org-1", "u1", { ...f, contact: "fara" }, false));
  assert.notEqual(a, F.cheieNumere("org-1", "u1", f, true));
});

test("„Lucrate recent” depinde de coleg: cheia primește utilizatorul", () => {
  const f = { vezi: "recente" };
  assert.notEqual(F.cheieNumere("o", "u1", f, false), F.cheieNumere("o", "u2", f, false));
});

test("ordinea cheilor din filtre nu schimbă cheia numerelor", () => {
  assert.equal(F.cheieNumere("o", "u", { a: 1, b: 2 }, false), F.cheieNumere("o", "u", { b: 2, a: 1 }, false));
});

test("memoria: valoarea expiră după 2 minute și plafonul scoate intrările vechi", () => {
  let t = 1000;
  const m = F.creeazaMemorie({ ttlMs: F.TTL_NUMERE_MS, max: 2, acum: () => t });
  m.scrie("a", 1);
  assert.equal(m.citeste("a"), 1);
  t += F.TTL_NUMERE_MS - 1;
  assert.equal(m.citeste("a"), 1);
  t += 1;
  assert.equal(m.citeste("a"), undefined);
  m.scrie("x", 1);
  m.scrie("y", 2);
  m.scrie("z", 3);
  assert.equal(m.size, 2);
  assert.equal(m.citeste("x"), undefined);
  assert.equal(m.citeste("z"), 3);
});

test("limita de timp: dacă interogarea durează, rezultatul e null, iar la final tot ajunge în memorie", async () => {
  let scris = null;
  const lenta = new Promise((r) => setTimeout(() => r(42), 60));
  const r = await F.cuLimita(lenta, 10, { laSfarsit: (v) => (scris = v) });
  assert.equal(r, null);
  await new Promise((r2) => setTimeout(r2, 80));
  assert.equal(scris, 42);
});

test("limita de timp: o interogare rapidă întoarce valoarea; o eroare întoarce null și se raportează", async () => {
  assert.equal(await F.cuLimita(Promise.resolve(7), 50), 7);
  let eroare = null;
  assert.equal(await F.cuLimita(Promise.reject(new Error("pică")), 50, { laEroare: (e) => (eroare = e) }), null);
  assert.equal(eroare.message, "pică");
});
