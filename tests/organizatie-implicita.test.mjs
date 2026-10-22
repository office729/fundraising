import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// Fișierul importă alte fișiere din src/lib fără extensie (ca în aplicație); Node cere extensia, deci o adăugăm la rezolvare, doar în acest test.
register(
  "data:text/javascript," +
    encodeURIComponent(
      "export async function resolve(s, c, next) { try { return await next(s, c); } catch (e) { if (s.startsWith('.') && !s.endsWith('.ts') && !s.endsWith('.js')) return next(s + '.ts', c); throw e; } }",
    ),
  import.meta.url,
);
const { alegeOrganizatiaImplicita } = await import("../src/lib/auth/organizatie-implicita.ts");

const ZI = 86_400_000;
const proba = (slug, zileDeLaCreare) => ({ slug, createdAt: new Date(Date.now() - zileDeLaCreare * ZI), subscriptionStatus: "trialing", package: "trial", currentPeriodEnd: null });
const platita = (slug) => ({ slug, createdAt: new Date(Date.now() - 200 * ZI), subscriptionStatus: "active", package: "impact", currentPeriodEnd: new Date(Date.now() + 30 * ZI) });

test("fără organizații: null", () => {
  assert.equal(alegeOrganizatiaImplicita([], "a@b.ro"), null);
});

test("o singură organizație: aceea, chiar blocată", () => {
  assert.equal(alegeOrganizatiaImplicita([proba("test-andrei", 40)], "a@b.ro"), "test-andrei");
});

test("organizația proprie cu proba terminată + una cu abonament activ: cea activă", () => {
  assert.equal(alegeOrganizatiaImplicita([proba("test-andrei", 40), platita("asociatia")], "a@b.ro"), "asociatia");
});

test("prima deschisă după data aderării câștigă", () => {
  assert.equal(alegeOrganizatiaImplicita([platita("prima"), platita("a-doua")], "a@b.ro"), "prima");
  assert.equal(alegeOrganizatiaImplicita([proba("blocata", 40), proba("in-proba", 3), platita("platita")], "a@b.ro"), "in-proba");
});

test("toate blocate: cea mai veche, ca înainte", () => {
  assert.equal(alegeOrganizatiaImplicita([proba("veche", 90), proba("noua", 40)], "a@b.ro"), "veche");
});

test("administratorul platformei nu e blocat nicăieri: prima organizație", () => {
  assert.equal(alegeOrganizatiaImplicita([proba("veche", 90), platita("platita")], "vlad.placinta@alexandrit.ro"), "veche");
});
