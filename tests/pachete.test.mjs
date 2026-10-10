import { test } from "node:test";
import assert from "node:assert/strict";

const { PACKAGE_LIMITS, PRET_UTILIZATOR_SUPLIMENTAR, MAX_UTILIZATORI_SUPLIMENTARI, pretLunarPachet, utilizatoriSuplimentariValizi, etichetaPachet } = await import("../src/lib/billing/packages.ts");
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

test("utilizatorii suplimentari: doar la START, 15 lei fiecare, plafonați, cu preț calculat din cod", () => {
  assert.equal(PRET_UTILIZATOR_SUPLIMENTAR, 15);
  assert.equal(pretLunarPachet("start", 0), 49);
  assert.equal(pretLunarPachet("start", 1), 64);
  assert.equal(pretLunarPachet("start", MAX_UTILIZATORI_SUPLIMENTARI), 49 + 15 * MAX_UTILIZATORI_SUPLIMENTARI);
  // valori manipulate din client: negative, uriașe, fracționare, text, NaN
  assert.equal(utilizatoriSuplimentariValizi("start", -3), 0);
  assert.equal(utilizatoriSuplimentariValizi("start", 999), MAX_UTILIZATORI_SUPLIMENTARI);
  assert.equal(utilizatoriSuplimentariValizi("start", 1.6), 2);
  assert.equal(utilizatoriSuplimentariValizi("start", "abc"), 0);
  assert.equal(utilizatoriSuplimentariValizi("start", undefined), 0);
  // celelalte pachete ignoră cererea
  for (const p of ["crestere", "impact", "trial", "custom"]) assert.equal(utilizatoriSuplimentariValizi(p, 3), 0, p);
  assert.equal(pretLunarPachet("crestere", 3), PACKAGE_LIMITS.crestere.pretLunar);
  assert.equal(pretLunarPachet("trial", 2), null);
});

test("eticheta de pe comandă/factură menționează utilizatorii suplimentari", () => {
  assert.equal(etichetaPachet("start", 0), "Pachet START");
  assert.equal(etichetaPachet("start", 1), "Pachet START + 1 utilizator suplimentar");
  assert.equal(etichetaPachet("start", 3), "Pachet START + 3 utilizatori suplimentari");
});

test("pagina de prețuri spune același preț pe utilizator suplimentar ca și codul", () => {
  const ro = HUB_DICT.ro.comparatie.find((x) => x.f === "Utilizator suplimentar (fiecare)");
  const en = HUB_DICT.en.comparatie.find((x) => x.f === "Extra user (each)");
  assert.ok(ro && en);
  assert.ok(ro.v0.startsWith(String(PRET_UTILIZATOR_SUPLIMENTAR)), ro.v0);
  assert.ok(en.v0.startsWith(String(PRET_UTILIZATOR_SUPLIMENTAR)), en.v0);
});
