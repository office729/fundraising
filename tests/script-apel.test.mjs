import { test } from "node:test";
import assert from "node:assert/strict";

const S = await import("../src/lib/script-apel.ts");

const baza = { firma: "Firma X SRL", ong: "Asociația Y", askLei: 32_000, mecanism: "ambele", sezon: S.propozitieSezon([]), persoana: "Maria" };

test("mecanismul din marcaje: doar unul bifat îl alege; ambele sau niciunul = ambele", () => {
  assert.equal(S.mecanismDinMarcaje(true, false), "d177");
  assert.equal(S.mecanismDinMarcaje(false, true), "mec20");
  assert.equal(S.mecanismDinMarcaje(true, true), "ambele");
  assert.equal(S.mecanismDinMarcaje(false, false), "ambele");
});

test("propoziția despre sezon: ambele ferestre, doar D177 sau niciuna", () => {
  assert.ok(S.propozitieSezon([{ cheie: "d177" }, { cheie: "sponsorizare20" }]).includes("31 decembrie"));
  assert.ok(S.propozitieSezon([{ cheie: "d177" }]).includes("25 iunie"));
  assert.ok(S.propozitieSezon([]).includes("octombrie"));
});

test("scriptul are patru secțiuni în ordine și patru obiecții, personalizate cu firma, organizația și persoana", () => {
  const s = S.scriptApel(baza);
  assert.deepEqual(s.sectiuni.map((x) => x.titlu.slice(0, 2)), ["1.", "2.", "3.", "4."]);
  assert.equal(s.obiectii.length, 4);
  const text = S.scriptCaText(s);
  assert.ok(text.includes("Bună ziua, Maria!"));
  assert.ok(text.includes("Asociația Y"));
  assert.ok(text.includes("Firma X SRL"));
  assert.ok(text.includes("marți sau joi"));
  assert.ok(text.includes("Obiecții rapide"));
});

test("suma din cerere: rotunjită la sute, iar fără sumă se spune generic", () => {
  assert.ok(S.scriptCaText(S.scriptApel({ ...baza, askLei: 32_149 })).includes("32.100 lei"));
  assert.ok(S.scriptCaText(S.scriptApel({ ...baza, askLei: 0 })).includes("adaptat la ce vă permite impozitul pe profit"));
});

test("mecanismul ales apare în propunere; fără persoană salutul e generic", () => {
  const d = S.scriptCaText(S.scriptApel({ ...baza, mecanism: "d177", persoana: null }));
  assert.ok(d.includes("Declarația 177") && !d.includes("contract de sponsorizare scăzut"));
  assert.ok(d.includes("Bună ziua!"));
  const m = S.scriptCaText(S.scriptApel({ ...baza, mecanism: "mec20" }));
  assert.ok(m.includes("0,75% din cifra de afaceri"));
});
