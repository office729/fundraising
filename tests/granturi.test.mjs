import { test } from "node:test";
import assert from "node:assert/strict";

const {
  STARI_GRANT,
  ETICHETE_STARE,
  CAMPURI_DOSAR,
  dataValida,
  zileLaTermen,
  urgentaTermen,
  textTermen,
  curataLista,
  curataDosar,
  progresDosar,
  sumaValida,
  linkValid,
  valideazaGrant,
  rezumaRegistru,
  reminderDeTrimis,
  aziBucuresti,
} = await import("../src/lib/granturi/stari.ts");
const { SURSE_FINANTARE } = await import("../src/lib/granturi/surse.ts");

const baza = {
  id: null,
  finantator: "Fundația Exemplu",
  titlu: "Apel sănătate",
  tipFinantator: "fundatie",
  stare: "identificat",
  suma: "25000",
  moneda: "RON",
  termen: "2026-12-01",
  link: "exemplu.ro/apel",
  responsabilId: null,
  nota: "",
  cerinte: "",
  eligibilitate: [],
  documente: [],
  draft: "",
  sumaCastigata: "",
  dataDecizie: "",
  termenRaportare: "",
};

test("fiecare stare are o etichetă", () => {
  for (const s of STARI_GRANT) assert.ok(ETICHETE_STARE[s], s);
});

test("date calendaristice: doar cele reale", () => {
  assert.equal(dataValida("2026-12-01"), "2026-12-01");
  assert.equal(dataValida("2026-02-31"), null);
  assert.equal(dataValida("01.12.2026"), null);
  assert.equal(dataValida(""), null);
  assert.equal(dataValida(null), null);
});

test("zile până la termen, pe zile calendaristice", () => {
  assert.equal(zileLaTermen("2026-10-20", "2026-10-14"), 6);
  assert.equal(zileLaTermen("2026-10-14", "2026-10-14"), 0);
  assert.equal(zileLaTermen("2026-10-12", "2026-10-14"), -2);
  // peste schimbarea orei de iarnă nu se pierde o zi
  assert.equal(zileLaTermen("2026-11-01", "2026-10-24"), 8);
  assert.equal(zileLaTermen(null, "2026-10-14"), null);
  assert.equal(zileLaTermen("nu-e-data", "2026-10-14"), null);
});

test("urgența termenului și textul lui", () => {
  assert.equal(urgentaTermen(null), "fara");
  assert.equal(urgentaTermen(-1), "depasit");
  assert.equal(urgentaTermen(0), "azi");
  assert.equal(urgentaTermen(7), "curand");
  assert.equal(urgentaTermen(8), "ok");
  assert.equal(textTermen(0), "azi");
  assert.equal(textTermen(1), "mâine");
  assert.equal(textTermen(5), "în 5 zile");
  assert.equal(textTermen(-1), "depășit cu o zi");
  assert.equal(textTermen(-3), "depășit cu 3 zile");
});

test("ziua de azi în București are forma YYYY-MM-DD și ține cont de fusul orar", () => {
  assert.match(aziBucuresti(), /^\d{4}-\d{2}-\d{2}$/);
  // 31 decembrie, 22:30 UTC = 1 ianuarie, 00:30 în București (iarna, UTC+2)
  assert.equal(aziBucuresti(new Date("2026-12-31T22:30:00Z")), "2027-01-01");
});

test("listele de bifat: curățate, limitate, fără rânduri goale", () => {
  const l = curataLista([{ text: "  Statut ", ok: true }, { text: "" }, { text: "Bilanț", ok: "da" }, null, "x"]);
  assert.deepEqual(l, [
    { text: "Statut", ok: true },
    { text: "Bilanț", ok: false },
  ]);
  assert.equal(curataLista(Array.from({ length: 100 }, (_, i) => ({ text: `r${i}` }))).length, 40);
  assert.deepEqual(curataLista("nu e listă"), []);
  assert.equal(curataLista([{ text: "x".repeat(500) }])[0].text.length, 200);
});

test("sume: numere pozitive cu două zecimale", () => {
  assert.equal(sumaValida("25000"), 25000);
  assert.equal(sumaValida("1234,567"), 1234.57);
  assert.equal(sumaValida(""), null);
  assert.equal(sumaValida("-5"), null);
  assert.equal(sumaValida("abc"), null);
  assert.equal(sumaValida(1e15), null);
});

test("linkuri: doar web, cu https adăugat dacă lipsește", () => {
  assert.equal(linkValid("exemplu.ro/apel"), "https://exemplu.ro/apel");
  assert.equal(linkValid("http://exemplu.ro"), "http://exemplu.ro/");
  assert.equal(linkValid("javascript:alert(1)"), null);
  assert.equal(linkValid("data:text/html,x"), null);
  assert.equal(linkValid("fără spații și punct"), null);
  assert.equal(linkValid(""), null);
});

test("validarea unei cereri: obligatorii, date, sume, stări", () => {
  const ok = valideazaGrant(baza);
  assert.equal(ok.ok, true);
  assert.equal(ok.v.suma, 25000);
  assert.equal(ok.v.link, "https://exemplu.ro/apel");
  assert.equal(valideazaGrant({ ...baza, finantator: "  " }).ok, false);
  assert.equal(valideazaGrant({ ...baza, titlu: "" }).ok, false);
  assert.equal(valideazaGrant({ ...baza, stare: "inventata" }).ok, false);
  assert.equal(valideazaGrant({ ...baza, termen: "2026-13-40" }).ok, false);
  assert.equal(valideazaGrant({ ...baza, suma: "mult" }).ok, false);
  assert.equal(valideazaGrant({ ...baza, link: "javascript:alert(1)" }).ok, false);
  // valori necunoscute cad pe cele implicite, nu strică salvarea
  const implicit = valideazaGrant({ ...baza, tipFinantator: "xyz", moneda: "GBP", responsabilId: "nu-e-uuid" });
  assert.equal(implicit.ok, true);
  assert.equal(implicit.v.tipFinantator, "alt");
  assert.equal(implicit.v.moneda, "RON");
  assert.equal(implicit.v.responsabilId, null);
});

test("rezumatul registrului: în lucru, termene apropiate, depuse și finanțate pe monedă", () => {
  const azi = "2026-10-14";
  const r = rezumaRegistru(
    [
      { stare: "identificat", suma: null, sumaCastigata: null, moneda: "RON", termen: "2026-10-16" }, // curând
      { stare: "in_pregatire", suma: 100, sumaCastigata: null, moneda: "RON", termen: "2026-10-01" }, // depășit
      { stare: "in_pregatire", suma: 100, sumaCastigata: null, moneda: "RON", termen: "2026-12-01" }, // ok
      { stare: "aplicat", suma: 5000, sumaCastigata: null, moneda: "EUR", termen: "2026-09-01" },
      { stare: "castigat", suma: 10000, sumaCastigata: 8000, moneda: "RON", termen: null },
      { stare: "in_derulare", suma: 3000, sumaCastigata: null, moneda: "RON", termen: null },
      { stare: "respins", suma: 999, sumaCastigata: null, moneda: "RON", termen: "2026-10-15" }, // nu contează
    ],
    azi,
  );
  assert.equal(r.total, 7);
  assert.equal(r.inLucru, 3);
  assert.equal(r.termeneCurand, 2);
  assert.equal(r.depuse, 1);
  assert.deepEqual(r.sumaCerutaPeMoneda, { EUR: 5000 });
  assert.equal(r.finantate, 2);
  assert.deepEqual(r.sumaFinantataPeMoneda, { RON: 11000 }); // 8000 câștigat + 3000 cerută (fără sumă câștigată)
});

test("remindere de termen: 7 zile și o zi, fiecare o singură dată, fără termene depășite", () => {
  assert.equal(reminderDeTrimis(7, false, false), "7z");
  assert.equal(reminderDeTrimis(3, false, false), "7z");
  assert.equal(reminderDeTrimis(3, true, false), null);
  assert.equal(reminderDeTrimis(1, true, false), "1z");
  assert.equal(reminderDeTrimis(0, false, false), "1z");
  assert.equal(reminderDeTrimis(0, true, true), null);
  assert.equal(reminderDeTrimis(8, false, false), null);
  assert.equal(reminderDeTrimis(-1, false, false), null);
  assert.equal(reminderDeTrimis(null, false, false), null);
});

test("dosarul: doar câmpurile cunoscute, curățate; progresul numără ce e completat", () => {
  const d = curataDosar({ misiune: "  Ajutăm familii  ", necunoscut: "x", cui: "", buget: 5 });
  assert.deepEqual(d, { misiune: "Ajutăm familii" });
  assert.deepEqual(curataDosar(null), {});
  assert.deepEqual(progresDosar(d), { completate: 1, total: CAMPURI_DOSAR.length });
  assert.equal(new Set(CAMPURI_DOSAR.map((c) => c.cheie)).size, CAMPURI_DOSAR.length);
});

test("sursele de finanțare: id-uri unice, linkuri https, fiecare cu explicație", () => {
  assert.ok(SURSE_FINANTARE.length >= 10);
  assert.equal(new Set(SURSE_FINANTARE.map((s) => s.id)).size, SURSE_FINANTARE.length);
  for (const s of SURSE_FINANTARE) {
    assert.match(s.url, /^https:\/\//, s.id);
    assert.ok(s.nume && s.descriere && s.cum, s.id);
  }
});
