import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";

const { RUTE_ORGANIZATIE, caleCampanie, caleReala, esteRutaOrganizatie } = await import("../src/lib/link-campanie.ts");
const { esteSlugRezervat } = await import("../src/lib/reserved-slugs.ts");

test("linkul scurt: /<org>/<campanie>; slugurile care ar umbri o rută a aplicației rămân pe linkul lung", () => {
  assert.equal(caleCampanie("salveaza-o-inima", "mihai-nicu"), "/salveaza-o-inima/mihai-nicu");
  assert.equal(caleCampanie("salveaza-o-inima", "crm"), "/strangere-fonduri/salveaza-o-inima/crm");
  assert.equal(caleCampanie("salveaza-o-inima", "setari"), "/strangere-fonduri/salveaza-o-inima/setari");
});

test("proxy-ul rescrie linkul scurt spre pagina reală a campaniei (și sub-paginile publice)", () => {
  assert.equal(caleReala("/salveaza-o-inima/mihai-nicu", esteSlugRezervat), "/strangere-fonduri/salveaza-o-inima/mihai-nicu");
  assert.equal(caleReala("/salveaza-o-inima/mihai-nicu/promovare", esteSlugRezervat), "/strangere-fonduri/salveaza-o-inima/mihai-nicu/promovare");
  assert.equal(caleReala("/salveaza-o-inima/mihai-nicu/multumim", esteSlugRezervat), "/strangere-fonduri/salveaza-o-inima/mihai-nicu/multumim");
});

test("rutele aplicației și ale platformei nu se rescriu", () => {
  for (const cale of ["/salveaza-o-inima", "/salveaza-o-inima/crm", "/salveaza-o-inima/crm/donatori", "/salveaza-o-inima/setari", "/salveaza-o-inima/echipa", "/salveaza-o-inima/mihai-nicu/altceva", "/blog/un-articol", "/v/abc123", "/f230/org", "/strangere-fonduri/salveaza-o-inima/mihai-nicu", "/a/b/c/d", "/"]) {
    assert.equal(caleReala(cale, esteSlugRezervat), null, cale);
  }
});

test("lista rutelor organizației acoperă toate directoarele din src/app/(app)/[orgSlug]", () => {
  const directoare = readdirSync(new URL("../src/app/(app)/[orgSlug]/", import.meta.url), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const lipsa = directoare.filter((d) => !esteRutaOrganizatie(d));
  assert.deepEqual(lipsa, [], `adaugă în RUTE_ORGANIZATIE (src/lib/link-campanie.ts): ${lipsa.join(", ")}`);
  assert.ok(RUTE_ORGANIZATIE.length >= directoare.length);
});
