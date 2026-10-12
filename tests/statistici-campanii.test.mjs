import { test } from "node:test";
import assert from "node:assert/strict";

const { esteBot, clasificaDispozitiv, gazdaDinReferrer, curataEticheta, clasificaSursa } = await import("../src/lib/statistici-campanii/clasificare.ts");

const PROPRII = ["alexandrit.ro"];
const sursa = (referrerHost, utmSource = null, utmMedium = null) => clasificaSursa({ referrerHost, utmSource, utmMedium, gazdeProprii: PROPRII });

test("roboții și previzualizările de link nu se numără ca vizitatori", () => {
  assert.equal(esteBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"), true);
  assert.equal(esteBot("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"), true);
  assert.equal(esteBot("WhatsApp/2.23.20 A"), true);
  assert.equal(esteBot(""), true);
  assert.equal(esteBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"), false);
  assert.equal(esteBot("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"), false);
});

test("dispozitivul: mobil, tabletă sau desktop", () => {
  assert.equal(clasificaDispozitiv("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148"), "mobil");
  assert.equal(clasificaDispozitiv("Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit Chrome/120 Mobile Safari/537.36"), "mobil");
  assert.equal(clasificaDispozitiv("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"), "tableta");
  assert.equal(clasificaDispozitiv("Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit Chrome/120 Safari/537.36"), "tableta");
  assert.equal(clasificaDispozitiv("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120"), "desktop");
});

test("din adresa de proveniență se păstrează doar gazda", () => {
  assert.equal(gazdaDinReferrer("https://www.facebook.com/groups/123/posts/456?x=1"), "facebook.com");
  assert.equal(gazdaDinReferrer("https://l.instagram.com/?u=abc"), "l.instagram.com");
  assert.equal(gazdaDinReferrer("nu e adresă"), null);
  assert.equal(gazdaDinReferrer(""), null);
});

test("etichetele din link se curăță", () => {
  assert.equal(curataEticheta(" Facebook "), "facebook");
  assert.equal(curataEticheta("<script>"), null);
  assert.equal(curataEticheta(null), null);
  assert.equal(curataEticheta("x".repeat(100))?.length, 60);
});

test("sursa traficului: direct, social, căutare, e-mail, site propriu, trimitere", () => {
  assert.equal(sursa(null).sursa, "direct");
  assert.equal(sursa("facebook.com").sursa, "social");
  assert.equal(sursa("l.instagram.com").sursa, "social");
  assert.equal(sursa("google.com").sursa, "cautare");
  assert.equal(sursa("google.ro").sursa, "cautare");
  assert.equal(sursa("alexandrit.ro").sursa, "site");
  assert.equal(sursa("blogulmeu.ro").sursa, "trimitere");
  // eticheta din link are prioritate față de adresa de proveniență
  assert.equal(sursa("mail.google.com", "newsletter", "email").sursa, "email");
  assert.equal(sursa(null, "facebook", "cpc").sursa, "social");
  assert.equal(sursa(null, "parteneri").sursa, "trimitere");
  // un domeniu care doar CONȚINE „x.com" nu e rețea socială
  assert.equal(sursa("mixx.com").sursa, "trimitere");
});

test("analiza (Google Analytics) nu rulează nici pe linkurile scurte ale campaniilor", async () => {
  const { esteCaleExclusa } = await import("../src/lib/analytics-cale.ts");
  const { caleReala } = await import("../src/lib/link-campanie.ts");
  const { esteSlugRezervat } = await import("../src/lib/reserved-slugs.ts");
  const esteCaleExclusaDinAnaliza = (p) => esteCaleExclusa(p, caleReala, esteSlugRezervat);
  // linkul lung și cel scurt al aceleiași campanii, plus subpaginile
  assert.equal(esteCaleExclusaDinAnaliza("/strangere-fonduri/salveaza-o-inima/maria-craciun"), true);
  assert.equal(esteCaleExclusaDinAnaliza("/salveaza-o-inima/maria-craciun"), true);
  assert.equal(esteCaleExclusaDinAnaliza("/salveaza-o-inima/maria-craciun/multumim"), true);
  assert.equal(esteCaleExclusaDinAnaliza("/strangere-fonduri/salveaza-o-inima/donator/gestioneaza"), true);
  // site-ul de marketing și aplicația rămân măsurate (cu consimțământ)
  assert.equal(esteCaleExclusaDinAnaliza("/"), false);
  assert.equal(esteCaleExclusaDinAnaliza("/hub"), false);
  assert.equal(esteCaleExclusaDinAnaliza("/automatizari"), false);
  assert.equal(esteCaleExclusaDinAnaliza("/salveaza-o-inima/crm"), false);
  assert.equal(esteCaleExclusaDinAnaliza("/salveaza-o-inima/crm/donatori"), false);
  assert.equal(esteCaleExclusaDinAnaliza("/salveaza-o-inima/setari"), false);
  // paginile cu date personale rămân excluse
  assert.equal(esteCaleExclusaDinAnaliza("/f230/salveaza-o-inima/principal"), true);
  assert.equal(esteCaleExclusaDinAnaliza("/dezabonare"), true);
});
