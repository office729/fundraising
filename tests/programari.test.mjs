import { test } from "node:test";
import assert from "node:assert/strict";

const S = await import("../src/lib/programari/sloturi.ts");

const cfg = { pasMin: 30, pauzaMin: 0, preavizOre: 0, orizontZile: 60, maxPePezi: 0 };
const luni_vineri = [1, 2, 3, 4, 5].map((zi) => ({ zi, de: "10:00", pana: "12:00" }));
const baza = { durataMin: 30, config: cfg, saptamanal: luni_vineri, exceptii: [], ocupate: [], acum: new Date("2026-10-01T00:00:00Z") };

test("ora României -> UTC, cu ora de vară (octombrie 2026: schimbarea e pe 25)", () => {
  assert.equal(S.localLaUtc("2026-10-24", "10:00").toISOString(), "2026-10-24T07:00:00.000Z"); // EEST, +3
  assert.equal(S.localLaUtc("2026-10-26", "10:00").toISOString(), "2026-10-26T08:00:00.000Z"); // EET, +2
  assert.equal(S.localLaUtc("2026-07-01", "00:30").toISOString(), "2026-06-30T21:30:00.000Z");
});

test("golul de la trecerea la ora de vară nu are sloturi (29 martie 2026, 03:00–04:00 nu există)", () => {
  assert.equal(S.localLaUtc("2026-03-29", "03:30"), null);
  assert.equal(S.localLaUtc("2026-03-29", "04:00").toISOString(), "2026-03-29T01:00:00.000Z");
  assert.equal(S.localLaUtc("2026-03-28", "03:30").toISOString(), "2026-03-28T01:30:00.000Z");
});

test("data și ora locale dintr-un moment UTC", () => {
  assert.deepEqual(S.localDinUtc(new Date("2026-10-24T21:30:00Z")), { data: "2026-10-25", ora: "00:30" });
  assert.deepEqual(S.localDinUtc(new Date("2026-10-26T08:00:00Z")), { data: "2026-10-26", ora: "10:00" });
});

test("zi a săptămânii: luni = 1, duminică = 7", () => {
  assert.equal(S.ziSaptamana("2026-10-26"), 1);
  assert.equal(S.ziSaptamana("2026-10-31"), 6);
  assert.equal(S.ziSaptamana("2026-11-01"), 7);
});

test("sloturi pe o zi lucrătoare: 10:00–12:00, pas 30, durată 30 -> 4 sloturi", () => {
  const s = S.sloturiPeZi({ ...baza, data: "2026-11-02" }); // luni
  assert.deepEqual(s.map((x) => x.ora), ["10:00", "10:30", "11:00", "11:30"]);
  assert.equal(s[0].startUtc, "2026-11-02T08:00:00.000Z");
});

test("weekend fără program: niciun slot", () => {
  assert.deepEqual(S.sloturiPeZi({ ...baza, data: "2026-11-01" }), []);
});

test("durata mai mare scade numărul de sloturi (60 min -> 3)", () => {
  const s = S.sloturiPeZi({ ...baza, durataMin: 60, data: "2026-11-02" });
  assert.deepEqual(s.map((x) => x.ora), ["10:00", "10:30", "11:00"]);
});

test("o programare ocupă sloturile care se suprapun; pauza dintre întâlniri se respectă", () => {
  const ocupate = [{ start: new Date("2026-11-02T08:30:00Z"), sfarsit: new Date("2026-11-02T09:00:00Z") }]; // 10:30–11:00
  const fara = S.sloturiPeZi({ ...baza, data: "2026-11-02", ocupate });
  assert.deepEqual(fara.map((x) => x.ora), ["10:00", "11:00", "11:30"]);
  const cuPauza = S.sloturiPeZi({ ...baza, config: { ...cfg, pauzaMin: 15 }, data: "2026-11-02", ocupate });
  assert.deepEqual(cuPauza.map((x) => x.ora), ["11:30"]);
});

test("excepția „liber” închide ziua; „program” înlocuiește programul săptămânal", () => {
  assert.deepEqual(S.sloturiPeZi({ ...baza, data: "2026-11-02", exceptii: [{ data: "2026-11-02", tip: "liber" }] }), []);
  const sp = S.sloturiPeZi({ ...baza, data: "2026-11-01", exceptii: [{ data: "2026-11-01", tip: "program", de: "14:00", pana: "15:00" }] }); // duminică, normal închis
  assert.deepEqual(sp.map((x) => x.ora), ["14:00", "14:30"]);
});

test("preavizul și orizontul taie sloturile prea apropiate sau prea îndepărtate", () => {
  const acum = new Date("2026-11-02T07:00:00Z"); // 09:00 local
  const cuPreaviz = S.sloturiPeZi({ ...baza, acum, config: { ...cfg, preavizOre: 2 }, data: "2026-11-02" }); // minim 11:00 local
  assert.deepEqual(cuPreaviz.map((x) => x.ora), ["11:00", "11:30"]);
  assert.deepEqual(S.sloturiPeZi({ ...baza, acum, config: { ...cfg, orizontZile: 3 }, data: "2026-11-09" }), []);
});

test("plafonul zilnic: peste maxPePezi nu mai există sloturi în ziua respectivă", () => {
  const ocupate = [{ start: new Date("2026-11-02T08:00:00Z"), sfarsit: new Date("2026-11-02T08:30:00Z") }];
  assert.deepEqual(S.sloturiPeZi({ ...baza, config: { ...cfg, maxPePezi: 1 }, data: "2026-11-02", ocupate }), []);
  assert.equal(S.sloturiPeZi({ ...baza, config: { ...cfg, maxPePezi: 2 }, data: "2026-11-02", ocupate }).length, 3);
});

test("mai multe intervale pe zi (dimineața și după-amiaza)", () => {
  const sapt = [{ zi: 2, de: "09:00", pana: "10:00" }, { zi: 2, de: "15:00", pana: "16:00" }];
  const s = S.sloturiPeZi({ ...baza, saptamanal: sapt, data: "2026-11-03" }); // marți
  assert.deepEqual(s.map((x) => x.ora), ["09:00", "09:30", "15:00", "15:30"]);
});

test("zilele disponibile ale lunii: doar zilele lucrătoare, fără cele libere", () => {
  const zile = S.zileDisponibileInLuna({ ...baza, an: 2026, luna: 11, exceptii: [{ data: "2026-11-03", tip: "liber" }] });
  assert.ok(zile.includes("2026-11-02") && !zile.includes("2026-11-03") && !zile.includes("2026-11-01") && !zile.includes("2026-11-07"));
  assert.equal(zile.length, 19); // 21 de zile lucrătoare, minus ziua liberă (3), minus 30 noiembrie (în afara orizontului de 60 de zile)
});

test("un moment ales e valid doar dacă e exact un slot liber", () => {
  const p = { ...baza };
  assert.equal(S.esteSlotValid(new Date("2026-11-02T08:00:00Z"), p), true);
  assert.equal(S.esteSlotValid(new Date("2026-11-02T08:10:00Z"), p), false); // nu e pe pas
  assert.equal(S.esteSlotValid(new Date("2026-11-02T15:00:00Z"), p), false); // în afara programului
  assert.equal(S.esteSlotValid(new Date("2026-11-02T08:00:00Z"), { ...p, ocupate: [{ start: new Date("2026-11-02T08:00:00Z"), sfarsit: new Date("2026-11-02T08:30:00Z") }] }), false);
});

test("setările se curăță în limite rezonabile", () => {
  assert.deepEqual(S.curataConfig({ pasMin: "abc", pauzaMin: -5, preavizOre: 9999, orizontZile: 0, maxPePezi: 3.4 }), { pasMin: 30, pauzaMin: 0, preavizOre: 720, orizontZile: 1, maxPePezi: 3 });
  assert.deepEqual(S.curataConfig(null), S.CONFIG_IMPLICITA);
});

test("validarea datelor și orelor", () => {
  assert.equal(S.esteData("2026-02-30"), false);
  assert.equal(S.esteData("2026-10-28"), true);
  assert.equal(S.esteOra("24:00"), false);
  assert.equal(S.esteOra("09:30"), true);
});

test("fișierul .ics: evenimentul, oră UTC, caractere speciale escapate", () => {
  const t = S.genereazaIcs({ uid: "abc", start: new Date("2026-11-02T08:00:00Z"), sfarsit: new Date("2026-11-02T08:30:00Z"), titlu: "Consultanță; Alexandrit, 1 la 1", locatie: "Google Meet", creatLa: new Date("2026-10-29T10:00:00Z") });
  assert.ok(t.includes("DTSTART:20261102T080000Z") && t.includes("DTEND:20261102T083000Z"));
  assert.ok(t.includes("SUMMARY:Consultanță\\; Alexandrit\\, 1 la 1"));
  assert.ok(t.startsWith("BEGIN:VCALENDAR\r\n") && t.endsWith("END:VCALENDAR\r\n"));
});

test("setările paginii: texte curățate, email invalid ignorat, valori implicite", () => {
  const s = S.curataSetari({ titlu: "  ", intro: "x".repeat(2000), emailNotificare: "nu-e-email", cereTelefon: true, pasMin: 15 });
  assert.equal(s.titlu, S.SETARI_IMPLICITE.titlu);
  assert.equal(s.intro.length, 600);
  assert.equal(s.emailNotificare, "");
  assert.equal(s.cereTelefon, true);
  assert.equal(s.pasMin, 15);
  assert.equal(S.curataSetari({ emailNotificare: "echipa@alexandrit.ro" }).emailNotificare, "echipa@alexandrit.ro");
});

test("formularul persoanei: nume, email și telefon validate; telefonul poate deveni obligatoriu", () => {
  assert.equal(S.valideazaPersoana({ nume: "Ana Pop", email: "ANA@Exemplu.RO" }, false).ok, true);
  assert.equal(S.valideazaPersoana({ nume: "Ana Pop", email: "ANA@Exemplu.RO" }, false).date.email, "ana@exemplu.ro");
  const rau = S.valideazaPersoana({ nume: "A", email: "x", telefon: "abc" }, false);
  assert.equal(rau.ok, false);
  assert.ok(rau.erori.nume && rau.erori.email && rau.erori.telefon);
  assert.equal(S.valideazaPersoana({ nume: "Ana Pop", email: "a@b.ro" }, true).ok, false);
});

test(".ics: liniile lungi se pliază la 75 de octeți, iar conținutul se reconstruiește la despliere", () => {
  const lung = "Programare: " + "a".repeat(200) + " ăîșț";
  const t = S.genereazaIcs({ uid: "x", start: new Date("2026-11-02T08:00:00Z"), sfarsit: new Date("2026-11-02T08:30:00Z"), titlu: "T", descriere: lung, creatLa: new Date("2026-10-29T10:00:00Z") });
  for (const l of t.split("\r\n")) assert.ok(new TextEncoder().encode(l).length <= 75, l.slice(0, 40));
  assert.ok(t.replace(/\r\n /g, "").includes("DESCRIPTION:" + lung));
});
