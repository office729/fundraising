import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";

const M = await import("../src/lib/inovare/model.ts");
const { INOVATII } = await import("../src/content/inovatii.ts");

test("propunerea: titlu, descriere și categorie validate; textele se curăță", () => {
  const ok = M.valideazaPropunere({ titlu: "  Raport   lunar pentru donatori ", descriere: "Vrem un raport lunar,\n\n\n\ntrimis automat.  ", categorie: "Donatori" });
  assert.equal(ok.ok, true);
  assert.equal(ok.date.titlu, "Raport lunar pentru donatori");
  assert.equal(ok.date.descriere, "Vrem un raport lunar,\n\ntrimis automat.");
  assert.equal(ok.date.afiseazaOrganizatia, true);
  assert.equal(M.valideazaPropunere({ titlu: "Scurt", descriere: "prea scurt", categorie: "Nimic" }).ok, false);
  const rau = M.valideazaPropunere({ titlu: "Scurt", descriere: "prea scurt", categorie: "Nimic" });
  assert.ok(rau.erori.titlu && rau.erori.descriere && rau.erori.categorie);
  assert.equal(M.valideazaPropunere({ titlu: "Un titlu suficient de lung", descriere: "x".repeat(5000), categorie: "Altele" }).date.descriere.length, M.LIMITE.descriereMax);
  assert.equal(M.valideazaPropunere({ titlu: "Un titlu suficient de lung", descriere: "x".repeat(30), categorie: "Altele", afiseazaOrganizatia: false }).date.afiseazaOrganizatia, false);
});

test("stările și categoriile: doar valorile cunoscute", () => {
  assert.deepEqual(M.STARI.map((s) => s.cheie), ["propus", "in_planificare", "in_dezvoltare", "finalizat", "nu_acum"]);
  assert.equal(M.esteStare("finalizat"), true);
  assert.equal(M.esteStare("sters"), false);
  assert.equal(M.esteCategorie("Formular 230"), true);
  assert.equal(M.esteCategorie("altceva"), false);
  assert.equal(M.esteEfort("mediu"), true);
  assert.equal(M.esteEfort("urias"), false);
});

test("ideile asemănătoare: același subiect cu alte cuvinte se găsește, subiecte diferite nu", () => {
  const existente = [
    { titlu: "Raport lunar automat pentru donatori" },
    { titlu: "Export al donațiilor în format contabil" },
    { titlu: "Aplicație mobilă pentru voluntari" },
  ];
  const g = M.ideiSimilare("Rapoarte lunare trimise donatorilor", existente);
  assert.equal(g[0]?.titlu, "Raport lunar automat pentru donatori");
  assert.deepEqual(M.ideiSimilare("Integrare cu Facebook Ads", existente), []);
  assert.deepEqual(M.ideiSimilare("Ab", existente), []);
  assert.equal(M.asemanare("Donații recurente", "donatii recurente lunare"), 1);
});

// ---------- „Ce am inovat”: formatul listei, verificat la fiecare rulare de teste ----------

test("noutăți: id unic, dată validă, cele mai noi primele, câmpuri completate", () => {
  assert.ok(INOVATII.length > 0);
  const ids = new Set();
  let precedenta = "9999-99-99";
  for (const i of INOVATII) {
    assert.ok(/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(i.id), `id invalid: ${i.id}`);
    assert.ok(!ids.has(i.id), `id duplicat: ${i.id}`);
    ids.add(i.id);
    assert.ok(i.id.startsWith(i.data), `id-ul trebuie să înceapă cu data: ${i.id}`);
    assert.ok(!Number.isNaN(new Date(`${i.data}T00:00:00Z`).getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(i.data), `dată invalidă: ${i.id}`);
    assert.ok(i.data <= precedenta, `ordine greșită (cele mai noi primele): ${i.id}`);
    precedenta = i.data;
    assert.ok(i.titlu.length >= 8 && i.titlu.length <= 110, `titlu: ${i.id}`);
    assert.ok(i.descriere.length >= 40 && i.descriere.length <= 420, `descriere (40–420 de caractere): ${i.id}`);
    assert.ok(i.categorie.length > 2, `categorie: ${i.id}`);
    assert.ok(["nou", "imbunatatire", "reparat"].includes(i.tip), `tip: ${i.id}`);
  }
});

test("noutăți: linkurile duc la pagini reale ale CRM", () => {
  const dir = new URL("../src/app/(app)/[orgSlug]/crm/", import.meta.url);
  const pagini = new Set(readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name));
  for (const i of INOVATII) if (i.link) assert.ok(pagini.has(i.link.split("/")[0]), `linkul „${i.link}” (${i.id}) nu există în CRM`);
});
