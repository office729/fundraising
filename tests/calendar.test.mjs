import { test } from "node:test";
import assert from "node:assert/strict";

const { adaugaZile, pasteOrtodox, givingTuesday, momenteCampanie, termeneFiscale, evenimenteStatice, grilaLuna, lunaDinParametru, lunaVecina, grupeazaPeZile } = await import("../src/lib/calendar-fundraising.ts");

test("Paștele ortodox, pe ani cunoscuți", () => {
  assert.equal(pasteOrtodox(2024), "2024-05-05");
  assert.equal(pasteOrtodox(2025), "2025-04-20");
  assert.equal(pasteOrtodox(2026), "2026-04-12");
  assert.equal(pasteOrtodox(2027), "2027-05-02");
});

test("Giving Tuesday: marțea de după Thanksgiving", () => {
  assert.equal(givingTuesday(2024), "2024-12-03");
  assert.equal(givingTuesday(2025), "2025-12-02");
  assert.equal(givingTuesday(2026), "2026-12-01");
});

test("adunarea de zile trece corect peste luni și ani", () => {
  assert.equal(adaugaZile("2026-12-30", 3), "2027-01-02");
  assert.equal(adaugaZile("2026-03-01", -1), "2026-02-28");
  assert.equal(adaugaZile("2028-02-28", 1), "2028-02-29");
});

test("grila lunii: săptămâni complete, luni–duminică", () => {
  const g = grilaLuna(2026, 10, "2026-10-14");
  // 1 octombrie 2026 e joi → grila începe luni, 28 septembrie
  assert.equal(g.de, "2026-09-28");
  assert.equal(g.saptamani.length, 5);
  assert.equal(g.pana, "2026-11-01");
  assert.ok(g.saptamani.every((s) => s.length === 7));
  assert.equal(g.saptamani[0][0].inLuna, false);
  assert.equal(g.saptamani[0][3].data, "2026-10-01");
  assert.equal(g.saptamani[0][3].inLuna, true);
  assert.equal(g.saptamani.flat().filter((z) => z.azi).length, 1);
  // februarie 2027 începe luni și are 28 de zile: exact patru săptămâni
  assert.equal(grilaLuna(2027, 2, "2027-02-10").saptamani.length, 4);
  // o lună de 6 rânduri
  assert.equal(grilaLuna(2026, 8, "2026-08-10").saptamani.length, 6);
});

test("parametrul lunii: valid se păstrează, restul cade pe luna curentă", () => {
  assert.deepEqual(lunaDinParametru("2026-03", "2026-10-14"), { an: 2026, luna: 3 });
  assert.deepEqual(lunaDinParametru("2026-13", "2026-10-14"), { an: 2026, luna: 10 });
  assert.deepEqual(lunaDinParametru("abc", "2026-10-14"), { an: 2026, luna: 10 });
  assert.deepEqual(lunaDinParametru(undefined, "2026-10-14"), { an: 2026, luna: 10 });
  assert.equal(lunaVecina(2026, 12, 1), "2027-01");
  assert.equal(lunaVecina(2026, 1, -1), "2025-12");
});

test("evenimentele fixe dintr-un interval, inclusiv peste sfârșit de an", () => {
  const e = evenimenteStatice("2026-11-30", "2027-01-05");
  const titluri = e.map((x) => x.titlu);
  assert.ok(titluri.includes("Giving Tuesday"));
  assert.ok(titluri.includes("Crăciunul"));
  assert.equal(e.every((x) => x.data >= "2026-11-30" && x.data <= "2027-01-05"), true);
  assert.equal(evenimenteStatice("2026-05-20", "2026-05-31").some((x) => x.tip === "fiscal" && x.data === "2026-05-25"), true);
  assert.equal(termeneFiscale(2026)[0].data, "2026-05-25");
  assert.equal(new Set(momenteCampanie(2026).map((x) => x.id)).size, momenteCampanie(2026).length);
});

test("grupare pe zile: ordonat, termenele înaintea momentelor", () => {
  const harta = grupeazaPeZile([
    { id: "1", data: "2026-12-01", titlu: "Giving Tuesday", tip: "moment", href: null, detaliu: null },
    { id: "2", data: "2026-12-01", titlu: "Apel X", tip: "grant", href: "/x", detaliu: null },
    { id: "3", data: "2026-11-20", titlu: "Alt apel", tip: "grant", href: null, detaliu: null },
  ]);
  assert.deepEqual([...harta.keys()], ["2026-11-20", "2026-12-01"]);
  assert.deepEqual(harta.get("2026-12-01").map((e) => e.tip), ["grant", "moment"]);
});
