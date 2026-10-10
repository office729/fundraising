import { test } from "node:test";
import assert from "node:assert/strict";

const { PRAG_BAZA, PRAG_MIN, construiesteAvatare, nivelIncredere, textFisa } = await import("../src/lib/avatar-donator/avatare-reale.ts");

const grup = (grup, nr, extra = {}) => ({
  grup, nr, suma: nr * 200, medianaTotal: 150, medieDonatii: 2.4, medianaRecentaZile: 90, medianaIntervalZile: 120, cuInterval: nr, cuEmail: Math.floor(nr / 2), dezabonati: 1,
  riscLuni: 0, inactivi: 0, proiecte: [{ titlu: "Campania A", donatori: 8 }, { titlu: "Campania B", donatori: 2 }], ...extra,
});
const baza = (donatori = 300) => ({ donatori, suma: 60000, medianaDonatie: 80, recurenti: 20, revenire: { valoare: 35, eligibili: 200 }, retentie12: { valoare: null, baza: 4 }, surse: [], ani: [] });

test("nivelul de încredere depinde de mărimea grupului; sub 10 nu există avatar", () => {
  assert.equal(nivelIncredere(9), null);
  assert.equal(nivelIncredere(PRAG_MIN), "scazut");
  assert.equal(nivelIncredere(29), "scazut");
  assert.equal(nivelIncredere(30), "mediu");
  assert.equal(nivelIncredere(99), "mediu");
  assert.equal(nivelIncredere(100), "ridicat");
});

test("avatarele apar doar pentru grupuri de cel puțin 10 donatori; grupurile mici sunt doar menționate", () => {
  const r = construiesteAvatare({ baza: baza(), grupuri: [grup("recurent", 120), grup("fidel", 40), grup("major", 6), grup("nou", 80), grup("pauza", 54, { riscLuni: 30, inactivi: 24 })], canaleIntroduse: false });
  assert.equal(r.suficient, true);
  assert.deepEqual(r.avatare.map((a) => a.id), ["recurent", "fidel", "nou", "pauza"]);
  assert.deepEqual(r.grupuriMici, [{ nume: "Contribuitorii mari", nr: 6 }]);
  assert.equal(r.avatare.find((a) => a.id === "recurent").incredere, "ridicat");
  assert.equal(r.avatare.find((a) => a.id === "fidel").incredere, "mediu");
});

test("o bază prea mică nu produce avatare", () => {
  const r = construiesteAvatare({ baza: baza(PRAG_BAZA - 1), grupuri: [grup("nou", 19)], canaleIntroduse: false });
  assert.equal(r.suficient, false);
  assert.equal(r.avatare.length, 0);
});

test("faptele, interpretarea și ipotezele sunt separate; motivele apar doar ca ipoteze", () => {
  const r = construiesteAvatare({ baza: baza(), grupuri: [grup("nou", 80)], canaleIntroduse: false });
  const a = r.avatare[0];
  assert.ok(a.fapte.length >= 4 && a.fapte.every((f) => /\d/.test(f)), "faptele conțin cifre");
  assert.ok(a.ipoteze.some((i) => /ipotez/i.test(i)));
  assert.ok(a.ipoteze.some((i) => i.includes("nu rezultă din datele de donație")));
  assert.ok(a.interpretare.length > 0 && a.recomandari.evitat.length > 0 && a.indicatori.length > 0 && a.dateSuplimentare.length > 0);
});

test("campaniile apar doar dacă au fost susținute de cel puțin 3 donatori din grup", () => {
  const r = construiesteAvatare({ baza: baza(), grupuri: [grup("fidel", 40)], canaleIntroduse: false });
  assert.deepEqual(r.avatare[0].campanii, [{ titlu: "Campania A", donatori: 8 }]);
});

test("sursele lipsă sunt declarate, nu presupuse; statisticile de canale sunt marcate ca introduse manual", () => {
  const fara = construiesteAvatare({ baza: baza(), grupuri: [grup("nou", 80)], canaleIntroduse: false });
  assert.equal(fara.surse.find((s) => s.eticheta.startsWith("Statistici canale")).stare, "lipsa");
  assert.equal(fara.surse.find((s) => s.eticheta.startsWith("Site")).stare, "lipsa");
  assert.equal(fara.surse.find((s) => s.eticheta.startsWith("Newslettere")).stare, "lipsa");
  const cu = construiesteAvatare({ baza: baza(), grupuri: [grup("nou", 80)], canaleIntroduse: true });
  assert.equal(cu.surse.find((s) => s.eticheta.startsWith("Statistici canale")).stare, "manual");
  assert.ok(cu.limitari.some((l) => l.includes("Corelația nu înseamnă cauzalitate")));
});

test("grupul „în pauză” arată câți sunt în risc și câți inactivi; fișa se poate exporta ca text", () => {
  const r = construiesteAvatare({ baza: baza(), grupuri: [grup("pauza", 54, { riscLuni: 30, inactivi: 24 })], canaleIntroduse: false });
  const a = r.avatare[0];
  assert.ok(a.fapte.some((f) => f.includes("30") && f.includes("24")));
  const text = textFisa(a);
  assert.ok(text.includes("Fapte observate") && text.includes("Ipoteze de validat") && text.includes("Indicatori de urmărit"));
});
