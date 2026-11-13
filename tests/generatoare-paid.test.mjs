import { test } from "node:test";
import assert from "node:assert/strict";

const P = await import("../src/lib/atribuire/linkuri.ts");
const U = await import("../src/lib/reclame/utm.ts");
const C = await import("../src/lib/atribuire/clasificare.ts");
const N = await import("../src/lib/surse-donatii/nucleu.ts");
const SEM = { ...N.SEMNALE_GOALE, clickIds: [] };

const PAID_PROMOVARE = ["facebook-paid", "instagram-paid", "tiktok-paid", "youtube-paid", "linkedin-paid", "google-paid"];

test("generatorul de promovare are variantele Paid (utm_medium=paid), marcate ca plătite", () => {
  for (const cheie of PAID_PROMOVARE) {
    const p = P.PRESETURI_DUPA_CHEIE.get(cheie);
    assert.ok(p, cheie);
    assert.equal(p.medium, "paid", cheie);
    assert.equal(p.platit, true, cheie);
  }
});

test("generatorul de reclame are variantele Paid (utm_medium=paid)", () => {
  for (const cheie of PAID_PROMOVARE) {
    const p = U.PRESETURI_SURSA.find((x) => x.cheie === cheie);
    assert.ok(p, cheie);
    assert.equal(p.medium, "paid", cheie);
    assert.equal(p.platit, true, cheie);
    assert.ok(U.PRESETURI_SURSA_EN[cheie], `${cheie} are text în engleză`);
  }
});

test("cheile presetărilor sunt unice, iar linkul Paid se construiește cu utm_medium=paid", () => {
  const chei = P.PRESETURI_PROMOVARE.map((x) => x.cheie);
  assert.equal(new Set(chei).size, chei.length);
  const chei2 = U.PRESETURI_SURSA.map((x) => x.cheie);
  assert.equal(new Set(chei2).size, chei2.length);
  const r = P.construiesteLinkPromovare({ baza: "https://exemplu.ro/strangere-fonduri/org/pagina", source: "facebook", medium: "paid", campaign: "craciun_2026", content: "reclama_01" });
  assert.equal(r.ok, true);
  const u = new URL(r.url);
  assert.equal(u.searchParams.get("utm_source"), "facebook");
  assert.equal(u.searchParams.get("utm_medium"), "paid");
});

test("variantele Paid sunt clasificate ca plătite de ambele straturi de atribuire", () => {
  for (const cheie of PAID_PROMOVARE) {
    const p = P.PRESETURI_DUPA_CHEIE.get(cheie);
    const c = C.clasifica({ utmSource: p.source, utmMedium: p.medium }, []);
    assert.equal(c.tip, "platit", `${cheie}: tip`);
  }
});

test("în „Sursele donațiilor”, toate variantele Paid ajung la categoria de reclamă plătită", () => {
  const cat = (source, medium) => N.clasificaSursa({ ...SEM, utmSource: source, utmMedium: medium });
  assert.equal(cat("facebook", "paid"), "facebook_ads");
  assert.equal(cat("instagram", "paid"), "facebook_ads");
  assert.equal(cat("linkedin", "paid"), "linkedin_ads");
  assert.equal(cat("google", "paid"), "google_ads");
  assert.equal(cat("tiktok", "paid"), "tiktok_ads");
  assert.equal(cat("youtube", "paid"), "youtube_ads");
});
