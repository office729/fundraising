import { test } from "node:test";
import assert from "node:assert/strict";

const P = await import("../src/lib/popup-inscriere.ts");
const L = await import("../src/lib/prelansare.ts");

const LIVE = L.LIVE_DE_LA_MS;

test("momentul din pop-up e același cu lansarea site-ului din prelansare.ts", () => {
  assert.equal(P.POPUP_START_MS, L.LIVE_DE_LA_MS);
});

test("lansarea e pe 26 octombrie 2026, ora 06:00 în România (UTC+2, ora de iarnă)", () => {
  assert.equal(new Date(LIVE).toISOString(), "2026-10-26T04:00:00.000Z");
});

test("înainte de lansare pop-up-ul nu apare, oricât ar sta vizitatorul", () => {
  const acum = LIVE - 1;
  assert.equal(P.pesteCatArataPopup({ acum, primaVizita: LIVE - 3_600_000, ascunsPana: 0, cale: "/contact" }), null);
});

test("după lansare apare la 20 de secunde de la prima vizită; dacă a trecut deja, imediat", () => {
  const prima = LIVE + 5_000; // a intrat la 5 secunde după lansare
  assert.equal(P.pesteCatArataPopup({ acum: prima, primaVizita: prima, ascunsPana: 0, cale: "/contact" }), 20_000);
  assert.equal(P.pesteCatArataPopup({ acum: prima + 12_000, primaVizita: prima, ascunsPana: 0, cale: "/contact" }), 8_000);
  assert.equal(P.pesteCatArataPopup({ acum: prima + 20_000, primaVizita: prima, ascunsPana: 0, cale: "/contact" }), 0);
  assert.equal(P.pesteCatArataPopup({ acum: prima + 90_000, primaVizita: prima, ascunsPana: 0, cale: "/contact" }), 0);
});

test("cine era pe site dinainte de lansare primește cele 20 de secunde de la lansare, nu imediat", () => {
  const acum = LIVE + 2_000;
  assert.equal(P.pesteCatArataPopup({ acum, primaVizita: LIVE - 600_000, ascunsPana: 0, cale: "/contact" }), 18_000);
});

test("un vizitator care l-a închis sau a trimis formularul nu-l mai vede până la termen", () => {
  const acum = LIVE + 100_000;
  assert.equal(P.pesteCatArataPopup({ acum, primaVizita: LIVE, ascunsPana: acum + 1000, cale: "/contact" }), null);
  assert.equal(P.pesteCatArataPopup({ acum, primaVizita: LIVE, ascunsPana: acum - 1, cale: "/contact" }), 0);
});

test("nu apare pe textele legale și pe paginile de autentificare/înscriere", () => {
  for (const c of ["/gdpr", "/termeni", "/termeni-donatori", "/dpa", "/cookies", "/login", "/signup", "/forgot-password", "/gdpr/", "/prelansare"]) {
    assert.equal(P.caleExclusa(c), true, c);
  }
  for (const c of ["/", "/contact", "/hub", "/blog/ceva", "/cum-functioneaza"]) assert.equal(P.caleExclusa(c), false, c);
});

test("previzualizarea (?popup=previzualizare) apare imediat, oricând și pe orice pagină", () => {
  assert.equal(P.pesteCatArataPopup({ acum: 1, primaVizita: 1, ascunsPana: Number.MAX_SAFE_INTEGER, cale: "/gdpr", previzualizare: true }), 0);
});

test("formular: câmpurile obligatorii, e-mailul și telefonul opțional se verifică", () => {
  const bun = { nume: "Ana Pop", organizatie: "Asociația Lumină", email: "Ana@Lumina.ro", telefon: "", acord: true };
  const r = P.valideazaInteres(bun);
  assert.equal(r.ok, true);
  assert.equal(r.date.email, "ana@lumina.ro", "e-mailul se normalizează la litere mici");
  assert.equal(P.valideazaInteres({ ...bun, telefon: "+40 757 401 042" }).ok, true);
  const rau = P.valideazaInteres({ nume: "", organizatie: "A", email: "nu-e-email", telefon: "12", acord: false });
  assert.equal(rau.ok, false);
  assert.deepEqual(Object.keys(rau.erori).sort(), ["acord", "email", "nume", "organizatie", "telefon"]);
});

test("formular: fără bifa de confidențialitate nu se trimite; spațiile și caracterele de control se curăță", () => {
  const r = P.valideazaInteres({ nume: "  Ana\u0000   Pop ", organizatie: "ONG  Test", email: " a@b.ro ", telefon: "", acord: "true" });
  assert.equal(r.ok, false);
  assert.ok(r.erori.acord);
  const bun = P.valideazaInteres({ nume: "  Ana\u0000   Pop ", organizatie: "ONG  Test", email: " a@b.ro ", telefon: "", acord: true });
  assert.equal(bun.ok, true);
  assert.equal(bun.date.nume, "Ana Pop");
  assert.equal(bun.date.organizatie, "ONG Test");
  assert.equal(bun.date.email, "a@b.ro");
});

test("formular: valori ne-text (obiecte, liste) sunt respinse, nu arată ca text", () => {
  const r = P.valideazaInteres({ nume: { a: 1 }, organizatie: ["x"], email: 5, telefon: null, acord: true });
  assert.equal(r.ok, false);
  assert.ok(r.erori.nume && r.erori.organizatie && r.erori.email);
});

test("/descopera e adresă rezervată: niciun slug de organizație n-o poate umbri", async () => {
  const { esteSlugRezervat } = await import("../src/lib/reserved-slugs.ts");
  assert.equal(esteSlugRezervat("descopera"), true);
});

test("e-mailul respinge caracterele care ar strica antetul Reply-To sau linkul mailto", () => {
  const bun = { nume: "Ana Pop", organizatie: "Asociația Test", email: "ana@asociatia.ro", telefon: "", acord: true };
  assert.equal(P.valideazaInteres(bun).ok, true);
  for (const rau of ["a<b>@x.ro", 'a"b@x.ro', "a,b@x.ro", "a?subject=x@x.ro", "a&b@x.ro", "a;b@x.ro", "(a)@x.ro", "a@x.ro?cc=y@z.ro", "a@x,y.ro"]) {
    assert.equal(P.valideazaInteres({ ...bun, email: rau }).ok, false, rau);
  }
  assert.equal(P.valideazaInteres({ ...bun, email: "ana.pop+test@asociatia.ro" }).ok, true);
});

test("limita pe IP: IPv4 neschimbat, IPv6 rotunjit la rețeaua /64", () => {
  assert.equal(P.cheieIpPentruLimita("203.0.113.9"), "203.0.113.9");
  assert.equal(P.cheieIpPentruLimita("necunoscut"), "necunoscut");
  assert.equal(P.cheieIpPentruLimita(""), "necunoscut");
  assert.equal(P.cheieIpPentruLimita("::ffff:203.0.113.9"), "203.0.113.9");
  const a = P.cheieIpPentruLimita("2001:db8:1:2:aaaa:bbbb:cccc:dddd");
  const b = P.cheieIpPentruLimita("2001:0DB8:0001:0002:1111:2222:3333:4444");
  assert.equal(a, "2001:db8:1:2::/64");
  assert.equal(a, b, "aceeași rețea /64 = aceeași cheie");
  assert.notEqual(a, P.cheieIpPentruLimita("2001:db8:1:3::1"));
  assert.equal(P.cheieIpPentruLimita("2001:db8::1"), "2001:db8:0:0::/64");
});
