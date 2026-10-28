import { test } from "node:test";
import assert from "node:assert/strict";

const P = await import("../src/lib/profil-firma.ts");

const SURSE = [
  { titlu: "Firma X sponsorizează Salvați Copiii", url: "https://www.exemplu.ro/stiri/firma-x-sponsor/" },
  { titlu: "Raport CSR", url: "https://firma-x.ro/csr" },
];
const OK = {
  aSponsorizatOng: "da",
  faceSponsorizari: "da",
  preferinta: "ambele",
  domenii: ["copii", "educație"],
  exemple: [{ ong: "Salvați Copiii", an: "2025", detaliu: "Campanie de ghiozdane", url: "https://exemplu.ro/stiri/firma-x-sponsor" }],
  rezumat: "Firma are program CSR.",
  recomandare: "Abordează prin CSR.",
  pregatireApel: { deCe: "Sprijină cauze pentru copii", unghi: "Proiect similar", cuiScriem: "Director CSR" },
  incredere: "mare",
};

test("profilul valid: câmpurile se păstrează, link-ul exemplului devine cel real din căutare", () => {
  const p = P.parseazaProfilFirma("Iată: " + JSON.stringify(OK) + " gata", SURSE, new Date("2026-10-28T10:00:00Z"));
  assert.equal(p.aSponsorizatOng, "da");
  assert.equal(p.faceSponsorizari, "da");
  assert.equal(p.preferinta, "ambele");
  assert.equal(p.exemple.length, 1);
  assert.equal(p.exemple[0].url, "https://www.exemplu.ro/stiri/firma-x-sponsor/", "link-ul real din căutare, nu cel scris de model");
  assert.equal(p.pregatireApel.cuiScriem, "Director CSR");
  assert.equal(p.incredere, "mare");
  assert.equal(p.la, "2026-10-28T10:00:00.000Z");
});

test("exemplu cu link care NU a apărut în căutare: dispare, iar „da” fără dovadă devine „necunoscut”, cu încredere scăzută", () => {
  const inventat = { ...OK, exemple: [{ ong: "ONG Inventat", an: "2024", detaliu: "x", url: "https://inventat.ro/pagina" }] };
  const p = P.parseazaProfilFirma(JSON.stringify(inventat), SURSE);
  assert.equal(p.exemple.length, 0);
  assert.equal(p.aSponsorizatOng, "necunoscut");
  assert.equal(p.faceSponsorizari, "necunoscut");
  assert.equal(p.incredere, "medie", "încredere „mare” fără dovadă coboară");
  assert.equal(P.aSponsorizatConformProfilului(p), false);
});

test("„nu” rămâne „nu” (nu cere dovadă); valori necunoscute devin „necunoscut”", () => {
  const p = P.parseazaProfilFirma(JSON.stringify({ aSponsorizatOng: "nu", faceSponsorizari: "poate", preferinta: "altceva", incredere: "foarte" }), []);
  assert.equal(p.aSponsorizatOng, "nu");
  assert.equal(p.faceSponsorizari, "necunoscut");
  assert.equal(p.preferinta, "necunoscut");
  assert.equal(p.incredere, "mica");
});

test("JSON între ``` sau cu text în jur se citește; text fără JSON sau JSON stricat = null", () => {
  assert.ok(P.parseazaProfilFirma("```json\n" + JSON.stringify(OK) + "\n```", SURSE));
  assert.equal(P.parseazaProfilFirma("nu am găsit nimic", SURSE), null);
  assert.equal(P.parseazaProfilFirma("{ stricat: ", SURSE), null);
});

test("limitele de lungime și de număr se aplică (rezumat, domenii, exemple, surse)", () => {
  const lung = { ...OK, rezumat: "a".repeat(5000), domenii: Array.from({ length: 20 }, (_, i) => `d${i}`) };
  const surse = Array.from({ length: 30 }, (_, i) => ({ titlu: `t${i}`, url: `https://s${i}.ro/x` }));
  const p = P.parseazaProfilFirma(JSON.stringify(lung), surse);
  assert.equal(p.rezumat.length, 1200);
  assert.equal(p.domenii.length, 8);
  assert.equal(p.surse.length, 12);
});

test("anul trebuie să fie de 4 cifre plauzibil; link-urile cu alt protocol sunt ignorate", () => {
  const p = P.parseazaProfilFirma(JSON.stringify({ ...OK, exemple: [{ ...OK.exemple[0], an: "acum doi ani" }] }), SURSE);
  assert.equal(p.exemple[0].an, null);
  assert.equal(P.urlComparabil("javascript:alert(1)"), null);
  assert.equal(P.urlComparabil("https://www.A.ro/B/?x=1#h"), "a.ro/b");
});

test("citirea din extra: profil valid se recunoaște, orice altceva = null; scorul folosește doar profilul cu dovadă", () => {
  const p = P.parseazaProfilFirma(JSON.stringify(OK), SURSE);
  assert.equal(P.profilDinExtra({ profilAi: p }).faceSponsorizari, "da");
  assert.equal(P.profilDinExtra({}), null);
  assert.equal(P.profilDinExtra(null), null);
  assert.equal(P.profilDinExtra({ profilAi: "x" }), null);
  assert.equal(P.aSponsorizatConformProfilului(p), true);
  assert.equal(P.aSponsorizatConformProfilului(null), false);
});
