import { test } from "node:test";
import assert from "node:assert/strict";

const { sumaLunaraSugerata } = await import("../src/lib/suma-lunara.ts");
const { PRESETURI_PROMOVARE, construiesteLinkPromovare } = await import("../src/lib/atribuire/linkuri.ts");
const { clasifica } = await import("../src/lib/atribuire/clasificare.ts");

test("suma lunară propusă: aproximativ un sfert din donație, rotunjit la 5 lei, între 10 și 50", () => {
  assert.equal(sumaLunaraSugerata(10), 10);
  assert.equal(sumaLunaraSugerata(20), 10);
  assert.equal(sumaLunaraSugerata(50), 15);
  assert.equal(sumaLunaraSugerata(100), 25);
  assert.equal(sumaLunaraSugerata(200), 50);
  assert.equal(sumaLunaraSugerata(5000), 50);
  assert.equal(sumaLunaraSugerata(0), 20);
  assert.equal(sumaLunaraSugerata(Number.NaN), 20);
  // Mereu în intervalul acceptat de pagina de campanie pentru ?suma= (5–1000)
  for (let s = 1; s <= 3000; s += 7) {
    const v = sumaLunaraSugerata(s);
    assert.ok(Number.isInteger(v) && v >= 5 && v <= 1000, String(s));
  }
});

test("presetul „Stand sau eveniment”: cod valid, nu e plătit și se clasifică la fel ca un QR", () => {
  const p = PRESETURI_PROMOVARE.find((x) => x.cheie === "eveniment");
  assert.ok(p);
  assert.equal(p.platit, false);
  const link = construiesteLinkPromovare({ baza: "https://alexandrit.ro/strangere-fonduri/org/campanie", source: p.source, medium: p.medium, campaign: "targ_mai_2026" });
  assert.equal(link.ok, true);
  assert.ok(link.url.includes("utm_source=eveniment") && link.url.includes("utm_medium=qr") && link.url.includes("utm_campaign=targ_mai_2026"));
  const clasa = clasifica({ utmSource: p.source, utmMedium: p.medium }, []);
  const clasaQr = clasifica({ utmSource: "qr", utmMedium: "qr" }, []);
  assert.equal(clasa.canal, clasaQr.canal);
  assert.equal(clasa.tip, clasaQr.tip);
});
