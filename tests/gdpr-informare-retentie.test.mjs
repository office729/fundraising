import { test } from "node:test";
import assert from "node:assert/strict";

const M = await import("../src/lib/influenceri/mesaje.ts");
const AE = await import("../src/lib/agent-email/reguli.ts");
const GR = await import("../src/lib/gdpr-module-noi-reguli.ts");

const DATE = {
  influencer: { nume: "Ana Pop", categorie: "Lifestyle", domeniu: "familie", oras: "Cluj", tara: "România" },
  campanie: { titlu: "Mihai are nevoie de noi", judet: "Cluj", ramasLei: 12000 },
  link: "https://exemplu.ro/r/mihai-iabc123",
  expeditor: "Ioana Ionescu",
  organizatie: "Asociația Test",
  indicatii: null,
};

// ---------- influenceri: sursa datelor și dreptul de a refuza ----------

test("șablonul fără AI spune de unde avem datele și că poate opri contactările, în fiecare variantă", () => {
  const s = M.sablonMesaje(DATE);
  for (const k of M.CHEI_VARIANTE) {
    assert.ok(s[k].includes(M.FRAZA_INFORMARE[k]), k);
    assert.equal(s[k].split(DATE.link).length - 1, 1, k);
  }
  assert.match(M.FRAZA_INFORMARE.instagram, /profilul public/);
  assert.match(M.FRAZA_INFORMARE.facebook, /profilul dumneavoastră public/);
  assert.match(M.FRAZA_INFORMARE.colaborare, /oprim mesajele/);
});

test("instrucțiunile către AI cer fraza de informare, copiată exact, pentru fiecare variantă", () => {
  const i = M.instructiuniAi("Asociația Test");
  for (const k of M.CHEI_VARIANTE) assert.ok(i.includes(M.FRAZA_INFORMARE[k]), k);
  assert.match(i, /EXACT/);
});

test("răspunsul AI fără fraza de informare primește fraza; linkul se păstrează o singură dată", () => {
  const raspuns = JSON.stringify({ instagram: "Bună Ana!", facebook: `Salut, Ana. ${DATE.link}`, colaborare: "Propunere" });
  const v = M.citesteVariante(raspuns, DATE.link);
  assert.ok(v);
  for (const k of M.CHEI_VARIANTE) {
    assert.ok(v[k].includes(M.FRAZA_INFORMARE[k]), k);
    // linkul lipsă se adaugă la sfârșit; cel deja prezent în text (facebook) rămâne unde l-a pus modelul
    if (k !== "facebook") assert.ok(v[k].endsWith(DATE.link), k);
    assert.equal(v[k].split(DATE.link).length - 1, 1, k);
  }
});

test("fraza deja prezentă (chiar cu alte spații) nu se dublează", () => {
  const cu = `Bună!\n\n${M.FRAZA_INFORMARE.instagram.replace(". ", ".\n")}`;
  assert.equal(M.asiguraInformare(cu, "instagram").split("profilul public").length - 1, 1);
  const fb = M.asiguraInformare("Salut", "facebook");
  assert.equal(M.asiguraInformare(fb, "facebook"), fb);
});

// ---------- Agent email: pixelul în subsol ----------

test("subsolul menționează pixelul DOAR când e activ pentru mesaj", () => {
  const fara = AE.textSubsol("Asociația Test", false);
  const cu = AE.textSubsol("Asociația Test", true);
  assert.ok(!fara.includes("pixel"));
  assert.ok(cu.includes(AE.FRAZA_PIXEL));
  assert.equal(AE.FRAZA_PIXEL, "Acest email poate conține un pixel care ne arată dacă a fost deschis.");
});

test("subsolul păstrează informarea art. 14 și dezabonarea, cu sau fără pixel", () => {
  for (const cuPixel of [false, true]) {
    const t = AE.textSubsol("Asociația Test", cuPixel);
    assert.ok(t.includes("persoană de contact profesională"));
    assert.ok(t.includes("interesului legitim al Asociația Test"));
    assert.ok(t.includes("surse publice sau profesionale"));
    assert.ok(t.endsWith("răspundeți cu STOP sau"));
  }
});

test("pixelul apare în subsolul HTML și text doar prin fraza din subsol (imaginea 1×1 e separată)", () => {
  const sub = { text: AE.textSubsol("Asociația Test", true), linkDezabonare: "https://x.ro/d", etichetaLink: "dezabonați-vă aici." };
  assert.ok(AE.corpEmailText("Salut", "Ana", sub).includes(AE.FRAZA_PIXEL));
  assert.ok(AE.corpEmailHtml("Salut", "Ana", { subsol: sub, pixelUrl: "https://x.ro/p.gif" }).includes(AE.FRAZA_PIXEL));
  const faraPixel = { text: AE.textSubsol("Asociația Test", false), linkDezabonare: "https://x.ro/d" };
  assert.ok(!AE.corpEmailHtml("Salut", "Ana", { subsol: faraPixel }).includes("pixel"));
});

// ---------- retenția influencerilor „Nu mai contactăm” ----------

test("retenția influencerilor blocați e de 12 luni calendaristice", () => {
  assert.equal(GR.LUNI_RETENTIE_INFLUENCERI_BLOCATI, 12);
  const limita = GR.limitaRetentieEmailuri(new Date("2026-11-04T10:00:00.000Z"), GR.LUNI_RETENTIE_INFLUENCERI_BLOCATI);
  assert.equal(limita.toISOString(), "2025-11-04T10:00:00.000Z");
  // 29 februarie 2028 − 12 luni = 28 februarie 2027
  assert.equal(GR.limitaRetentieEmailuri(new Date("2028-02-29T00:00:00.000Z"), 12).toISOString(), "2027-02-28T00:00:00.000Z");
});
