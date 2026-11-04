import { test } from "node:test";
import assert from "node:assert/strict";

const D = await import("../src/lib/campanii/distribuibil.ts");

const bun = { status: "activa", consimtamantGdpr: true, minor: false, acordDistribuireMinor: false, anonimizat: false, acordRetras: false, acordDiagnostic: false };

test("campanie activă, cu acord de publicare și fără restricții: se poate distribui", () => {
  assert.equal(D.poateFiDistribuit(bun), true);
  assert.equal(D.motivNedistribuibil(bun), null);
});

test("pagină închisă sau fără acord de publicare: nu se distribuie", () => {
  assert.equal(D.poateFiDistribuit({ ...bun, status: "inchisa" }), false);
  assert.equal(D.poateFiDistribuit({ ...bun, consimtamantGdpr: false }), false);
  assert.equal(D.motivNedistribuibil({ ...bun, consimtamantGdpr: false }), "fara_acord_publicare");
  // acordurile permit și pe o pagină închisă (starea paginii e separată)
  assert.equal(D.acordPermiteDistribuirea({ ...bun, status: "inchisa" }), true);
});

test("anonimizat sau acord retras: nu se distribuie, oricâte alte acorduri ar exista", () => {
  assert.equal(D.poateFiDistribuit({ ...bun, anonimizat: true }), false);
  assert.equal(D.poateFiDistribuit({ ...bun, acordRetras: true, acordDiagnostic: true }), false);
  assert.equal(D.motivNedistribuibil({ ...bun, anonimizat: true }), "anonimizat");
  assert.equal(D.motivNedistribuibil({ ...bun, acordRetras: true }), "acord_retras");
});

test("minor: doar cu acordul părintelui/tutorelui; acordul fără minor nu contează", () => {
  assert.equal(D.poateFiDistribuit({ ...bun, minor: true }), false);
  assert.equal(D.motivNedistribuibil({ ...bun, minor: true }), "minor_fara_acord");
  assert.equal(D.poateFiDistribuit({ ...bun, minor: true, acordDistribuireMinor: true }), true);
  assert.equal(D.poateFiDistribuit({ ...bun, minor: false, acordDistribuireMinor: true }), true);
  // un minor cu acord, dar retras sau anonimizat, rămâne blocat
  assert.equal(D.poateFiDistribuit({ ...bun, minor: true, acordDistribuireMinor: true, acordRetras: true }), false);
});

test("verificări stricte: valori lipsă sau de alt tip NU deschid distribuirea", () => {
  const { anonimizat, ...faraAnonimizat } = bun;
  assert.equal(anonimizat, false);
  assert.equal(D.poateFiDistribuit(faraAnonimizat), false);
  assert.equal(D.poateFiDistribuit({ ...bun, acordRetras: "false" }), false);
  assert.equal(D.poateFiDistribuit({ ...bun, consimtamantGdpr: 1 }), false);
  assert.equal(D.poateFiDistribuit({ ...bun, minor: undefined }), false);
});

test("povestea pleacă la AI doar cu acord de diagnostic ȘI bifa organizației ȘI campanie distribuibilă", () => {
  const cuDiag = { ...bun, acordDiagnostic: true };
  assert.equal(D.poatePlecaPovesteaLaAi(cuDiag, true), true);
  assert.equal(D.poatePlecaPovesteaLaAi(cuDiag, false), false);
  assert.equal(D.poatePlecaPovesteaLaAi(bun, true), false);
  assert.equal(D.poatePlecaPovesteaLaAi({ ...cuDiag, anonimizat: true }, true), false);
  assert.equal(D.poatePlecaPovesteaLaAi({ ...cuDiag, acordRetras: true }, true), false);
  assert.equal(D.poatePlecaPovesteaLaAi({ ...cuDiag, minor: true }, true), false);
  assert.equal(D.poatePlecaPovesteaLaAi({ ...cuDiag, status: "inchisa" }, true), false);
  assert.equal(D.poatePlecaPovesteaLaAi(cuDiag, undefined), false);
});

test("verdictul promovării cu AI: eroare clară RO/EN pentru campanii nedistribuibile, povestea compusă cu acordul de diagnostic", () => {
  const cuDiag = { ...bun, acordDiagnostic: true };
  assert.deepEqual(D.verdictPromovareAi(cuDiag, true, "ro"), { ok: true, povesteLaAi: true });
  assert.deepEqual(D.verdictPromovareAi(bun, true, "ro"), { ok: true, povesteLaAi: false });
  assert.deepEqual(D.verdictPromovareAi(cuDiag, false, "ro"), { ok: true, povesteLaAi: false });
  // pagină închisă: promovarea e permisă (mulțumiri), dar povestea nu pleacă
  assert.deepEqual(D.verdictPromovareAi({ ...cuDiag, status: "inchisa" }, true, "ro"), { ok: true, povesteLaAi: false });

  for (const p of [{ ...bun, anonimizat: true }, { ...bun, acordRetras: true }, { ...bun, minor: true }, { ...bun, consimtamantGdpr: false }]) {
    const ro = D.verdictPromovareAi(p, true, "ro");
    const en = D.verdictPromovareAi(p, true, "en");
    assert.equal(ro.ok, false);
    assert.equal(en.ok, false);
    assert.ok(ro.eroare.length > 20 && en.eroare.length > 20 && ro.eroare !== en.eroare);
    assert.match(ro.eroare, /AI/);
  }
});

test("citirea strictă a unei bife: lipsă = fals, exact „1” = adevărat, orice altceva = invalid", () => {
  assert.equal(D.citesteBifa([]), false);
  assert.equal(D.citesteBifa(["1"]), true);
  assert.equal(D.citesteBifa(["on"]), null);
  assert.equal(D.citesteBifa(["true"]), null);
  assert.equal(D.citesteBifa(["1", "1"]), null);
  assert.equal(D.citesteBifa([""]), null);
  assert.equal(D.citesteBifa([1]), null);
});

test("acorduriDin păstrează doar câmpurile regulii", () => {
  const rand = { ...bun, poveste: "text lung cu diagnostic", titlu: "x", acordDiagnostic: true };
  const a = D.acorduriDin(rand);
  assert.deepEqual(Object.keys(a).sort(), ["acordDiagnostic", "acordDistribuireMinor", "acordRetras", "anonimizat", "consimtamantGdpr", "minor", "status"]);
  assert.equal("poveste" in a, false);
});

test("condiția SQL pentru interogările brute urmează aceeași regulă și refuză aliasuri suspecte", () => {
  const c = D.conditieSqlDistribuibil("p");
  assert.equal(
    c,
    "p.status = 'activa' and p.consimtamant_gdpr = true and p.anonimizat = false and p.acord_retras = false and (p.minor = false or p.acord_distribuire_minor = true)",
  );
  assert.throws(() => D.conditieSqlDistribuibil("p; drop table x"));
  assert.throws(() => D.conditieSqlDistribuibil(""));
});
