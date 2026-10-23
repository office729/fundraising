import { test } from "node:test";
import assert from "node:assert/strict";

import {
  blocuriVizibile,
  codeazaPentruAdresa,
  combinaPersonalizari,
  curataNota,
  LUNGIME_MAXIMA_NOTA,
  decodeazaDinAdresa,
  rezumatPersonalizare,
  valideazaOrePachet,
  valideazaPersonalizare,
  variantaPagina,
} from "../src/lib/personalizare-org.ts";

const ok = (brut) => {
  const r = valideazaPersonalizare(brut);
  assert.ok(r.ok, r.ok ? "" : r.eroare);
  return r.valoare;
};
const refuza = (brut) => assert.equal(valideazaPersonalizare(brut).ok, false, JSON.stringify(brut));

test("o configurare completă și corectă trece, normalizată", () => {
  const v = ok({
    v: 1,
    familie: "neutru",
    navAscunse: ["rfm", "rfm", "donatori/formular-230"],
    navEtichete: { donatori: "  Donatorii   noștri  " },
    dashboard: { ascunse: ["top-sponsori", "primii-pasi"], ordine: ["indicatori", "taskuri"] },
  });
  assert.deepEqual(v.navAscunse, ["rfm", "donatori/formular-230"], "duplicatele dispar");
  assert.equal(v.navEtichete.donatori, "Donatorii noștri", "spațiile se normalizează");
  assert.deepEqual(v.dashboard.ordine, ["indicatori", "taskuri"]);
});

test("configurarea goală e validă", () => {
  assert.deepEqual(ok({ v: 1 }), { v: 1 });
});

test("câmpuri necunoscute sau versiune greșită sunt refuzate", () => {
  refuza({ v: 1, altceva: true });
  refuza({ v: 2 });
  refuza({});
  refuza(null);
  refuza([]);
  refuza("text");
  refuza({ v: 1, dashboard: { alt: [] } });
});

test("familia trebuie să fie una din cele cinci", () => {
  refuza({ v: 1, familie: "inventata" });
  refuza({ v: 1, familie: 3 });
});

test("pagina de start, Facturarea și Setările nu se pot ascunde", () => {
  refuza({ v: 1, navAscunse: [""] });
  refuza({ v: 1, navAscunse: ["setari"] });
  refuza({ v: 1, navAscunse: ["facturare"] });
});

test("href-uri și denumiri invalide sunt refuzate", () => {
  refuza({ v: 1, navAscunse: ["../etc"] });
  refuza({ v: 1, navAscunse: ["rfm<script>"] });
  refuza({ v: 1, navAscunse: [5] });
  refuza({ v: 1, navEtichete: { donatori: "" } });
  refuza({ v: 1, navEtichete: { donatori: "x".repeat(41) } });
  refuza({ v: 1, navEtichete: { "Donatori": "ok" } }, "majuscule în href");
  refuza({ v: 1, navEtichete: { donatori: 5 } });
});

test("în denumiri nu rămân marcaje HTML sau caractere de control", () => {
  const v = ok({ v: 1, navEtichete: { donatori: "<b>Oameni</b>\n" } });
  assert.equal(v.navEtichete.donatori, "bOameni/b");
  assert.ok(!/[<>]/.test(v.navEtichete.donatori));
});

test("blocurile: necunoscute refuzate; ordinea doar din cele reordonabile, fără dubluri", () => {
  refuza({ v: 1, dashboard: { ascunse: ["inexistent"] } });
  refuza({ v: 1, dashboard: { ordine: ["primii-pasi"] } });
  refuza({ v: 1, dashboard: { ordine: ["taskuri", "taskuri"] } });
});

test("ordinea efectivă: cele din configurare întâi, restul după, cele ascunse dispar", () => {
  assert.deepEqual(blocuriVizibile(null), ["taskuri", "indicatori", "risc-pipeline", "top-sponsori"]);
  assert.deepEqual(blocuriVizibile({ v: 1, dashboard: { ordine: ["top-sponsori", "indicatori"] } }), ["top-sponsori", "indicatori", "taskuri", "risc-pipeline"]);
  assert.deepEqual(blocuriVizibile({ v: 1, dashboard: { ascunse: ["taskuri", "primii-pasi"] } }), ["indicatori", "risc-pipeline", "top-sponsori"]);
});

test("combinarea cu fișierul vechi: baza suprascrie denumirile, ascunderile se adună, protejatele nu se ascund", () => {
  const r = combinaPersonalizari(
    { hiddenNav: ["rfm", "setari"], navLabels: { donatori: "Vechi", companii: "Firme" } },
    { v: 1, navAscunse: ["calendar"], navEtichete: { donatori: "Nou" }, familie: "neutru" },
  );
  assert.deepEqual(r.navAscunse.sort(), ["calendar", "rfm"]);
  assert.deepEqual(r.navEtichete, { donatori: "Nou", companii: "Firme" });
  assert.equal(r.familie, "neutru");
  assert.deepEqual(combinaPersonalizari(undefined, null), { v: 1 });
});

test("codarea pentru adresă face drumul înapoi, cu diacritice", () => {
  const p = ok({ v: 1, navEtichete: { donatori: "Donatorii noștri ăîșț" }, dashboard: { ascunse: ["taskuri"] } });
  const cod = codeazaPentruAdresa(p);
  assert.match(cod, /^[A-Za-z0-9_-]+$/);
  const inapoi = decodeazaDinAdresa(cod);
  assert.ok(inapoi.ok);
  assert.deepEqual(inapoi.valoare, p);
});

test("un cod stricat sau nevalid e refuzat, nu aruncă", () => {
  assert.equal(decodeazaDinAdresa("!!!").ok, false);
  assert.equal(decodeazaDinAdresa("abc").ok, false);
  assert.equal(decodeazaDinAdresa("x".repeat(7000)).ok, false);
  // JSON valid, dar cu un câmp necunoscut
  const rau = btoa(JSON.stringify({ v: 1, hack: 1 })).replace(/=+$/, "");
  assert.equal(decodeazaDinAdresa(rau).ok, false);
});

test("variantele: doar pagini și opțiuni din registru", () => {
  assert.deepEqual(ok({ v: 1, variante: { decidenti: "grafic" } }).variante, { decidenti: "grafic" });
  refuza({ v: 1, variante: { decidenti: "inexistenta" } });
  refuza({ v: 1, variante: { pagina_inventata: "grafic" } });
  refuza({ v: 1, variante: { decidenti: 5 } });
  refuza({ v: 1, variante: [] });
  refuza({ v: 1, variante: { constructor: "grafic" } });
  refuza({ v: 1, variante: { decidenti: "constructor" } });
});

test("variantaPagina: întoarce varianta activă sau null", () => {
  assert.equal(variantaPagina({ v: 1, variante: { decidenti: "grafic" } }, "decidenti"), "grafic");
  assert.equal(variantaPagina({ v: 1 }, "decidenti"), null);
  assert.equal(variantaPagina(null, "decidenti"), null);
  // o valoare rămasă în baza de date dintr-o variantă scoasă din cod nu activează nimic
  assert.equal(variantaPagina({ v: 1, variante: { decidenti: "veche" } }, "decidenti"), null);
});

test("combinarea păstrează variantele din baza de date", () => {
  assert.deepEqual(combinaPersonalizari(undefined, { v: 1, variante: { decidenti: "grafic" } }).variante, { decidenti: "grafic" });
});

test("rezumatul: gol pentru aspectul standard, propoziții clare pentru ce diferă", () => {
  assert.deepEqual(rezumatPersonalizare(null), []);
  assert.deepEqual(rezumatPersonalizare({ v: 1 }), []);
  const linii = rezumatPersonalizare({
    v: 1,
    variante: { decidenti: "grafic" },
    familie: "neutru",
    navAscunse: ["rfm"],
    navEtichete: { donatori: "Donatorii noștri" },
    dashboard: { ascunse: ["top-sponsori"], ordine: ["indicatori", "taskuri"] },
  });
  assert.equal(linii.length, 6);
  assert.ok(linii[0].startsWith("Variantă la Decidenți: Cu grafic"));
  assert.ok(linii.some((l) => l === "Familie de dashboard: Neutru"));
  assert.ok(linii.some((l) => l.includes("intrări ascunse (rfm)")));
  assert.ok(linii.some((l) => l.includes("donatori → „Donatorii noștri”")));
  assert.ok(linii.some((l) => l.includes("blocuri ascunse (Top firme sponsori)")));
  assert.ok(linii.some((l) => l.includes("Indicatori și grafice → Centrul de acțiuni")));
});

test("rezumatul ignoră o variantă scoasă din cod, fără să dea eroare", () => {
  assert.deepEqual(rezumatPersonalizare({ v: 1, variante: { pagina_veche: "x" } }), []);
});

test("notița: se curăță, se limitează, goală rămâne goală", () => {
  assert.equal(curataNota("  Grafic la Decidenți, cerut de client.  "), "Grafic la Decidenți, cerut de client.");
  assert.equal(curataNota("linia 1\r\nlinia 2"), "linia 1\nlinia 2", "rândurile noi se normalizează");
  assert.equal(curataNota("a\u0000b\u0007c"), "abc", "caracterele de control dispar");
  assert.equal(curataNota("   "), "");
  assert.equal(curataNota("x".repeat(LUNGIME_MAXIMA_NOTA)), "x".repeat(LUNGIME_MAXIMA_NOTA));
  assert.equal(curataNota("x".repeat(LUNGIME_MAXIMA_NOTA + 1)), null, "prea lungă");
  assert.equal(curataNota(5), null);
  assert.equal(curataNota(null), null);
});

test("arataTimp: doar boolean; fals înseamnă „fără”; apare în rezumat și în combinare", () => {
  assert.equal(ok({ v: 1, arataTimp: true }).arataTimp, true);
  assert.deepEqual(ok({ v: 1, arataTimp: false }), { v: 1 });
  refuza({ v: 1, arataTimp: "da" });
  refuza({ v: 1, arataTimp: 1 });
  assert.ok(rezumatPersonalizare({ v: 1, arataTimp: true }).some((l) => l.includes("Timp alocat")));
  assert.equal(combinaPersonalizari(undefined, { v: 1, arataTimp: true }).arataTimp, true);
  assert.equal(combinaPersonalizari(undefined, { v: 1 }).arataTimp, undefined);
});

test("orele din pachet: pozitive, cu 2 zecimale, maximum; în configurare, rezumat și combinare", () => {
  assert.equal(valideazaOrePachet(40), 40);
  assert.equal(valideazaOrePachet("12,5"), 12.5);
  for (const x of [0, "0", -1, "abc", 10_001, 1.234, null, undefined, {}]) assert.equal(valideazaOrePachet(x), null, String(x));
  assert.equal(ok({ v: 1, arataTimp: true, orePachet: 40 }).orePachet, 40);
  refuza({ v: 1, arataTimp: true, orePachet: 0 });
  refuza({ v: 1, arataTimp: true, orePachet: "mult" });
  assert.ok(rezumatPersonalizare({ v: 1, arataTimp: true, orePachet: 40 }).some((l) => l.includes("pachet de 40 ore")));
  assert.equal(combinaPersonalizari(undefined, { v: 1, arataTimp: true, orePachet: 40 }).orePachet, 40);
});
