import { test } from "node:test";
import assert from "node:assert/strict";

const { PACKAGE_LIMITS } = await import("../src/lib/billing/packages.ts");
const { HUB_DICT } = await import("../src/lib/i18n/dictionaries/hub.ts");

const FIXE = ["start", "crestere", "impact"];
const inf = (n) => (n === null ? Infinity : n);

test("fiecare cotă crește (sau rămâne) de la START la CREȘTERE la IMPACT", () => {
  for (const camp of ["utilizatori", "contactePf", "companiiPj", "campaniiActive", "conturi230", "rapoarteCompaniiPeLuna"]) {
    const v = FIXE.map((p) => inf(PACKAGE_LIMITS[p][camp]));
    assert.ok(v[0] <= v[1] && v[1] <= v[2], `${camp}: ${v.join(" ≤ ")}`);
  }
  for (const camp of ["voluntariActivitati", "avatarComplet", "domeniuPropriu"]) {
    const v = FIXE.map((p) => Number(PACKAGE_LIMITS[p][camp]));
    assert.ok(v[0] <= v[1] && v[1] <= v[2], `${camp}: ${v.join(" ≤ ")}`);
  }
});

test("proba are tot ce are IMPACT, ca ONG-ul să poată evalua platforma complet", () => {
  for (const camp of ["campaniiActive", "conturi230", "voluntariActivitati", "avatarComplet", "domeniuPropriu"]) {
    assert.deepEqual(PACKAGE_LIMITS.trial[camp], PACKAGE_LIMITS.impact[camp], camp);
  }
});

test("valorile promise: START 1 campanie și 1 cont 230, fără activități pe teren; IMPACT cu domeniu propriu", () => {
  assert.equal(PACKAGE_LIMITS.start.campaniiActive, 1);
  assert.equal(PACKAGE_LIMITS.start.conturi230, 1);
  assert.equal(PACKAGE_LIMITS.start.voluntariActivitati, false);
  assert.equal(PACKAGE_LIMITS.crestere.campaniiActive, 5);
  assert.equal(PACKAGE_LIMITS.crestere.conturi230, 3);
  assert.equal(PACKAGE_LIMITS.crestere.voluntariActivitati, true);
  assert.equal(PACKAGE_LIMITS.impact.campaniiActive, null);
  assert.equal(PACKAGE_LIMITS.impact.domeniuPropriu, true);
  assert.equal(PACKAGE_LIMITS.crestere.domeniuPropriu, false);
});

test("pagina de prețuri spune exact ce impune codul (tabelul de comparare, în română și engleză)", () => {
  const text = (n, limba) => (n === null ? (limba === "ro" ? "Nelimitate" : "Unlimited") : String(n));
  const verifica = (limba, rand, camp) => {
    const rind = HUB_DICT[limba].comparatie.find((x) => x.f === rand);
    assert.ok(rind, `${limba}: lipsește rândul „${rand}”`);
    assert.deepEqual(
      [rind.v0, rind.v1, rind.v2],
      FIXE.map((p) => text(PACKAGE_LIMITS[p][camp], limba)),
      `${limba}: ${rand}`,
    );
  };
  verifica("ro", "Campanii active de strângere de fonduri", "campaniiActive");
  verifica("ro", "Conturi Formular 230", "conturi230");
  verifica("en", "Active fundraising campaigns", "campaniiActive");
  verifica("en", "Form 230 accounts", "conturi230");
  verifica("ro", "Rapoarte de impact pe lună", "rapoarteCompaniiPeLuna");
  verifica("en", "Impact reports per month", "rapoarteCompaniiPeLuna");
});

test("tabelul nu mai promite limite lunare care nu există în cod", () => {
  for (const limba of ["ro", "en"]) {
    for (const rand of HUB_DICT[limba].comparatie) {
      if (/sponsor|D177/i.test(rand.f)) assert.ok(/Nelimitat|Unlimited/.test(rand.v0), `${limba}: ${rand.f} (START) = ${rand.v0}`);
    }
    for (const plan of HUB_DICT[limba].abonamente) {
      assert.ok(!plan.items.some((i) => /\/ lună|\/ month/.test(i)), `${limba}: ${plan.nume} are o limită lunară în text`);
    }
  }
});
