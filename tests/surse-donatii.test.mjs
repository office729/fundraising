import { test } from "node:test";
import assert from "node:assert/strict";

const N = await import("../src/lib/surse-donatii/nucleu.ts");

const S = (o = {}) => ({ ...N.SEMNALE_GOALE, clickIds: [], ...o });
const clasifica = (o) => N.clasificaSursa(S(o));
const url = (qs, ref) => {
  const q = new URLSearchParams(qs);
  return N.semnaleDinUrl((n) => q.get(n), ref);
};

// ===== cele 10 reguli =====
test("1. Facebook / Instagram Ads: sursă Facebook + medium de reclamă (sau referrer Facebook + medium)", () => {
  for (const src of ["facebook", "fb", "ig", "instagram", "meta", " Facebook "]) for (const med of ["paid", "cpc", "ppc", "cpm", "paid_social", "ads", "PAID"]) assert.equal(clasifica({ utmSource: src, utmMedium: med }), "facebook_ads", `${src}/${med}`);
  assert.equal(clasifica({ referrerHost: "l.facebook.com", utmMedium: "paid" }), "facebook_ads");
  assert.equal(clasifica({ referrerHost: "instagram.com", utmMedium: "cpc" }), "facebook_ads");
});

test("2. Facebook / Instagram organic: fbclid, sursă sau referrer — fbclid singur NU dovedește reclama", () => {
  assert.equal(clasifica({ clickIds: ["fbclid"] }), "facebook_organic");
  assert.equal(clasifica({ utmSource: "facebook" }), "facebook_organic");
  assert.equal(clasifica({ utmSource: "facebook", utmMedium: "social" }), "facebook_organic");
  assert.equal(clasifica({ referrerHost: "m.facebook.com" }), "facebook_organic");
  assert.equal(clasifica({ referrerHost: "fb.com" }), "facebook_organic");
  assert.equal(clasifica({ clickIds: ["fbclid"], utmSource: "facebook", utmMedium: "paid" }), "facebook_ads", "cu medium de reclamă câștigă regula 1");
});

test("3. Google Ads: gclid / gbraid / wbraid, sau medium cpc|ppc|paid + sursă care conține google", () => {
  for (const id of ["gclid", "gbraid", "wbraid"]) assert.equal(clasifica({ clickIds: [id] }), "google_ads", id);
  assert.equal(clasifica({ utmSource: "google", utmMedium: "cpc" }), "google_ads");
  assert.equal(clasifica({ utmSource: "google_search", utmMedium: "ppc" }), "google_ads");
  assert.equal(clasifica({ utmSource: "adwords-google", utmMedium: "paid" }), "google_ads");
  assert.equal(clasifica({ utmSource: "google", utmMedium: "organic" }), null, "fără medium plătit și fără referrer nu e Google Ads");
});

test("4. LinkedIn Ads: li_fat_id, sau sursă/referrer LinkedIn + medium de reclamă", () => {
  assert.equal(clasifica({ clickIds: ["li_fat_id"] }), "linkedin_ads");
  assert.equal(clasifica({ utmSource: "linkedin", utmMedium: "paid_social" }), "linkedin_ads");
  assert.equal(clasifica({ utmSource: "li", utmMedium: "cpm" }), "linkedin_ads");
  assert.equal(clasifica({ referrerHost: "www.linkedin.com", utmMedium: "ads" }), "linkedin_ads");
  assert.equal(clasifica({ referrerHost: "lnkd.in", utmMedium: "cpc" }), "linkedin_ads");
});

test("5. LinkedIn organic: sursă linkedin|li sau referrer linkedin.com / lnkd.in", () => {
  assert.equal(clasifica({ utmSource: "linkedin" }), "linkedin_organic");
  assert.equal(clasifica({ utmSource: "LI" }), "linkedin_organic");
  assert.equal(clasifica({ referrerHost: "www.linkedin.com" }), "linkedin_organic");
  assert.equal(clasifica({ referrerHost: "lnkd.in" }), "linkedin_organic");
});

test("6. Newsletter: utm_medium=email sau sursă newsman|newsletter", () => {
  assert.equal(clasifica({ utmMedium: "email" }), "newsletter");
  assert.equal(clasifica({ utmSource: "newsman", utmMedium: "email", utmCampaign: "Octombrie" }), "newsletter");
  assert.equal(clasifica({ utmSource: "newsletter" }), "newsletter");
  assert.equal(clasifica({ utmSource: "NEWSMAN" }), "newsletter");
});

test("7. Organic (căutare): motoare de căutare, doar fără identificatori de click publicitar", () => {
  for (const h of ["google.com", "www.google.ro", "google.co.uk", "bing.com", "www.bing.com", "yahoo.com", "search.yahoo.com", "duckduckgo.com", "ecosia.org"]) assert.equal(clasifica({ referrerHost: h }), "organic_search", h);
  assert.equal(clasifica({ referrerHost: "google.com", clickIds: ["gclid"] }), "google_ads", "gclid => regula 3, nu căutare organică");
  assert.equal(clasifica({ referrerHost: "bing.com", clickIds: ["msclkid"] }), "alt_site", "msclkid exclude regula 7; cade pe „alt site”");
});

test("8. Alte rețele sociale: sursă twitter|x|tiktok|youtube sau referrer corespunzător", () => {
  for (const s of ["twitter", "x", "tiktok", "youtube"]) assert.equal(clasifica({ utmSource: s }), "alte_retele", s);
  for (const h of ["twitter.com", "x.com", "t.co", "tiktok.com", "www.tiktok.com", "youtube.com", "m.youtube.com", "youtu.be"]) assert.equal(clasifica({ referrerHost: h }), "alte_retele", h);
});

test("9. Alt site: referrer extern, neignorat, care nu se încadrează mai sus", () => {
  assert.equal(clasifica({ referrerHost: "blog.exemplu.ro" }), "alt_site");
  assert.equal(clasifica({ referrerHost: "stiri.ro", utmCampaign: "x" }), "alt_site");
});

test("10. Afiliat: referral_id, doar dacă nu s-a identificat altă sursă", () => {
  assert.equal(clasifica({ referralId: "ab12" }), "afiliat");
  assert.equal(clasifica({ referralId: "ab12", utmSource: "newsman" }), "newsletter");
  assert.equal(clasifica({ referralId: "ab12", referrerHost: "blog.exemplu.ro" }), "alt_site");
  assert.equal(clasifica({}), null, "fără nimic = Direct");
  assert.equal(clasifica({ utmSource: "altceva", utmMedium: "altceva" }), null, "UTM necunoscut fără referrer extern nu e o sursă recunoscută");
});

// ===== ordinea strictă, inclusiv la parametri contradictorii =====
test("ordinea regulilor e respectată când parametrii se contrazic", () => {
  assert.equal(clasifica({ clickIds: ["fbclid", "gclid"] }), "facebook_organic", "2 înaintea 3");
  assert.equal(clasifica({ utmSource: "google", utmMedium: "cpc", clickIds: ["fbclid"] }), "facebook_organic");
  assert.equal(clasifica({ clickIds: ["gclid", "li_fat_id"] }), "google_ads", "3 înaintea 4");
  assert.equal(clasifica({ utmSource: "linkedin", utmMedium: "email" }), "linkedin_organic", "5 înaintea 6");
  assert.equal(clasifica({ utmSource: "newsman", referrerHost: "google.com" }), "newsletter", "6 înaintea 7");
  assert.equal(clasifica({ utmSource: "tiktok", referrerHost: "google.com" }), "organic_search", "7 înaintea 8");
  assert.equal(clasifica({ utmSource: "facebook", utmMedium: "email" }), "facebook_organic", "2 înaintea 6");
  assert.equal(clasifica({ utmSource: "tiktok", referrerHost: "stiri.ro" }), "alte_retele", "8 înaintea 9");
  assert.equal(clasifica({ utmSource: "  FaceBook ", utmMedium: " PAID " }), "facebook_ads", "fără diferență de litere sau spații");
});

// ===== domenii =====
test("domeniile se compară pe hostname real: facebook.com.alt-site.ro nu e Facebook", () => {
  assert.equal(clasifica({ referrerHost: "facebook.com.alt-site.ro" }), "alt_site");
  assert.equal(clasifica({ referrerHost: "notfacebook.com" }), "alt_site");
  assert.equal(clasifica({ referrerHost: "google.com.alt-site.ro" }), "alt_site");
  assert.equal(clasifica({ referrerHost: "google.com.evil.ro", utmMedium: "x" }), "alt_site");
  assert.equal(clasifica({ referrerHost: "evil-linkedin.com" }), "alt_site");
  assert.equal(N.gazdaInDomenii("m.facebook.com", ["facebook.com"]), true);
  assert.equal(N.gazdaInDomenii("facebook.com.alt-site.ro", ["facebook.com"]), false);
});

test("referrerii ignorați: domeniul propriu și procesatorii de plăți nu creează sursă", () => {
  const ign = N.domeniiIgnorate(null, ["donatii.organizatie.ro", "www.alexandrit.ro"]);
  for (const h of ["checkout.stripe.com", "www.paypal.com", "secure.netopia-payments.com", "alexandrit.ro", "donatii.organizatie.ro", "euplatesc.ro", "smartfintech.ro"]) assert.equal(N.clasificaSursa(S({ referrerHost: h }), ign), null, h);
  // dar un referrer extern real rămâne sursă
  assert.equal(N.clasificaSursa(S({ referrerHost: "blog.exemplu.ro" }), ign), "alt_site");
  // un UTM rămâne valabil chiar dacă referrerul e ignorat (utilizatorul a venit dintr-un link etichetat)
  assert.equal(N.clasificaSursa(S({ referrerHost: "checkout.stripe.com", utmSource: "newsman" }), ign), "newsletter");
});

test("lista domeniilor ignorate se poate întreține din variabila de mediu", () => {
  const ign = N.domeniiIgnorate("https://www.partener-plati.ro/, alt.ro ,invalid domeniu");
  assert.ok(ign.includes("partener-plati.ro") && ign.includes("alt.ro"));
  assert.ok(!ign.some((d) => d.includes(" ")));
  assert.equal(N.clasificaSursa(S({ referrerHost: "pay.partener-plati.ro" }), ign), null);
});

test("semnalele din adresă: valorile originale se păstrează, identificatorii doar ca tip, referrerul doar ca hostname", () => {
  const s = url("utm_source=Facebook&utm_medium=PAID&utm_campaign=Campanie_Mare&fbclid=abc123&gclid=&referral_id=ab-12", "https://l.facebook.com/l.php?u=secret#x");
  assert.equal(s.utmCampaign, "Campanie_Mare");
  assert.equal(s.utmSource, "Facebook");
  assert.deepEqual(s.clickIds, ["fbclid"], "gclid gol nu contează");
  assert.equal(s.referrerHost, "l.facebook.com");
  assert.equal(s.referralId, "ab-12");
  assert.equal(url("", "android-app://com.google").referrerHost, null);
  assert.equal(url("", "nu e url").referrerHost, null);
  assert.equal(url("referral_id=<script>").referralId, null);
});

// ===== memoria atribuirii =====
const T0 = Date.parse("2026-11-01T10:00:00Z");
const ZI = 86_400_000;
const viz = (qs, ref) => url(qs, ref);

test("exemplul din cerință: newsletter → reclamă Facebook → revenire Direct → ultima sursă rămâne reclama", () => {
  let m = null;
  m = N.actualizeazaMemoria(m, viz("utm_source=newsman&utm_medium=email&utm_campaign=Iarna"), T0, true);
  assert.equal(N.clasificaSursa(m.prima), "newsletter");
  m = N.actualizeazaMemoria(m, viz("utm_source=facebook&utm_medium=paid&utm_campaign=Reclama1"), T0 + 2 * ZI, true);
  m = N.actualizeazaMemoria(m, viz("", null), T0 + 5 * ZI, true); // Direct
  assert.equal(N.clasificaSursa(m.prima), "newsletter", "prima rămâne Newsletter");
  assert.equal(N.clasificaSursa(m.ultima), "facebook_ads", "ultima rămâne reclama");
  assert.equal(m.ultima.utmCampaign, "Reclama1");
  assert.equal(m.ultima.la, T0 + 2 * ZI, "Direct nu prelungește durata sursei");
});

test("o revenire Direct nu înlocuiește sursa externă, nici dacă vine din domeniul propriu sau din procesator", () => {
  const m0 = N.actualizeazaMemoria(null, viz("utm_source=newsman&utm_medium=email"), T0, true);
  for (const ref of [null, "https://alexandrit.ro/strangere-fonduri/x", "https://checkout.stripe.com/c/pay", "https://www.paypal.com/checkoutnow"]) {
    const m = N.actualizeazaMemoria(m0, viz("", ref), T0 + ZI, true);
    assert.deepEqual(m, m0, String(ref));
  }
});

test("două surse externe succesive: prima rămâne prima, ultima se actualizează întreg", () => {
  let m = N.actualizeazaMemoria(null, viz("utm_source=linkedin", null), T0, true);
  m = N.actualizeazaMemoria(m, viz("utm_source=facebook&utm_medium=paid&utm_campaign=A&utm_content=banner1"), T0 + ZI, true);
  m = N.actualizeazaMemoria(m, viz("utm_source=newsman&utm_medium=email"), T0 + 2 * ZI, true);
  assert.equal(N.clasificaSursa(m.prima), "linkedin_organic");
  assert.equal(N.clasificaSursa(m.ultima), "newsletter");
  assert.equal(m.ultima.utmCampaign, null, "sursa nouă fără utm_campaign NU moștenește campania precedentă");
  assert.equal(m.ultima.utmContent, null, "nici conținutul");
  assert.deepEqual(m.ultima.clickIds, []);
});

test("expirare: după 90 de zile sursa nu se mai folosește; fără persistență nu există expirare în timp (stocarea de sesiune dispare cu sesiunea)", () => {
  const m = N.actualizeazaMemoria(null, viz("utm_source=newsman&utm_medium=email"), T0, true);
  assert.ok(N.eliminaExpirate(m, T0 + 89 * ZI, true));
  assert.equal(N.eliminaExpirate(m, T0 + 91 * ZI, true), null);
  // o vizită Direct după expirare nu readuce sursa
  assert.equal(N.actualizeazaMemoria(m, viz("", null), T0 + 100 * ZI, true), null);
  // doar prima expiră: prima devine cea mai veche sursă încă valabilă
  let m2 = N.actualizeazaMemoria(null, viz("utm_source=linkedin"), T0, true);
  m2 = N.actualizeazaMemoria(m2, viz("utm_source=newsman&utm_medium=email"), T0 + 80 * ZI, true);
  const dupa = N.eliminaExpirate(m2, T0 + 120 * ZI, true);
  assert.equal(N.clasificaSursa(dupa.prima), "newsletter");
  assert.equal(N.clasificaSursa(dupa.ultima), "newsletter");
  // fără persistență (sesiune): nu expiră
  assert.ok(N.eliminaExpirate(m, T0 + 400 * ZI, false));
  // ceas în viitor / valoare falsificată
  assert.equal(N.eliminaExpirate({ prima: { ...m.prima, la: T0 + 10 * ZI }, ultima: { ...m.ultima, la: T0 + 10 * ZI } }, T0, true), null);
});

test("sursă nouă după expirare începe de la zero (prima = ultima = noua sursă)", () => {
  const m = N.actualizeazaMemoria(null, viz("utm_source=newsman&utm_medium=email"), T0, true);
  const nou = N.actualizeazaMemoria(m, viz("utm_source=facebook&utm_medium=paid"), T0 + 95 * ZI, true);
  assert.equal(N.clasificaSursa(nou.prima), "facebook_ads");
  assert.equal(nou.prima.la, nou.ultima.la);
});

test("afiliatul e folosit doar dacă nu există altă sursă și nu înlocuiește una externă reală", () => {
  let m = N.actualizeazaMemoria(null, viz("referral_id=ab12"), T0, true);
  assert.equal(N.clasificaSursa(m.ultima), "afiliat");
  m = N.actualizeazaMemoria(m, viz("utm_source=newsman&utm_medium=email"), T0 + ZI, true);
  assert.equal(N.clasificaSursa(m.ultima), "newsletter");
  assert.equal(N.clasificaSursa(m.prima), "afiliat");
});

// ===== serializare și validare pe server =====
test("serializarea nu pierde nimic și serverul o validează din nou", () => {
  let m = N.actualizeazaMemoria(null, viz("utm_source=newsman&utm_medium=email&utm_campaign=Iarna", null), T0, true);
  m = N.actualizeazaMemoria(m, viz("utm_source=facebook&utm_medium=paid&utm_campaign=Reclama1&fbclid=x", "https://l.facebook.com/"), T0 + ZI, true);
  const brut = N.serializeazaSurse(m, true);
  assert.ok(brut.length < N.LUNGIME_MAXIMA_SURSE);
  const v = N.parseazaSurse(brut, T0 + 2 * ZI);
  assert.equal(v.persistent, true);
  assert.deepEqual(v.stare, m);
  const a = N.atribuireDeSalvat(v, N.domeniiIgnorate());
  assert.equal(a.prima.categorie, "newsletter");
  assert.equal(a.ultima.categorie, "facebook_ads");
  assert.equal(a.ultima.campanie, "Reclama1");
  assert.equal(a.prima.campanie, "Iarna");
  // categoria NU vine din browser: o categorie falsificată e ignorată
  const falsificat = JSON.stringify({ ...JSON.parse(brut), cat: "google_ads", u: { ...JSON.parse(brut).u, cat: "google_ads" } });
  assert.equal(N.atribuireDeSalvat(N.parseazaSurse(falsificat, T0 + 2 * ZI), N.domeniiIgnorate()).ultima.categorie, "facebook_ads");
  // expirat / stricat / prea lung
  assert.equal(N.parseazaSurse(brut, T0 + 200 * ZI), null);
  assert.equal(N.parseazaSurse("{nu e json", T0), null);
  assert.equal(N.parseazaSurse("x".repeat(N.LUNGIME_MAXIMA_SURSE + 1), T0), null);
  assert.equal(N.parseazaSurse(JSON.stringify({ w: 2 }), T0), null);
  assert.equal(N.serializeazaSurse(null, true), "");
});

test("serverul aplică domeniile proprii ale organizației: o sursă care era de fapt domeniul propriu nu devine sursă", () => {
  const stare = { prima: { ...S({ referrerHost: "donatii.organizatie.ro" }), la: T0 }, ultima: { ...S({ referrerHost: "donatii.organizatie.ro" }), la: T0 } };
  const brut = N.serializeazaSurse(stare, true);
  const valid = N.parseazaSurse(brut, T0 + ZI);
  assert.equal(N.atribuireDeSalvat(valid, N.domeniiIgnorate(null, ["donatii.organizatie.ro"])), null);
  assert.equal(N.atribuireDeSalvat(valid, N.domeniiIgnorate()).ultima.categorie, "alt_site");
});

// ===== EUR =====
test("conversia în EUR: EUR rămâne exact, RON se convertește cu cursul reținut, lipsa cursului NU devine 0", () => {
  assert.deepEqual(N.convertesteInEur({ sumaBani: 2500, moneda: "EUR", sumaLei: 125 }, null), { eurCenti: 2500, curs: null, baza: "eur" });
  assert.deepEqual(N.convertesteInEur({ sumaBani: null, moneda: null, sumaLei: 100 }, 5), { eurCenti: 2000, curs: 5, baza: "ron" });
  assert.deepEqual(N.convertesteInEur({ sumaBani: 10000, moneda: "RON", sumaLei: 100 }, 4.97), { eurCenti: 2012, curs: 4.97, baza: "ron" });
  assert.deepEqual(N.convertesteInEur({ sumaBani: 5000, moneda: "USD", sumaLei: 230 }, 4.6), { eurCenti: 5000, curs: 4.6, baza: "echivalent_lei" });
  for (const curs of [null, 0, -1, NaN]) assert.equal(N.convertesteInEur({ sumaBani: null, moneda: null, sumaLei: 100 }, curs).eurCenti, null, `curs ${curs}`);
  assert.equal(N.convertesteInEur({ sumaBani: null, moneda: null, sumaLei: null }, 5).eurCenti, null);
});

test("pondere: procent din total, fără total nu există pondere", () => {
  assert.equal(N.pondere(25, 100), 25);
  assert.equal(N.pondere(1, 3), 33.3);
  assert.equal(N.pondere(0, 0), null);
});
