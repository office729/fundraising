import { test } from "node:test";
import assert from "node:assert/strict";

const R = await import("../src/lib/surse-donatii/raport-reguli.ts");
const N = await import("../src/lib/surse-donatii/nucleu.ts");

const parse = (sp) => R.parseazaFiltre(sp, N.CATEGORII);
const rand = (categorie, donatii, cuConversie, totalCenti) => ({ categorie, donatii, cuConversie, totalCenti });

// ===== filtre din adresă =====
test("filtre: fără parametri => nicio restricție", () => {
  assert.deepEqual(parse({}), { de: null, pana: null, sursa: null, campanie: { tip: "toate" }, detalii: null, pagina: 1 });
});

test("filtre: perioada validă; zile inexistente, formate greșite și ani absurzi se ignoră", () => {
  assert.deepEqual(
    (({ de, pana }) => ({ de, pana }))(parse({ de: "2026-10-01", pana: "2026-10-31" })),
    { de: "2026-10-01", pana: "2026-10-31" },
  );
  assert.equal(parse({ de: "2026-02-30" }).de, null); // nu există
  assert.equal(parse({ de: "2026-13-01" }).de, null);
  assert.equal(parse({ de: "01.10.2026" }).de, null);
  assert.equal(parse({ de: "2026-10-011" }).de, null); // prea lung
  assert.equal(parse({ de: "1999-12-31" }).de, null);
  assert.equal(parse({ de: "2101-01-01" }).de, null);
  assert.equal(parse({ de: "2024-02-29" }).de, "2024-02-29"); // an bisect
  assert.equal(parse({ de: "2026-02-29" }).de, null);
  assert.equal(parse({ de: "'; drop table x; --" }).de, null);
  // o singură margine rămâne valabilă
  assert.deepEqual((({ de, pana }) => ({ de, pana }))(parse({ de: "2026-10-01", pana: "gunoi" })), { de: "2026-10-01", pana: null });
});

test("filtre: capetele inversate se pun în ordine (nu rezultă un raport gol din greșeală)", () => {
  const f = parse({ de: "2026-10-31", pana: "2026-10-01" });
  assert.equal(f.de, "2026-10-01");
  assert.equal(f.pana, "2026-10-31");
});

test("filtre: un parametru repetat vine ca listă — se ia primul", () => {
  const f = parse({ de: ["2026-10-01", "2026-09-01"], sursa: ["newsletter", "google_ads"], campanie: ["n:Primavara", "n:Alta"], pagina: ["3", "9"], detalii: ["newsletter", "google_ads"] });
  assert.equal(f.de, "2026-10-01");
  assert.equal(f.sursa, "newsletter");
  assert.deepEqual(f.campanie, { tip: "nume", nume: "Primavara" });
  assert.equal(f.detalii, "newsletter");
  assert.equal(f.pagina, 3);
  assert.equal(parse({ de: [] }).de, null); // listă goală
  assert.equal(parse({ de: undefined }).de, null);
});

test("filtre: sursa = doar categorii din lista albă", () => {
  for (const c of N.CATEGORII) assert.equal(parse({ sursa: c }).sursa, c);
  assert.equal(parse({ sursa: " newsletter " }).sursa, "newsletter");
  assert.equal(parse({ sursa: "direct" }).sursa, null);
  assert.equal(parse({ sursa: "NEWSLETTER" }).sursa, null);
  assert.equal(parse({ sursa: "newsletter' or 1=1" }).sursa, null);
  assert.equal(parse({ sursa: "x".repeat(5000) }).sursa, null);
  assert.equal(parse({ sursa: "" }).sursa, null);
});

test("filtre: campanie — toate / fără campanie / nume; text curățat și plafonat", () => {
  assert.deepEqual(parse({ campanie: "" }).campanie, { tip: "toate" });
  assert.deepEqual(parse({ campanie: "   " }).campanie, { tip: "toate" });
  assert.deepEqual(parse({ campanie: "-" }).campanie, { tip: "fara" });
  assert.deepEqual(parse({ campanie: "n:Primăvara 2026" }).campanie, { tip: "nume", nume: "Primăvara 2026" });
  assert.deepEqual(parse({ campanie: "  n:  Black Friday  " }).campanie, { tip: "nume", nume: "Black Friday" });
  assert.deepEqual(parse({ campanie: "n:-" }).campanie, { tip: "nume", nume: "-" }); // o campanie numită „-” nu se confundă cu „fără campanie”
  assert.deepEqual(parse({ campanie: "Primavara" }).campanie, { tip: "nume", nume: "Primavara" }); // scris de mână, fără prefix
  assert.deepEqual(parse({ campanie: "n:" }).campanie, { tip: "toate" });
  assert.deepEqual(parse({ campanie: "n:a\u0000b\nc" }).campanie, { tip: "nume", nume: "a b c" }); // caractere de control
  const lung = parse({ campanie: `n:${"x".repeat(500)}` }).campanie;
  assert.equal(lung.tip, "nume");
  assert.ok(lung.nume.length <= 100);
});

test("filtre: lista de detalii trebuie să fie o categorie validă și coerentă cu filtrul de sursă; pagina e plafonată", () => {
  assert.equal(parse({ detalii: "google_ads" }).detalii, "google_ads");
  assert.equal(parse({ detalii: "inventat" }).detalii, null);
  assert.equal(parse({ detalii: "google_ads", sursa: "newsletter" }).detalii, null); // tabelul are un singur rând: newsletter
  assert.equal(parse({ detalii: "newsletter", sursa: "newsletter" }).detalii, "newsletter");
  assert.equal(parse({ detalii: "google_ads", pagina: "4" }).pagina, 4);
  assert.equal(parse({ detalii: "google_ads", pagina: "0" }).pagina, 1);
  assert.equal(parse({ detalii: "google_ads", pagina: "-3" }).pagina, 1);
  assert.equal(parse({ detalii: "google_ads", pagina: "abc" }).pagina, 1);
  assert.equal(parse({ detalii: "google_ads", pagina: "99999999999" }).pagina, 1); // peste plafonul de cifre
  assert.equal(parse({ detalii: "google_ads", pagina: "999999" }).pagina, 100000);
  assert.equal(parse({ pagina: "5" }).pagina, 1); // fără listă, pagina nu are sens
});

test("filtre -> adresă -> filtre: parametrii se păstrează (nume cu spații, diacritice, caractere speciale)", () => {
  const f = {
    de: "2026-10-01",
    pana: "2026-10-31",
    sursa: "google_ads",
    campanie: { tip: "nume", nume: "Primăvara & vara = 100%" },
    detalii: "google_ads",
    pagina: 2,
  };
  const q = R.parametriUrl(f);
  const inapoi = parse(Object.fromEntries(q.entries()));
  assert.deepEqual(inapoi, f);
  assert.equal(R.parametriUrl({ de: null, pana: null, sursa: null, campanie: { tip: "toate" }, detalii: null, pagina: 1 }).toString(), "");
  assert.equal(R.parametriUrl({ de: null, pana: null, sursa: null, campanie: { tip: "fara" }, detalii: null, pagina: 7 }).toString(), "campanie=-"); // pagina doar cu lista
  assert.equal(R.parametriUrl({ de: null, pana: null, sursa: null, campanie: { tip: "toate" }, detalii: "newsletter", pagina: 1 }).toString(), "detalii=newsletter");
});

// ===== presetări și date =====
test("presetări: ultimele 30/90 de zile includ azi; anul curent începe la 1 ianuarie; fără probleme la capăt de lună/an", () => {
  const p = Object.fromEntries(R.presetari("2026-11-05").map((x) => [x.cheie, x]));
  assert.deepEqual(p.toate, { cheie: "toate", de: null, pana: null });
  assert.deepEqual(p["30"], { cheie: "30", de: "2026-10-07", pana: "2026-11-05" }); // 30 de zile numărând și azi
  assert.deepEqual(p["90"], { cheie: "90", de: "2026-08-08", pana: "2026-11-05" });
  assert.deepEqual(p.an, { cheie: "an", de: "2026-01-01", pana: "2026-11-05" });
  assert.equal(R.adaugaZile("2026-03-01", -1), "2026-02-28");
  assert.equal(R.adaugaZile("2024-03-01", -1), "2024-02-29");
  assert.equal(R.adaugaZile("2026-12-31", 1), "2027-01-01");
  assert.equal(R.adaugaZile("2026-10-25", 7), "2026-11-01"); // peste trecerea la ora de iarnă (calcul pe date, nu pe ore)
});

test("azi în ora României, nu în UTC", () => {
  // 2026-11-05 22:30 UTC = 2026-11-06 00:30 în România (UTC+2)
  assert.equal(R.ziuaBucuresti(Date.UTC(2026, 10, 5, 22, 30)), "2026-11-06");
  // vara (UTC+3): 21:30 UTC deja e ziua următoare
  assert.equal(R.ziuaBucuresti(Date.UTC(2026, 6, 14, 21, 30)), "2026-07-15");
  assert.equal(R.ziuaBucuresti(Date.UTC(2026, 6, 14, 20, 30)), "2026-07-14");
});

// ===== tabelul: totaluri, medie, pondere =====
test("tabel: donații, total, medie și pondere pe sursă; sortat descrescător după total EUR", () => {
  const r = R.calculeazaRaport(
    [rand("newsletter", 2, 2, 5000), rand("google_ads", 3, 3, 30000), rand("facebook_ads", 1, 1, 15000)],
    N.CATEGORII,
  );
  assert.deepEqual(r.randuri.map((x) => x.categorie), ["google_ads", "facebook_ads", "newsletter"]);
  const g = r.randuri[0];
  assert.equal(g.donatii, 3);
  assert.equal(g.totalCenti, 30000);
  assert.equal(g.medieCenti, 10000);
  assert.equal(g.pondere, 60); // 30000 / 50000
  assert.equal(g.faraConversie, 0);
  assert.equal(r.randuri[1].pondere, 30);
  assert.equal(r.randuri[2].pondere, 10);
  assert.deepEqual(r.total, { donatii: 6, faraConversie: 0, totalCenti: 50000, medieCenti: Math.round(50000 / 6) });
});

test("tabel: ponderea cu o zecimală, calculată din totalul afișat (ca pondere() din nucleu)", () => {
  const r = R.calculeazaRaport([rand("google_ads", 1, 1, 1), rand("newsletter", 1, 1, 2)]);
  assert.equal(r.randuri[0].pondere, 66.7);
  assert.equal(r.randuri[1].pondere, 33.3);
  for (const [a, b] of [[1, 3], [2, 3], [5, 7], [0, 10], [10, 10], [1, 0]]) assert.equal(R.procent(a, b), N.pondere(a, b), `${a}/${b}`);
});

test("conversii lipsă: donația se numără și se semnalează, NU se adaugă ca 0 și nu strică media/ponderea", () => {
  // 4 donații Google: una fără conversie. Media = 30000 / 3 (nu / 4).
  const r = R.calculeazaRaport([rand("google_ads", 4, 3, 30000), rand("newsletter", 1, 1, 10000)]);
  const g = r.randuri.find((x) => x.categorie === "google_ads");
  assert.equal(g.donatii, 4);
  assert.equal(g.faraConversie, 1);
  assert.equal(g.totalCenti, 30000);
  assert.equal(g.medieCenti, 10000);
  assert.equal(g.pondere, 75); // 30000 / 40000: donația fără conversie nu intră în sumă
  assert.equal(r.total.donatii, 5);
  assert.equal(r.total.faraConversie, 1);
  assert.equal(r.total.totalCenti, 40000);
  assert.equal(r.total.medieCenti, 10000);
});

test("conversii lipsă: o sursă fără nicio conversie rămâne în tabel (cu medie și pondere „—”), nu devine 0 EUR cu medie 0", () => {
  const r = R.calculeazaRaport([rand("afiliat", 2, 0, 0), rand("newsletter", 1, 1, 4000)]);
  const a = r.randuri.find((x) => x.categorie === "afiliat");
  assert.equal(a.donatii, 2);
  assert.equal(a.faraConversie, 2);
  assert.equal(a.medieCenti, null);
  assert.equal(a.totalCenti, null); // fără sumă: „—” în interfață, nu 0 EUR
  assert.equal(a.pondere, null);
  assert.equal(r.randuri[0].categorie, "newsletter"); // sortat după total
  // tot raportul fără conversii: total 0, medie și pondere indisponibile
  const toate = R.calculeazaRaport([rand("afiliat", 2, 0, 0)]);
  assert.equal(toate.randuri[0].pondere, null);
  assert.equal(toate.randuri[0].totalCenti, null);
  assert.equal(toate.total.totalCenti, null);
  assert.equal(toate.total.medieCenti, null);
  assert.equal(toate.total.donatii, 2);
  assert.equal(toate.total.faraConversie, 2);
});

test("tabel: fără rânduri => raport gol (nu zero-uri); rândurile cu 0 donații dispar; valorile aberante nu strică calculul", () => {
  assert.deepEqual(R.calculeazaRaport([]), { randuri: [], total: { donatii: 0, faraConversie: 0, totalCenti: null, medieCenti: null } });
  assert.equal(R.calculeazaRaport([rand("newsletter", 0, 0, 0)]).randuri.length, 0);
  const r = R.calculeazaRaport([rand("newsletter", 2, 5, Number.NaN), rand("google_ads", -3, 1, 100)]);
  assert.equal(r.randuri.length, 1);
  assert.equal(r.randuri[0].faraConversie, 0); // cuConversie plafonat la numărul de donații
  assert.equal(r.randuri[0].totalCenti, 0);
});

test("tabel: aceeași categorie primită de două ori se însumează; egalitățile se rezolvă după ordinea regulilor", () => {
  const r = R.calculeazaRaport([rand("newsletter", 1, 1, 100), rand("newsletter", 2, 2, 200)]);
  assert.equal(r.randuri.length, 1);
  assert.equal(r.randuri[0].donatii, 3);
  assert.equal(r.randuri[0].totalCenti, 300);
  const egale = R.calculeazaRaport([rand("afiliat", 1, 1, 500), rand("google_ads", 1, 1, 500), rand("facebook_ads", 1, 1, 500)], N.CATEGORII);
  assert.deepEqual(egale.randuri.map((x) => x.categorie), ["facebook_ads", "google_ads", "afiliat"]);
});

// ===== paginare =====
test("paginare: limita de 100, pagina peste capăt cade pe ultima, fără rezultate = o pagină goală", () => {
  assert.equal(R.LIMITA_DETALII, 100);
  assert.deepEqual(R.paginare(0, 1), { pagina: 1, pagini: 1, offset: 0, limita: 100 });
  assert.deepEqual(R.paginare(100, 1), { pagina: 1, pagini: 1, offset: 0, limita: 100 });
  assert.deepEqual(R.paginare(101, 1), { pagina: 1, pagini: 2, offset: 0, limita: 100 });
  assert.deepEqual(R.paginare(101, 2), { pagina: 2, pagini: 2, offset: 100, limita: 100 });
  assert.deepEqual(R.paginare(250, 3), { pagina: 3, pagini: 3, offset: 200, limita: 100 });
  assert.equal(R.paginare(250, 99).pagina, 3);
  assert.equal(R.paginare(250, 0).pagina, 1);
  assert.equal(R.paginare(250, Number.NaN).pagina, 1);
  assert.equal(R.paginare(Number.NaN, 5).pagina, 1);
  assert.equal(R.paginare(-5, 2).pagini, 1);
});

// ===== formatări =====
test("formatări: EUR cu două zecimale și procent cu una, în ambele limbi", () => {
  assert.equal(R.formatEur(123456, "en"), "1,234.56 EUR");
  assert.match(R.formatEur(123456, "ro"), /^1\.234,56 EUR$/);
  assert.equal(R.formatEur(0, "en"), "0.00 EUR");
  assert.equal(R.formatProcent(null), "—");
  assert.equal(R.formatProcent(12.5, "en"), "12.5%");
  assert.match(R.formatProcent(12.5, "ro"), /^12,5%$/);
  assert.equal(R.formatProcent(100, "en"), "100.0%");
});
