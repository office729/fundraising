import { test } from "node:test";
import assert from "node:assert/strict";

const A = await import("../src/lib/reclame/atribuire.ts");
const R = await import("../src/lib/reclame/raport.ts");

test("plasamentul din utm_source: fb/ig/an/msg ale Meta, gol pentru restul", () => {
  assert.equal(A.plasamentDinSursa("fb"), "facebook");
  assert.equal(A.plasamentDinSursa("Facebook"), "facebook");
  assert.equal(A.plasamentDinSursa("ig"), "instagram");
  assert.equal(A.plasamentDinSursa("an"), "audience_network");
  assert.equal(A.plasamentDinSursa("msg"), "messenger");
  assert.equal(A.plasamentDinSursa("tiktok"), "");
  assert.equal(A.plasamentDinSursa(null), "");
});

test("Facebook și Instagram sunt separate fără să dubleze totalul", () => {
  const costuri = [
    { platforma: "meta", plasament: "facebook", ziua: "2026-10-01", campanieCheie: "1", campanieNume: "C", costBani: 7_000, afisari: 100, clicuri: 5 },
    { platforma: "meta", plasament: "instagram", ziua: "2026-10-01", campanieCheie: "1", campanieNume: "C", costBani: 3_000, afisari: 50, clicuri: 2 },
  ];
  const donatii = [
    { ziua: "2026-10-01", plasament: "facebook", platforma: "meta", utmCampanie: "cmp_1", clasaDonator: "nou", n: 2, brutBani: 8_000, rambursatBani: 0 },
    { ziua: "2026-10-01", plasament: "instagram", platforma: "meta", utmCampanie: "cmp_1", clasaDonator: "nou", n: 1, brutBani: 2_000, rambursatBani: 0 },
    { ziua: "2026-10-01", plasament: "", platforma: "meta", utmCampanie: "cmp_1", clasaDonator: "necl", n: 1, brutBani: 1_000, rambursatBani: 0 },
  ];
  const r = R.asambleaza({ de: "2026-10-01", pana: "2026-10-01", costuri, donatii, legaturi: [{ platforma: "meta", campanieCheie: "1", campanieNume: "C", utmCampanie: "cmp_1" }], etichetePlatforme: { meta: "Meta" } });
  assert.equal(r.totaluri.cheltuieliBani, 10_000);
  assert.equal(r.totaluri.donatii, 4);
  assert.equal(r.pePlatforma.length, 1);
  assert.equal(r.pePlatforma[0].totaluri.cheltuieliBani, 10_000);
  const fb = r.pePlasament.find((p) => p.eticheta === "Facebook");
  const ig = r.pePlasament.find((p) => p.eticheta === "Instagram");
  const necunoscut = r.pePlasament.find((p) => p.eticheta === "Plasament nespecificat");
  assert.deepEqual([fb.totaluri.cheltuieliBani, fb.totaluri.donatii], [7_000, 2]);
  assert.deepEqual([ig.totaluri.cheltuieliBani, ig.totaluri.donatii], [3_000, 1]);
  assert.deepEqual([necunoscut.totaluri.cheltuieliBani, necunoscut.totaluri.donatii], [0, 1]);
  // suma pe plasamente = totalul, nu mai mult
  assert.equal(r.pePlasament.reduce((s, p) => s + p.totaluri.cheltuieliBani, 0), r.totaluri.cheltuieliBani);
  assert.equal(r.pePlasament.reduce((s, p) => s + p.totaluri.donatii, 0), r.totaluri.donatii);
});
