import { test } from "node:test";
import assert from "node:assert/strict";

const K = await import("../src/lib/campuri-personalizate.ts");

const def = (tip, extra = {}) => ({ entitate: "donator", cheie: "camp", eticheta: "Câmp", tip, optiuni: [], ...extra });

test("cheia din etichetă: fără diacritice, cu „_”, fără început de cifră, tăiată", () => {
  assert.equal(K.cheieDinEticheta("Data nașterii"), "data_nasterii");
  assert.equal(K.cheieDinEticheta("  Cum ne-a găsit?  "), "cum_ne_a_gasit");
  assert.equal(K.cheieDinEticheta("2026 – Participă la gală"), "c_2026_participa_la_gala");
  assert.equal(K.cheieDinEticheta("!!!"), "");
  assert.equal(K.cheieDinEticheta("a".repeat(80)).length, 40);
  assert.match(K.cheieDinEticheta("Tip de donator (A/B)"), K.RE_CHEIE_CAMP);
});

test("definiția: eticheta, tipul și variantele sunt validate; cheia se generează", () => {
  const ok = K.valideazaDefinitie({ entitate: "donator", eticheta: "  Data   nașterii ", tip: "data" });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.def, { entitate: "donator", cheie: "data_nasterii", eticheta: "Data nașterii", tip: "data", optiuni: [] });
  assert.equal(K.valideazaDefinitie({ entitate: "x", eticheta: "A", tip: "text" }).ok, false);
  assert.equal(K.valideazaDefinitie({ entitate: "donator", eticheta: "", tip: "text" }).ok, false);
  assert.equal(K.valideazaDefinitie({ entitate: "donator", eticheta: "???", tip: "text" }).ok, false);
  assert.equal(K.valideazaDefinitie({ entitate: "donator", eticheta: "x".repeat(61), tip: "text" }).ok, false);
  assert.equal(K.valideazaDefinitie({ entitate: "donator", eticheta: "A", tip: "zzz" }).ok, false);
  // alegere: variante curate, unice, între 2 și 20
  const alegere = K.valideazaDefinitie({ entitate: "companie", eticheta: "Canal", tip: "alegere", optiuni: " Telefon ;Email\nTelefon\n\n Eveniment " });
  assert.equal(alegere.ok, true);
  assert.deepEqual(alegere.def.optiuni, ["Telefon", "Email", "Eveniment"]);
  assert.equal(K.valideazaDefinitie({ entitate: "companie", eticheta: "Canal", tip: "alegere", optiuni: ["Una"] }).ok, false);
  assert.equal(K.valideazaDefinitie({ entitate: "companie", eticheta: "Canal", tip: "alegere", optiuni: Array.from({ length: 21 }, (_, i) => "v" + i) }).ok, false);
  assert.equal(K.valideazaDefinitie({ entitate: "companie", eticheta: "Canal", tip: "alegere", optiuni: ["a", "b".repeat(61)] }).ok, false);
  // variantele se ignoră la alte tipuri
  assert.deepEqual(K.valideazaDefinitie({ entitate: "donator", eticheta: "N", tip: "numar", optiuni: ["a", "b"] }).def.optiuni, []);
});

test("valorile se aduc la tip: text, număr (cu virgulă), dată reală, alegere din listă, da/nu", () => {
  assert.deepEqual(K.curataValoare(def("text"), "  salut\r\nlume "), { ok: true, valoare: "salut\nlume" });
  assert.equal(K.curataValoare(def("text"), "x".repeat(501)).ok, false);
  assert.deepEqual(K.curataValoare(def("numar"), "1 250,5"), { ok: true, valoare: 1250.5 });
  assert.deepEqual(K.curataValoare(def("numar"), 7), { ok: true, valoare: 7 });
  assert.equal(K.curataValoare(def("numar"), "abc").ok, false);
  assert.equal(K.curataValoare(def("numar"), "1e15").ok, false);
  assert.equal(K.curataValoare(def("numar"), Infinity).ok, false);
  assert.deepEqual(K.curataValoare(def("data"), "2026-10-26"), { ok: true, valoare: "2026-10-26" });
  assert.equal(K.curataValoare(def("data"), "2026-02-30").ok, false, "30 februarie nu există");
  assert.equal(K.curataValoare(def("data"), "26.10.2026").ok, false);
  assert.deepEqual(K.curataValoare(def("alegere", { optiuni: ["A", "B"] }), "B"), { ok: true, valoare: "B" });
  assert.equal(K.curataValoare(def("alegere", { optiuni: ["A", "B"] }), "C").ok, false);
  for (const da of [true, "da", "true", 1]) assert.deepEqual(K.curataValoare(def("da_nu"), da), { ok: true, valoare: true });
  for (const nu of [false, "nu", "false", 0]) assert.deepEqual(K.curataValoare(def("da_nu"), nu), { ok: true, valoare: false });
  assert.equal(K.curataValoare(def("da_nu"), "poate").ok, false);
  // gol = se șterge
  for (const gol of [null, undefined, "", "   "]) assert.deepEqual(K.curataValoare(def("text"), gol), { ok: true, valoare: null });
});

test("valorile trimise față de definiții: cheile necunoscute sau arhivate se ignoră, golul șterge, erorile se raportează pe câmp", () => {
  const defs = [
    { ...def("text"), cheie: "nota" },
    { ...def("numar"), cheie: "buget" },
    { ...def("da_nu"), cheie: "voluntar" },
    { ...def("text"), cheie: "vechi", activ: false },
  ];
  const r = K.curataValori(defs, { nota: " ok ", buget: "abc", voluntar: "", vechi: "nu se atinge", inventat: "x", __proto__: undefined });
  assert.deepEqual(r.de_pus, { nota: "ok" });
  assert.deepEqual(r.de_sters, ["voluntar"]);
  assert.deepEqual(Object.keys(r.erori), ["buget"]);
  assert.deepEqual(r.necunoscute.sort(), ["inventat", "vechi"]);
  // câmpurile netrimise rămân neatinse (nici puse, nici șterse)
  const partial = K.curataValori(defs, { nota: "doar asta" });
  assert.deepEqual(partial.de_pus, { nota: "doar asta" });
  assert.deepEqual(partial.de_sters, []);
});

test("jsonb din baza de date: doar obiect simplu cu valori simple", () => {
  assert.deepEqual(K.valoriDinJson({ a: "x", b: 2, c: true, d: { x: 1 }, e: [1], f: null }), { a: "x", b: 2, c: true });
  assert.deepEqual(K.valoriDinJson(null), {});
  assert.deepEqual(K.valoriDinJson([1, 2]), {});
  assert.deepEqual(K.valoriDinJson("text"), {});
});

test("afișare: Da/Nu, data în română, număr cu separator, gol rămâne gol", () => {
  assert.equal(K.formateazaValoare({ tip: "da_nu" }, true), "Da");
  assert.equal(K.formateazaValoare({ tip: "da_nu" }, false), "Nu");
  assert.equal(K.formateazaValoare({ tip: "data" }, "2026-10-26"), "26.10.2026");
  assert.match(K.formateazaValoare({ tip: "numar" }, 12500), /12\.500|12500|12 500/);
  assert.equal(K.formateazaValoare({ tip: "text" }, undefined), "");
  assert.equal(K.formateazaValoare({ tip: "text" }, "abc"), "abc");
});

test("limita de câmpuri pe entitate", () => {
  assert.equal(K.maiPoateAdauga(19), true);
  assert.equal(K.maiPoateAdauga(20), false);
});
