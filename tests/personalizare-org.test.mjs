import { test } from "node:test";
import assert from "node:assert/strict";

import {
  blocuriVizibile,
  codeazaPentruAdresa,
  combinaPersonalizari,
  decodeazaDinAdresa,
  valideazaPersonalizare,
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
