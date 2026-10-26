import { test } from "node:test";
import assert from "node:assert/strict";

const S = await import("../src/lib/seo-schema.ts");

test("organizația: nume, firmă, logo și e-mail din site, fără evaluări inventate", () => {
  const o = S.schemaOrganizatie();
  assert.equal(o["@type"], "Organization");
  assert.equal(o.url, "https://alexandrit.ro");
  assert.equal(o.logo, "https://alexandrit.ro/alexandrit-logo.webp");
  assert.equal(o.legalName, "MEDIGROUPPLUS SRL");
  assert.ok(!("aggregateRating" in o) && !("review" in o));
});

test("aplicația: o ofertă lunară în lei pentru fiecare pachet, cu preț ca text", () => {
  const a = S.schemaAplicatie([{ nume: "Pachet START", pretLunar: 49 }, { nume: "Pachet IMPACT", pretLunar: 299 }], "Descriere");
  assert.equal(a["@type"], "SoftwareApplication");
  assert.equal(a.offers.length, 2);
  assert.equal(a.offers[0].price, "49");
  assert.equal(a.offers[0].priceCurrency, "RON");
  assert.equal(a.offers[1].priceSpecification.unitText, "MONTH");
  assert.ok(!("aggregateRating" in a));
});

test("firimiturile: Acasă, apoi pagina, cu adresă completă și cale normalizată", () => {
  const b = S.schemaFiriturie({ nume: "Hub", cale: "hub" });
  assert.equal(b.itemListElement.length, 2);
  assert.equal(b.itemListElement[0].position, 1);
  assert.equal(b.itemListElement[1].item, "https://alexandrit.ro/hub");
  assert.equal(S.schemaFiriturie({ nume: "Hub", cale: "/hub" }).itemListElement[1].item, "https://alexandrit.ro/hub");
});

test("site-ul: limba urmează vizitatorului", () => {
  assert.equal(S.schemaSite("ro").inLanguage, "ro-RO");
  assert.equal(S.schemaSite("en").inLanguage, "en");
});

test("serializare: „<” nu poate închide eticheta script, iar JSON-ul rămâne valid", () => {
  const text = S.serializeazaJsonLd({ name: "</script><script>alert(1)</script>" });
  assert.ok(!text.includes("<"));
  assert.equal(JSON.parse(text).name, "</script><script>alert(1)</script>");
});
