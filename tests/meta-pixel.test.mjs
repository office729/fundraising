import { test } from "node:test";
import assert from "node:assert/strict";

const { esteCaleCuPixel, evenimentMeta } = await import("../src/lib/meta-pixel-cale.ts");

test("Pixelul Meta rulează doar pe paginile publice de prezentare, niciodată pe aplicație sau pe paginile cu date personale", () => {
  for (const ok of ["/", "/hub", "/automatizari", "/cum-functioneaza", "/contact", "/signup", "/blog", "/blog/un-articol", "/hub/"]) assert.equal(esteCaleCuPixel(ok), true, ok);
  for (const nu of [
    "/salveaza-o-inima/crm",
    "/salveaza-o-inima/crm/donatori",
    "/salveaza-o-inima/maria-craciun", // linkul scurt al unei campanii
    "/strangere-fonduri/salveaza-o-inima/maria-craciun",
    "/f230/salveaza-o-inima/principal",
    "/dezabonare",
    "/invite/abc",
    "/reset-password",
    "/beneficiar/x",
    "/abonament/org/rezultat",
    "/cont",
    "/termeni-donatori", // pagini legale: fără pixel
    "/cookies",
  ])
    assert.equal(esteCaleCuPixel(nu), false, nu);
});

test("evenimentele aplicației devin evenimente Meta, restul nu se trimit", () => {
  assert.deepEqual(evenimentMeta("sign_up"), { nume: "CompleteRegistration", standard: true });
  assert.deepEqual(evenimentMeta("generate_lead"), { nume: "Lead", standard: true });
  assert.deepEqual(evenimentMeta("cta_trial_click"), { nume: "CtaTrialClick", standard: false });
  for (const nu of ["purchase", "begin_checkout", "page_context", "orice"]) assert.equal(evenimentMeta(nu), null, nu);
});
