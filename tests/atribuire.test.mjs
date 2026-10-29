import { test } from "node:test";
import assert from "node:assert/strict";

const C = await import("../src/lib/atribuire/clasificare.ts");
const X = C;
const M = await import("../src/lib/atribuire/model.ts");

const PROPRII = ["alexandrit.ro"];
const cl = (s) => C.clasifica(s, PROPRII);

test("Facebook organic și Facebook Ads, prin linkuri distincte, se separă", () => {
  const org = cl({ utmSource: "facebook", utmMedium: "social", utmCampaign: "cmp_001" });
  assert.deepEqual([org.sursa, org.canal, org.tip, org.metoda], ["facebook", "social_organic", "organic", "utm"]);
  const ads = cl({ utmSource: "facebook", utmMedium: "paid_social", utmCampaign: "cmp_001", utmContent: "cr_014" });
  assert.deepEqual([ads.sursa, ads.canal, ads.tip, ads.metoda, ads.continut], ["facebook", "social_platit", "platit", "utm", "cr_014"]);
});

test("Meta completează utm_source cu fb/ig/an/msg: sursele se normalizează", () => {
  assert.equal(cl({ utmSource: "fb", utmMedium: "paid_social" }).sursa, "facebook");
  assert.equal(cl({ utmSource: "ig", utmMedium: "paid_social" }).sursa, "instagram");
  assert.equal(cl({ utmSource: "an", utmMedium: "paid_social" }).sursa, "meta_audience_network");
  assert.equal(cl({ utmSource: "Facebook ", utmMedium: "Paid_Social" }).canal, "social_platit");
});

test("fbclid singur NU dovedește reclama: sursa e Facebook, tipul rămâne nedeterminat", () => {
  const c = cl({ adClickTip: "fbclid", adClickId: "IwAR123" });
  assert.deepEqual([c.sursa, c.canal, c.tip, c.metoda], ["facebook", "social_nedeterminat", "nedeterminat", "identificator_reclame"]);
});

test("referrer Facebook (m., l., lm.) dă platforma, nu tipul promovării", () => {
  for (const h of ["facebook.com", "m.facebook.com", "l.facebook.com", "lm.facebook.com"]) {
    const c = cl({ referrerHost: h });
    assert.deepEqual([c.sursa, c.canal, c.tip, c.metoda], ["facebook", "social_nedeterminat", "nedeterminat", "referrer"], h);
  }
  assert.equal(cl({ referrerHost: "l.instagram.com" }).sursa, "instagram");
});

test("fără UTM, fără referrer: Direct și „nedeterminat”, nu „organic”", () => {
  const c = cl({});
  assert.deepEqual([c.sursa, c.canal, c.tip, c.metoda], ["(direct)", "direct", "nedeterminat", "necunoscut"]);
  assert.ok(C.limitaClasificare(c));
});

test("gclid dovedește căutarea plătită; fără gclid, un referrer Google e căutare organică", () => {
  const p = cl({ adClickTip: "gclid", adClickId: "abc" });
  assert.deepEqual([p.sursa, p.canal, p.tip, p.metoda], ["google", "cautare_platita", "platit", "identificator_reclame"]);
  const o = cl({ referrerHost: "google.com" });
  assert.deepEqual([o.sursa, o.canal, o.tip], ["google", "cautare_organica", "organic"]);
  const g = cl({ utmSource: "google", utmMedium: "cpc" });
  assert.deepEqual([g.canal, g.tip], ["cautare_platita", "platit"]);
});

test("cpc pe o sursă socială e reclamă socială", () => {
  const c = cl({ utmSource: "facebook", utmMedium: "cpc" });
  assert.deepEqual([c.canal, c.tip], ["social_platit", "platit"]);
});

test("newsletter, WhatsApp și QR își păstrează canalele proprii și intră la neplătit", () => {
  const n = cl({ utmSource: "newsletter", utmMedium: "email" });
  assert.deepEqual([n.sursa, n.canal, n.tip], ["email", "email", "organic"]);
  const w = cl({ utmSource: "whatsapp", utmMedium: "messaging" });
  assert.deepEqual([w.sursa, w.canal, w.tip], ["whatsapp", "mesagerie", "organic"]);
  const q = cl({ utmSource: "afis", utmMedium: "qr" });
  assert.deepEqual([q.canal, q.tip], ["offline_qr", "organic"]);
});

test("utm_source fără utm_medium pe o platformă socială: nedeterminat", () => {
  const c = cl({ utmSource: "tiktok" });
  assert.deepEqual([c.sursa, c.canal, c.tip, c.metoda], ["tiktok", "social_nedeterminat", "nedeterminat", "utm"]);
});

test("domeniile proprii și procesatoarele de plată nu devin sursă", () => {
  for (const h of ["alexandrit.ro", "www.alexandrit.ro", "checkout.stripe.com", "paypal.com", "secure.mobilpay.ro"]) {
    const c = cl({ referrerHost: h });
    assert.equal(c.canal, "direct", h);
    assert.equal(c.referrerHost, null, h);
  }
});

test("conflict: UTM „organic” + identificator de plată de aceeași platformă -> plătit; platforme diferite -> nedeterminat", () => {
  const a = cl({ utmSource: "google", utmMedium: "organic", adClickTip: "gclid", adClickId: "x" });
  assert.deepEqual([a.canal, a.tip, a.metoda], ["cautare_platita", "platit", "identificator_reclame"]);
  const b = cl({ utmSource: "newsletter", utmMedium: "email", adClickTip: "gclid", adClickId: "x" });
  assert.equal(b.tip, "nedeterminat");
  assert.equal(b.canal, "email");
});

test("rețelele de reclame display dovedesc o reclamă; un site oarecare e referral organic", () => {
  assert.equal(cl({ referrerHost: "googleads.g.doubleclick.net" }).tip, "platit");
  const r = cl({ referrerHost: "blog-partener.ro" });
  assert.deepEqual([r.sursa, r.canal, r.tip, r.metoda], ["blog-partener.ro", "referral", "organic", "referrer"]);
});

test("etichetele UTM se curăță: litere mici, fără diacritice, fără caractere ciudate", () => {
  assert.equal(C.curataEticheta(" Campanie Crăciun 2026! "), "campanie_craciun_2026");
  assert.equal(C.curataEticheta("<script>"), "script");
  assert.equal(C.curataEticheta(""), null);
  assert.equal(C.curataEticheta(5), null);
  assert.equal(C.curataEticheta("a".repeat(100))?.length, 60);
});

test("semnaleDinUrl: citește doar parametrii permiși; gclid are prioritate față de fbclid; referrerul rămâne doar gazdă", () => {
  const q = new URLSearchParams("utm_source=Facebook&utm_medium=paid_social&nume=Ion&cnp=123&fbclid=ABC&gclid=XYZ");
  const s = X.semnaleDinUrl((n) => q.get(n), "https://l.facebook.com/l.php?u=secret&token=1");
  assert.equal(s.utmSource, "facebook");
  assert.equal(s.adClickTip, "gclid");
  assert.equal(s.referrerHost, "l.facebook.com");
  assert.ok(!JSON.stringify(s).includes("Ion") && !JSON.stringify(s).includes("123") && !JSON.stringify(s).includes("secret"));
});

test("contextul se serializează compact și se validează pe server: ID-uri false și câmpuri străine sunt aruncate", () => {
  const v = "11111111-1111-4111-8111-111111111111";
  const brut = X.serializeazaContext({ v, s: v, semnale: { utmSource: "facebook", utmMedium: "social", adClickTip: "fbclid", adClickId: "AB12", referrerHost: "l.facebook.com" } });
  assert.ok(brut.length < 400);
  const c = X.parseazaContext(brut);
  assert.equal(c.v, v);
  assert.equal(c.semnale.utmSource, "facebook");
  assert.equal(c.semnale.adClickTip, "fbclid");
  const rau = JSON.stringify({ w: 2, v: "nu-e-uuid", s: v, u: { us: "x".repeat(200), ct: "altceva", ci: "cnp 1234567890123", email: "a@b.ro" }, email: "a@b.ro" });
  const r = X.parseazaContext(rau);
  assert.equal(r.v, null);
  assert.equal(r.s, v);
  assert.equal(r.semnale.utmSource?.length, 60);
  assert.equal(r.semnale.adClickTip, null);
  assert.equal(r.semnale.adClickId, null);
  assert.ok(!JSON.stringify(r).includes("@"));
  assert.equal(X.parseazaContext("{nu json"), null);
  assert.equal(X.parseazaContext(JSON.stringify({ w: 1 })), null);
  assert.equal(X.parseazaContext("x".repeat(2000)), null);
});

test("caleCurata păstrează doar cale simplă, fără parametri", () => {
  assert.equal(X.caleCurata("/strangere-fonduri/org/pagina?email=a@b.ro#x"), "/strangere-fonduri/org/pagina");
  assert.equal(X.caleCurata("/f230/org/principal"), "/f230/org/principal");
  assert.equal(X.caleCurata("http://evil"), null);
  assert.equal(X.caleCurata("/a b"), null);
});

// ---------- modelul de atribuire ----------
const ACUM = new Date(Date.UTC(2026, 9, 28, 12));
const sesiune = (id, zileInainte, semnale) => ({ sesiuneId: id, la: new Date(ACUM.getTime() - zileInainte * 86_400_000), clasificare: cl(semnale) });

test("reclamă, revenire directă, donație în fereastră: ultima sursă nedirectă rămâne reclama", () => {
  const sesiuni = [
    sesiune("s1", 6, { utmSource: "facebook", utmMedium: "paid_social", utmCampaign: "cmp_001" }),
    sesiune("s2", 0, {}), // revenire directă, sesiunea conversiei
  ];
  const r = M.alegeAtribuire(sesiuni, "s2", ACUM, 30);
  assert.equal(r.sesiune.canal, "direct");
  assert.equal(r.ultima.canal, "social_platit");
  assert.equal(r.ultima.campanie, "cmp_001");
  assert.equal(r.prima.canal, "social_platit");
  assert.equal(M.atingerePentruModel(r, "ultima").canal, "social_platit");
  assert.equal(M.atingerePentruModel(r, "sesiune").canal, "direct");
});

test("o sursă nedirectă mai veche decât fereastra nu mai e eligibilă; prima sursă rămâne", () => {
  const sesiuni = [sesiune("s1", 45, { utmSource: "newsletter", utmMedium: "email" }), sesiune("s2", 0, {})];
  const r = M.alegeAtribuire(sesiuni, "s2", ACUM, 30);
  assert.equal(r.ultima, null);
  assert.equal(r.prima.canal, "email");
  assert.equal(M.atingerePentruModel(r, "ultima").canal, "direct");
  const larg = M.alegeAtribuire(sesiuni, "s2", ACUM, 60);
  assert.equal(larg.ultima.canal, "email");
});

test("între două surse nedirecte câștigă cea mai recentă; sesiunile de după conversie sunt ignorate", () => {
  const sesiuni = [
    sesiune("s1", 10, { utmSource: "facebook", utmMedium: "paid_social" }),
    sesiune("s2", 2, { utmSource: "newsletter", utmMedium: "email" }),
    sesiune("s3", -3, { utmSource: "tiktok", utmMedium: "paid_social" }),
  ];
  const r = M.alegeAtribuire(sesiuni, "s2", ACUM, 30);
  assert.equal(r.ultima.canal, "email");
  assert.equal(r.prima.canal, "social_platit");
});

test("fără istoric: o singură atingere din adresa curentă", () => {
  const r = M.atribuireDintrOAtingere(cl({ utmSource: "facebook", utmMedium: "social" }), ACUM);
  assert.equal(r.ultima.canal, "social_organic");
  const d = M.atribuireDintrOAtingere(cl({}), ACUM);
  assert.equal(d.ultima, null);
  assert.equal(M.atingerePentruModel(d, "ultima").canal, "direct");
});

test("rata: fără numitor nu există rată (nu 0%)", () => {
  assert.equal(M.rata(1, 0), null);
  assert.equal(M.rata(1, 4), 25);
});
