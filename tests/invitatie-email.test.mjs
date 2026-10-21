import { test } from "node:test";
import assert from "node:assert/strict";

import { register } from "node:module";

// Șablonul importă alte fișiere din src/lib fără extensie (ca în aplicație); Node cere extensia, deci o adăugăm la rezolvare, doar în acest test.
register(
  "data:text/javascript," +
    encodeURIComponent(
      "export async function resolve(s, c, next) { try { return await next(s, c); } catch (e) { if (s.startsWith('.') && !/\\.[a-z]+$/.test(s)) return next(s + '.ts', c); throw e; } }",
    ),
  import.meta.url,
);
const { htmlInvitatie, subiectInvitatie } = await import("../src/lib/invitatie-email-template.ts");

const baza = { orgName: "Asociația Test", invitatDe: "Maria Pop", rol: "member", link: "https://alexandrit.ro/invite/abc123" };

test("subiectul rămâne același", () => {
  assert.equal(subiectInvitatie("Asociația Test"), "Invitație în Asociația Test pe Alexandrit");
});

test("conține butonul, linkul de rezervă, sigla și valabilitatea", () => {
  const h = htmlInvitatie(baza);
  assert.ok(h.includes("Acceptă invitația"));
  assert.equal(h.split("https://alexandrit.ro/invite/abc123").length - 1, 3, "linkul apare în buton, în href-ul de rezervă și ca text de rezervă");
  assert.ok(h.includes("alexandrit-logo-email.png"));
  assert.ok(h.includes("7 zile"));
  assert.ok(h.includes("Maria Pop"));
});

test("rolul schimbă textul", () => {
  assert.ok(htmlInvitatie(baza).includes("ca <strong>membru</strong>"));
  assert.ok(htmlInvitatie({ ...baza, rol: "admin" }).includes("ca <strong>administrator</strong>"));
});

test("adresa celui care invită nu devine link: caracter invizibil după @", () => {
  const h = htmlInvitatie({ ...baza, invitatDe: "colega@exemplu.ro" });
  assert.ok(h.includes("colega@&#8203;exemplu.&#8203;ro"), "și după punct, ca să nu se lege nici domeniul");
  assert.ok(!h.includes("colega@exemplu.ro"));
});

test("valorile din date sunt escapate", () => {
  const h = htmlInvitatie({ ...baza, orgName: "<img src=x onerror=a>", invitatDe: "<b>x</b>", link: 'https://x.ro/?a="b"' });
  assert.ok(!h.includes("<img src=x"));
  assert.ok(!h.includes("<b>x</b>"));
  assert.ok(!h.includes('?a="b"'));
});

test("fără nume la cel care invită: formulare neutră", () => {
  assert.ok(htmlInvitatie({ ...baza, invitatDe: null }).includes("Ai fost invitat(ă)"));
});
