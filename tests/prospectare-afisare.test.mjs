import { test } from "node:test";
import assert from "node:assert/strict";

const A = await import("../src/lib/prospectare/afisare.ts");
const L = await import("../src/lib/prospectare/limite.ts");
const T = await import("../src/lib/prospectare/sabloane.ts");

const acum = new Date("2026-10-23T12:00:00Z").getTime();

test("vechime: minute, ore, ieri, zile, săptămâni, luni", () => {
  assert.equal(A.vechime("2026-10-23T11:59:30Z", acum), "acum un minut");
  assert.equal(A.vechime("2026-10-23T11:30:00Z", acum), "acum 30 minute");
  assert.equal(A.vechime("2026-10-23T11:00:00Z", acum), "acum o oră");
  assert.equal(A.vechime("2026-10-23T07:00:00Z", acum), "acum 5 ore");
  assert.equal(A.vechime("2026-10-22T11:00:00Z", acum), "ieri");
  assert.equal(A.vechime("2026-10-20T12:00:00Z", acum), "acum 3 zile");
  assert.equal(A.vechime("2026-09-23T12:00:00Z", acum), "acum 4 săptămâni");
  assert.equal(A.vechime("2026-04-23T12:00:00Z", acum), "acum 6 luni");
  assert.equal(A.vechime("2027-01-01T00:00:00Z", acum), "acum", "data din viitor nu dă numere negative");
});

test("termene: întârziat, azi, mâine, peste N zile, fără termen", () => {
  assert.deepEqual(A.stareTermen("2026-10-21", "2026-10-23"), { text: "întârziat cu 2 zile", intarziat: true });
  assert.deepEqual(A.stareTermen("2026-10-22", "2026-10-23"), { text: "întârziat cu 1 zi", intarziat: true });
  assert.deepEqual(A.stareTermen("2026-10-23", "2026-10-23"), { text: "azi", intarziat: false });
  assert.deepEqual(A.stareTermen("2026-10-24", "2026-10-23"), { text: "mâine", intarziat: false });
  assert.deepEqual(A.stareTermen("2026-10-28", "2026-10-23"), { text: "peste 5 zile", intarziat: false });
  assert.equal(A.stareTermen(null, "2026-10-23"), null);
});

test("zile lucrătoare: weekendul nu se numără", () => {
  // 23 oct. 2026 e vineri
  assert.equal(L.adaugaZileLucratoare("2026-10-23", 2), "2026-10-27"); // lun, mar
  assert.equal(L.adaugaZileLucratoare("2026-10-23", 1), "2026-10-26");
  assert.equal(L.adaugaZileLucratoare("2026-10-21", 4), "2026-10-27"); // miercuri + 4 zile lucrătoare
  assert.equal(L.adaugaZileLucratoare("2026-10-24", 1), "2026-10-26"); // de sâmbătă, prima zi lucrătoare e luni
  assert.equal(L.adaugaZileLucratoare("2026-10-23", 0), "2026-10-23");
});

test("ziua de azi se calculează după București, nu după UTC", () => {
  // 23 oct. 2026, 22:30 UTC = 24 oct. 01:30 în București (EEST, UTC+3)
  assert.equal(L.aziBucuresti(new Date("2026-10-23T22:30:00Z")), "2026-10-24");
  assert.equal(L.aziBucuresti(new Date("2026-10-23T10:00:00Z")), "2026-10-23");
});

test("șabloane: fiecare rol are subiect, e-mail, LinkedIn și follow-up; primul e-mail conține informarea GDPR și STOP", () => {
  const v = { prenume: "Maria", firma: "Alfa SRL", rol: "Director Financiar", ong: "Asociația Lumină", semnatura: "Vlad" };
  for (const g of ["decident", "buget", "csr", "altul"]) {
    const s = T.sabloanePentru(g, v);
    assert.ok(s.titlu.length > 5);
    assert.ok(s.email.subiect.includes("Alfa SRL") || s.email.subiect.includes("Asociația Lumină"), g);
    assert.match(s.email.corp, /Bună ziua, Maria,/);
    assert.match(s.email.corp, /Alfa SRL/);
    assert.match(s.email.corp, /Asociația Lumină/);
    assert.match(s.email.corp, /STOP/, "calea de opoziție e în primul e-mail");
    assert.match(s.email.corp, /interes legitim/);
    assert.ok(s.linkedin.length <= 300, `${g}: nota LinkedIn prea lungă (${s.linkedin.length})`);
    assert.ok(s.followUp.includes("Alfa SRL"));
    assert.ok(!/\{[a-z_]+\}/.test(s.email.corp + s.linkedin + s.followUp), "fără variabile nefolosite");
  }
  assert.match(T.sabloanePentru("buget", v).email.corp, /0,75% din cifra de afaceri/);
  assert.match(T.sabloanePentru("csr", v).email.corp, /raport de impact/);
});

test("șabloane: fără prenume nu rămân virgule ciudate; prenumele se scoate din numele complet", () => {
  const s = T.sabloanePentru("decident", { prenume: "", firma: "Beta", rol: null, ong: "ONG", semnatura: "A" });
  assert.match(s.email.corp, /^Bună ziua,\n/);
  assert.equal(T.prenumeDin("ion Popescu"), "Ion");
  assert.equal(T.prenumeDin(""), "");
});
