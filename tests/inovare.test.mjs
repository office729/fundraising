import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";

const M = await import("../src/lib/inovare/model.ts");
const { INOVATII } = await import("../src/content/inovatii.ts");

const BAZA = { titlu: "Raport lunar pentru donatori", descriere: "Vrem un raport lunar,\n\n\n\ntrimis automat.  ", obiectiv: "retentie", frecventa: "lunar" };

test("propunerea: titlu, descriere, obiectiv și frecvență validate; textele se curăță", () => {
  const ok = M.valideazaPropunere({ ...BAZA, titlu: "  Raport   lunar pentru donatori ", categorie: "Donatori" });
  assert.equal(ok.ok, true);
  assert.equal(ok.date.titlu, "Raport lunar pentru donatori");
  assert.equal(ok.date.descriere, "Vrem un raport lunar,\n\ntrimis automat.");
  assert.equal(ok.date.afiseazaOrganizatia, true);
  assert.equal(ok.date.obiectiv, "retentie");
  const rau = M.valideazaPropunere({ titlu: "Scurt", descriere: "prea scurt", categorie: "Nimic" });
  assert.equal(rau.ok, false);
  assert.ok(rau.erori.titlu && rau.erori.descriere && rau.erori.categorie && rau.erori.obiectiv && rau.erori.frecventa);
  assert.equal(M.valideazaPropunere({ ...BAZA, titlu: "Un titlu suficient de lung", descriere: "x".repeat(5000) }).date.descriere.length, M.LIMITE.descriereMax);
  assert.equal(M.valideazaPropunere({ ...BAZA, descriere: "x".repeat(30), afiseazaOrganizatia: false }).date.afiseazaOrganizatia, false);
});

test("categoria e opțională și devine „Alt subiect”; „Altele” (veche) nu se mai acceptă la idei noi", () => {
  assert.equal(M.valideazaPropunere({ ...BAZA, categorie: "" }).date.categorie, "Alt subiect");
  assert.equal(M.valideazaPropunere({ ...BAZA }).date.categorie, "Alt subiect");
  assert.equal(M.valideazaPropunere({ ...BAZA, categorie: "Altele" }).ok, false);
  assert.equal(M.esteCategorie("Altele"), true); // ideile vechi rămân valide pentru echipă
  assert.equal(M.esteCategorie("Recurență și retenție"), true);
  assert.equal(M.esteCategorie("Campanii de caz"), true);
  assert.equal(M.esteCategorie("Conformitate și termene fiscale"), true);
});

test("date personale în text: email, telefon și CNP sunt respinse; textul obișnuit trece", () => {
  assert.equal(M.datePersonaleInText("scrie-mi la ana.popescu@exemplu.ro"), "email");
  assert.equal(M.datePersonaleInText("sună la 0722 123 456 sau 0722123456"), "telefon");
  assert.equal(M.datePersonaleInText("tel +40 722 123 456"), "telefon");
  assert.equal(M.datePersonaleInText("CNP 1850101123456 al donatorului"), "cnp");
  assert.equal(M.datePersonaleInText("CNP 1 850 101 123 456"), "cnp");
  assert.equal(M.datePersonaleInText("Strângem 5000 de lei din 230 de formulare în 2025, 3,5% din impozit"), null);
  assert.equal(M.datePersonaleInText("Raport lunar pentru 120 de donatori recurenți"), null);
  for (const camp of ["titlu", "descriere", "cumFaciAcum"]) {
    const v = M.valideazaPropunere({ ...BAZA, descriere: "Descriere suficient de lungă pentru ideea noastră", [camp]: camp === "titlu" ? "Scrieți la mihai@ong.ro pentru raport" : "Sunați 0733 555 666 ca să vă explicăm" });
    assert.equal(v.ok, false, camp);
    assert.ok(v.erori[camp], camp);
  }
});

test("stările, obiectivele și frecvențele: doar valorile cunoscute", () => {
  assert.deepEqual(M.STARI.map((s) => s.cheie), ["propus", "vazuta", "in_planificare", "in_dezvoltare", "finalizat", "nu_acum"]);
  assert.equal(M.esteStare("finalizat"), true);
  assert.equal(M.esteStare("vazuta"), true);
  assert.equal(M.esteStare("sters"), false);
  assert.equal(M.esteCategorie("Formular 230"), true);
  assert.equal(M.esteCategorie("altceva"), false);
  assert.equal(M.esteEfort("mediu"), true);
  assert.equal(M.esteEfort("urias"), false);
  assert.equal(M.esteObiectiv("formular_230"), true);
  assert.equal(M.esteObiectiv("bani"), false);
  assert.equal(M.esteFrecventa("saptamanal"), true);
  assert.equal(M.esteFrecventa("mereu"), false);
});

test("scorul de prioritate: voturi × potrivire ÷ efort; efortul neevaluat = mediu", () => {
  assert.equal(M.scorPrioritate({ voturi: 6, obiectiv: "formular_230", efort: "scazut" }), 18);
  assert.equal(M.scorPrioritate({ voturi: 6, obiectiv: "retentie", efort: "mediu" }), 6);
  assert.equal(M.scorPrioritate({ voturi: 6, obiectiv: "timp", efort: "mare" }), 1.5);
  assert.equal(M.scorPrioritate({ voturi: 4, obiectiv: "d177_sponsorizari", efort: null }), 6);
  assert.equal(M.scorPrioritate({ voturi: 4, obiectiv: null, efort: "" }), 2); // idee veche, fără obiectiv: potrivire 1
  // O idee mică, cerută de 3 organizații, o depășește pe una mare cerută de 5, fără legătură cu fundraising-ul
  assert.ok(M.scorPrioritate({ voturi: 3, obiectiv: "donatii_recurente", efort: "scazut" }) > M.scorPrioritate({ voturi: 5, obiectiv: "alt", efort: "mare" }));
  assert.equal(M.esteVictorieRapida({ voturi: 3, efort: "scazut" }), true);
  assert.equal(M.esteVictorieRapida({ voturi: 2, efort: "scazut" }), false);
  assert.equal(M.esteVictorieRapida({ voturi: 9, efort: "mediu" }), false);
});

test("zile lucrătoare și mediană", () => {
  // vineri 2026-10-30 -> luni 2026-11-02 = 1 zi lucrătoare; vineri -> vineri următoare = 5
  assert.equal(M.zileLucratoareIntre(new Date("2026-10-30T10:00:00Z"), new Date("2026-11-02T08:00:00Z")), 1);
  assert.equal(M.zileLucratoareIntre(new Date("2026-10-30T10:00:00Z"), new Date("2026-11-06T08:00:00Z")), 5);
  assert.equal(M.zileLucratoareIntre(new Date("2026-10-31T10:00:00Z"), new Date("2026-11-01T08:00:00Z")), 0); // sâmbătă -> duminică
  assert.equal(M.zileLucratoareIntre(new Date("2026-11-06T10:00:00Z"), new Date("2026-10-30T08:00:00Z")), 0);
  assert.equal(M.mediana([]), null);
  assert.equal(M.mediana([3]), 3);
  assert.equal(M.mediana([5, 1, 3]), 3);
  assert.equal(M.mediana([1, 2, 3, 10]), 2.5);
});

test("indicatori pentru echipă: fără răspuns, mediană, decizii întârziate, revizuiri, livrare", () => {
  const acum = new Date("2026-12-15T10:00:00Z");
  const idee = (o) => ({ stare: "propus", ascunsa: false, voturi: 1, creatLa: "2026-12-14T10:00:00Z", actualizatLa: "2026-12-14T10:00:00Z", primulRaspunsLa: null, finalizatLa: null, reevaluareLa: null, ...o });
  const ind = M.indicatoriInovare(
    [
      idee({}), // propusă ieri, în termen
      idee({ creatLa: "2026-12-01T10:00:00Z" }), // fără răspuns de >5 zile lucrătoare
      idee({ ascunsa: true, creatLa: "2026-11-01T10:00:00Z" }), // ascunsă: nu contează
      idee({ stare: "vazuta", voturi: 6, creatLa: "2026-10-01T10:00:00Z", primulRaspunsLa: "2026-10-02T10:00:00Z" }), // decizie întârziată, răspuns în 1 zi
      idee({ stare: "in_planificare", actualizatLa: "2026-08-01T10:00:00Z", creatLa: "2026-07-01T10:00:00Z", primulRaspunsLa: "2026-07-20T10:00:00Z" }), // de revizuit; răspuns lent
      idee({ stare: "nu_acum", reevaluareLa: "2026-12-01", creatLa: "2026-09-01T10:00:00Z", primulRaspunsLa: "2026-09-03T10:00:00Z" }), // de reevaluat
      idee({ stare: "finalizat", voturi: 8, creatLa: "2026-03-01T10:00:00Z", primulRaspunsLa: "2026-03-02T10:00:00Z" }), // livrată
      idee({ stare: "propus", voturi: 7, creatLa: "2026-03-05T10:00:00Z", primulRaspunsLa: "2026-03-06T10:00:00Z" }), // ≥5 voturi, veche de 6 luni, nelivrată
    ],
    acum,
  );
  assert.equal(ind.active, 7);
  assert.equal(ind.faraRaspuns, 2);
  assert.equal(ind.faraRaspunsDepasit, 1);
  assert.equal(ind.deRevizuit, 1);
  assert.equal(ind.deReevaluat, 1);
  assert.equal(ind.deciziePeste30, 2); // „vazuta" din octombrie + „propus" din martie, ambele cu ≥5 voturi
  assert.equal(ind.rataLivrare, 50);
  assert.equal(ind.medianaPrimRaspuns, 1);
  assert.equal(ind.inTermenPrimRaspuns, 80); // 4 din 5 cu răspuns în ≤5 zile lucrătoare (cea din iulie nu)
  const gol = M.indicatoriInovare([], acum);
  assert.equal(gol.medianaPrimRaspuns, null);
  assert.equal(gol.rataLivrare, null);
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
    if (i.ideeId) assert.ok(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(i.ideeId), `ideeId trebuie să fie un UUID: ${i.id}`);
    if (i.cumFolosesti) assert.ok(i.cumFolosesti.length >= 25 && i.cumFolosesti.length <= 220, `cumFolosesti (25–220 de caractere): ${i.id}`);
  }
});

test("noutăți: linkurile duc la pagini reale ale CRM", () => {
  const dir = new URL("../src/app/(app)/[orgSlug]/crm/", import.meta.url);
  const pagini = new Set(readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name));
  for (const i of INOVATII) if (i.link) assert.ok(pagini.has(i.link.split("/")[0]), `linkul „${i.link}” (${i.id}) nu există în CRM`);
});
