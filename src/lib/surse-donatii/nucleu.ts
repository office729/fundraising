// „Sursele donațiilor”: nucleul PUR (fără importuri, rulează identic în browser și pe server, se testează direct). Conține:
//   1. clasificarea unei vizite în cele 10 categorii, în ordinea FIXĂ din cerință (prima regulă îndeplinită decide, chiar dacă parametrii se contrazic);
//   2. memoria atribuirii: prima și ultima sursă EXTERNĂ cu metadatele lor (o revenire Direct nu schimbă nimic; o sursă nouă înlocuiește tot setul „ultima”);
//   3. serializarea compactă pentru formularul de donație și validarea ei pe server;
//   4. conversia sumei în EUR, cu cursul reținut (nu se recalculează niciodată).
// Browserul trimite DOAR semnale brute (utm_*, tipurile de identificatori de click prezente, gazda referrerului); categoria o stabilește serverul din nou, cu
// aceleași reguli, deci un client modificat nu poate pune o categorie arbitrară.

export type CategorieSursa =
  | "facebook_ads"
  | "facebook_organic"
  | "google_ads"
  | "linkedin_ads"
  | "linkedin_organic"
  | "newsletter"
  | "organic_search"
  | "alte_retele"
  | "alt_site"
  | "afiliat";

// În ordinea priorității regulilor (1–10).
export const CATEGORII: readonly CategorieSursa[] = ["facebook_ads", "facebook_organic", "google_ads", "linkedin_ads", "linkedin_organic", "newsletter", "organic_search", "alte_retele", "alt_site", "afiliat"];

export const ETICHETE_SURSA: Record<CategorieSursa, string> = {
  facebook_ads: "Facebook / Instagram Ads",
  facebook_organic: "Facebook / Instagram (organic)",
  google_ads: "Google Ads",
  linkedin_ads: "LinkedIn Ads",
  linkedin_organic: "LinkedIn (organic)",
  newsletter: "Newsletter",
  organic_search: "Organic (căutare)",
  alte_retele: "Alte rețele sociale",
  alt_site: "Alt site",
  afiliat: "Afiliat",
};
export const ETICHETE_SURSA_EN: Record<CategorieSursa, string> = {
  facebook_ads: "Facebook / Instagram Ads",
  facebook_organic: "Facebook / Instagram (organic)",
  google_ads: "Google Ads",
  linkedin_ads: "LinkedIn Ads",
  linkedin_organic: "LinkedIn (organic)",
  newsletter: "Newsletter",
  organic_search: "Organic (search)",
  alte_retele: "Other social networks",
  alt_site: "Other website",
  afiliat: "Affiliate",
};
export const etichetaSursa = (c: CategorieSursa, locale: "ro" | "en" = "ro"): string => (locale === "en" ? ETICHETE_SURSA_EN : ETICHETE_SURSA)[c];
export const esteCategorieSursa = (x: unknown): x is CategorieSursa => typeof x === "string" && (CATEGORII as readonly string[]).includes(x);

// ---------- domenii ----------

// Procesatorii de plăți integrați: revenirea din ei nu e niciodată sursă. Lista se întreține AICI (sau, fără deploy de cod, prin variabila
// NEXT_PUBLIC_SURSE_DOMENII_IGNORATE: domenii separate prin virgulă, citită și în browser, și pe server).
export const DOMENII_PROCESATORI: readonly string[] = [
  "netopia.ro",
  "netopia-payments.com",
  "mobilpay.ro",
  "mobilpay.com",
  "stripe.com",
  "stripe.network",
  "paypal.com",
  "paypal.me",
  "euplatesc.ro",
  "euplatesc.com",
  "smartfintech.ro",
  "smartfintech.com",
  "pay.google.com",
];
// Domeniile proprii ale platformei (paginile de campanie rulează pe ele); domeniul propriu al fiecărei organizații se adaugă din cerere.
export const DOMENII_PLATFORMA: readonly string[] = ["alexandrit.ro"];

const FB_DOMENII = ["facebook.com", "fb.com", "instagram.com"];
const LI_DOMENII = ["linkedin.com", "lnkd.in"];
const ALTE_RETELE_DOMENII = ["twitter.com", "x.com", "t.co", "tiktok.com", "youtube.com", "youtu.be"];
const FB_SURSE = ["facebook", "fb", "ig", "instagram", "meta"];
const MEDIUM_REKLAMA = ["paid", "cpc", "ppc", "cpm", "paid_social", "ads"];
const MEDIUM_GOOGLE = ["cpc", "ppc", "paid"];
const LI_SURSE = ["linkedin", "li"];
const NEWSLETTER_SURSE = ["newsman", "newsletter"];
const ALTE_RETELE_SURSE = ["twitter", "x", "tiktok", "youtube"];

// Identificatori de click publicitar: păstrăm doar TIPUL (nu valoarea), suficient pentru reguli.
export const TIPURI_CLICK = ["fbclid", "gclid", "gbraid", "wbraid", "li_fat_id", "msclkid", "ttclid"] as const;
export type TipClick = (typeof TIPURI_CLICK)[number];

// Compară un hostname real (nu o căutare de text): `facebook.com.alt-site.ro` NU se potrivește cu `facebook.com`.
export function gazdaInDomenii(gazda: string | null | undefined, domenii: readonly string[]): boolean {
  if (!gazda) return false;
  const g = gazda.toLowerCase().replace(/\.$/, "");
  return domenii.some((d) => g === d || g.endsWith(`.${d}`));
}

// Motoarele de căutare: Google (orice extensie: google.com, google.ro, google.co.uk), Bing, Yahoo (inclusiv regionale), DuckDuckGo, Ecosia.
const RE_GOOGLE = /^(?:[a-z0-9-]+\.)*google\.(?:com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/;
const RE_YAHOO = /^(?:[a-z0-9-]+\.)*yahoo\.(?:com|[a-z]{2}|co\.[a-z]{2})$/;
export function esteMotorCautare(gazda: string | null | undefined): boolean {
  if (!gazda) return false;
  const g = gazda.toLowerCase().replace(/\.$/, "");
  return RE_GOOGLE.test(g) || RE_YAHOO.test(g) || gazdaInDomenii(g, ["bing.com", "duckduckgo.com", "ecosia.org"]);
}

// Domeniile ignorate: constantele + cele din variabila de mediu + domeniile proprii primite (gazda curentă, domeniul propriu al organizației).
export function domeniiIgnorate(extra?: string | null, proprii: readonly (string | null | undefined)[] = []): string[] {
  const dinMediu = (extra ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, ""))
    .filter((x) => /^[a-z0-9.-]{3,100}$/.test(x));
  const p = proprii.map((x) => (x ?? "").toLowerCase().replace(/^www\./, "")).filter((x) => /^[a-z0-9.-]{3,100}$/.test(x));
  return [...new Set([...DOMENII_PROCESATORI, ...DOMENII_PLATFORMA, ...dinMediu, ...p])];
}

// ---------- semnalele unei vizite ----------

export type SemnaleVizita = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null; // valoarea ORIGINALĂ (curățată), pentru afișare
  utmContent: string | null;
  utmTerm: string | null;
  clickIds: TipClick[]; // tipurile de identificatori prezenți
  referrerHost: string | null; // doar hostname, fără cale sau parametri
  referralId: string | null; // identificatorul de afiliat, dacă a venit în adresă
};

export const SEMNALE_GOALE: SemnaleVizita = { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null, clickIds: [], referrerHost: null, referralId: null };

const MAX_VALOARE = 100;
// Curăță o valoare din adresă: fără caractere de control, spații la capete, cel mult 100 de caractere. Păstrează literele mari/mici (afișare).
export function curataValoare(v: unknown, max = MAX_VALOARE): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max).trim();
  return t.length > 0 ? t : null;
}
const norm = (v: string | null | undefined): string => (v ?? "").trim().toLowerCase();

// Hostname din adresa referrerului. Doar http(s); orice altceva (about:, android-app:, șiruri invalide) => null.
export function gazdaDinReferrer(referrer: unknown): string | null {
  if (typeof referrer !== "string" || !referrer.trim()) return null;
  try {
    const u = new URL(referrer.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    const h = u.hostname.toLowerCase().replace(/\.$/, "");
    return /^[a-z0-9.-]{3,253}$/.test(h) && h.includes(".") ? h : null;
  } catch {
    return null;
  }
}

// Citește semnalele din adresa paginii (`get` = valoarea unui parametru) și din referrer.
export function semnaleDinUrl(get: (nume: string) => string | null, referrer: string | null | undefined): SemnaleVizita {
  const clickIds = TIPURI_CLICK.filter((t) => {
    const v = get(t);
    return typeof v === "string" && v.trim().length > 0;
  });
  const ref = curataValoare(get("referral_id"), 60);
  return {
    utmSource: curataValoare(get("utm_source")),
    utmMedium: curataValoare(get("utm_medium")),
    utmCampaign: curataValoare(get("utm_campaign")),
    utmContent: curataValoare(get("utm_content")),
    utmTerm: curataValoare(get("utm_term")),
    clickIds: [...clickIds],
    referrerHost: gazdaDinReferrer(referrer),
    referralId: ref && /^[A-Za-z0-9_.:-]+$/.test(ref) ? ref : null,
  };
}

// ---------- clasificarea (cele 10 reguli, în ordine) ----------

// `ignorate`: domeniile al căror referrer nu e niciodată sursă (proprii + procesatori). Întoarce categoria sau null (= Direct / fără sursă externă).
export function clasificaSursa(s: SemnaleVizita, ignorate: readonly string[] = domeniiIgnorate()): CategorieSursa | null {
  const src = norm(s.utmSource);
  const med = norm(s.utmMedium);
  const ids = new Set<string>(s.clickIds);
  const ref = s.referrerHost && !gazdaInDomenii(s.referrerHost, ignorate) ? s.referrerHost.toLowerCase().replace(/\.$/, "") : null;
  const refFb = gazdaInDomenii(ref, FB_DOMENII);
  const refLi = gazdaInDomenii(ref, LI_DOMENII);
  const srcFb = FB_SURSE.includes(src);
  const srcLi = LI_SURSE.includes(src);
  const reclama = MEDIUM_REKLAMA.includes(med);

  // 1. Facebook / Instagram Ads
  if ((srcFb || refFb) && reclama) return "facebook_ads";
  // 2. Facebook / Instagram organic (fbclid singur NU dovedește reclama)
  if (ids.has("fbclid") || srcFb || refFb) return "facebook_organic";
  // 3. Google Ads
  if (ids.has("gclid") || ids.has("gbraid") || ids.has("wbraid") || (MEDIUM_GOOGLE.includes(med) && src.includes("google"))) return "google_ads";
  // 4. LinkedIn Ads
  if (ids.has("li_fat_id") || ((srcLi || refLi) && reclama)) return "linkedin_ads";
  // 5. LinkedIn organic
  if (srcLi || refLi) return "linkedin_organic";
  // 6. Newsletter
  if (med === "email" || NEWSLETTER_SURSE.includes(src)) return "newsletter";
  // 7. Organic (căutare): motor de căutare, fără identificatori de click publicitar
  if (esteMotorCautare(ref) && s.clickIds.length === 0) return "organic_search";
  // 8. Alte rețele sociale
  if (ALTE_RETELE_SURSE.includes(src) || gazdaInDomenii(ref, ALTE_RETELE_DOMENII)) return "alte_retele";
  // 9. Alt site (referrer extern, neignorat, care nu se încadrează mai sus)
  if (ref) return "alt_site";
  // 10. Afiliat (doar dacă nu s-a identificat altă sursă)
  if (s.referralId) return "afiliat";
  return null;
}

// ---------- memoria atribuirii ----------

export const ZILE_PASTRARE = 90;
const ZI_MS = 86_400_000;
const TOLERANTA_CEAS_MS = 5 * 60_000;

export type SursaMemorata = SemnaleVizita & { la: number }; // la = momentul identificării (epoch ms)
export type StareSurse = { prima: SursaMemorata; ultima: SursaMemorata };

// Elimină ce a expirat. Cu persistență (acord statistici/marketing): 90 de zile de la identificarea fiecărei surse; fără persistență (doar sesiunea) nu expiră în timp,
// fiindcă stocarea de sesiune dispare odată cu sesiunea. Dacă a expirat ultima sursă, expiră tot; dacă a expirat doar prima, prima devine cea mai veche sursă încă valabilă (ultima).
export function eliminaExpirate(stare: StareSurse | null, acum: number, persistent: boolean): StareSurse | null {
  if (!stare) return null;
  if (stare.ultima.la > acum + TOLERANTA_CEAS_MS || stare.prima.la > acum + TOLERANTA_CEAS_MS) return null; // ceas greșit / valori falsificate
  if (!persistent) return stare;
  const limita = acum - ZILE_PASTRARE * ZI_MS;
  if (stare.ultima.la < limita) return null;
  if (stare.prima.la < limita) return { prima: stare.ultima, ultima: stare.ultima };
  return stare;
}

// O vizită nouă. Cu sursă externă: prima rămâne prima (dacă există), ultima se înlocuiește ÎNTREG (inclusiv campania: o sursă fără utm_campaign nu moștenește campania precedentă).
// Fără sursă externă (Direct, intern, revenire din procesator): memoria rămâne neschimbată, nu se prelungește și nu se șterge.
export function actualizeazaMemoria(stare: StareSurse | null, vizita: SemnaleVizita, acum: number, persistent: boolean, ignorate: readonly string[] = domeniiIgnorate()): StareSurse | null {
  const valida = eliminaExpirate(stare, acum, persistent);
  if (!clasificaSursa(vizita, ignorate)) return valida;
  const noua: SursaMemorata = { ...vizita, clickIds: [...vizita.clickIds], la: acum };
  return { prima: valida ? valida.prima : noua, ultima: noua };
}

// ---------- serializare compactă (formularul de donație) ----------

type SursaCompacta = { a?: string; b?: string; c?: string; d?: string; e?: string; i?: string[]; h?: string; r?: string; t: number };
export type ContextSurse = { w: 1; k: "p" | "s"; p: SursaCompacta; u: SursaCompacta };

const compacteaza = (s: SursaMemorata): SursaCompacta => {
  const o: SursaCompacta = { t: s.la };
  if (s.utmSource) o.a = s.utmSource;
  if (s.utmMedium) o.b = s.utmMedium;
  if (s.utmCampaign) o.c = s.utmCampaign;
  if (s.utmContent) o.d = s.utmContent;
  if (s.utmTerm) o.e = s.utmTerm;
  if (s.clickIds.length) o.i = [...s.clickIds];
  if (s.referrerHost) o.h = s.referrerHost;
  if (s.referralId) o.r = s.referralId;
  return o;
};

// `persistent`: starea vine din stocarea cu acord (localStorage) sau doar din sesiune.
export function serializeazaSurse(stare: StareSurse | null, persistent: boolean): string {
  if (!stare) return "";
  const o: ContextSurse = { w: 1, k: persistent ? "p" : "s", p: compacteaza(stare.prima), u: compacteaza(stare.ultima) };
  return JSON.stringify(o);
}

const text = (v: unknown, max: number): string | null => (typeof v === "string" ? curataValoare(v, max) : null);
function dinCompact(v: unknown): SursaMemorata | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const t = typeof r.t === "number" && Number.isFinite(r.t) ? Math.floor(r.t) : NaN;
  if (!(t > 0)) return null;
  const ids = Array.isArray(r.i) ? r.i.filter((x): x is TipClick => typeof x === "string" && (TIPURI_CLICK as readonly string[]).includes(x)).slice(0, TIPURI_CLICK.length) : [];
  const h = typeof r.h === "string" ? gazdaDinReferrer(`https://${r.h}/`) : null;
  const ref = text(r.r, 60);
  return {
    utmSource: text(r.a, MAX_VALOARE),
    utmMedium: text(r.b, MAX_VALOARE),
    utmCampaign: text(r.c, MAX_VALOARE),
    utmContent: text(r.d, MAX_VALOARE),
    utmTerm: text(r.e, MAX_VALOARE),
    clickIds: [...new Set(ids)],
    referrerHost: h,
    referralId: ref && /^[A-Za-z0-9_.:-]+$/.test(ref) ? ref : null,
    la: t,
  };
}

export const LUNGIME_MAXIMA_SURSE = 2600;

export type StareValidata = { stare: StareSurse; persistent: boolean };

// Validare pe SERVER a câmpului primit din browser: structură, lungimi, valori; apoi aceleași reguli de expirare. Întoarce null dacă nu e folosibilă.
export function parseazaSurse(intrare: unknown, acum: number): StareValidata | null {
  const brut = intrare !== null && typeof intrare === "object" ? JSON.stringify(intrare) : intrare;
  if (typeof brut !== "string" || !brut || brut.length > LUNGIME_MAXIMA_SURSE) return null;
  let o: unknown;
  try {
    o = JSON.parse(brut);
  } catch {
    return null;
  }
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  if (r.w !== 1) return null;
  const prima = dinCompact(r.p);
  const ultima = dinCompact(r.u);
  if (!prima || !ultima) return null;
  const persistent = r.k === "p";
  const stare = eliminaExpirate({ prima, ultima }, acum, true);
  return stare ? { stare, persistent } : null;
}

// ---------- ce se salvează pe donație ----------

export type SursaDeSalvat = {
  categorie: CategorieSursa;
  utmSource: string | null;
  utmMedium: string | null;
  campanie: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  clickIds: TipClick[];
  referrerHost: string | null;
  referralId: string | null;
  la: Date;
};
export type AtribuireDeSalvat = { prima: SursaDeSalvat | null; ultima: SursaDeSalvat; persistent: boolean };

const dinMemorata = (s: SursaMemorata, categorie: CategorieSursa): SursaDeSalvat => ({
  categorie,
  utmSource: s.utmSource,
  utmMedium: s.utmMedium,
  campanie: s.utmCampaign,
  utmContent: s.utmContent,
  utmTerm: s.utmTerm,
  clickIds: s.clickIds,
  referrerHost: s.referrerHost,
  referralId: s.referralId,
  la: new Date(s.la),
});

// Din starea primită (validată) calculează ce se copiază pe donație. Categoriile se re-derivă aici cu domeniile ignorate ale serverului (inclusiv domeniul propriu al
// organizației). Fără sursă externă recunoscută => null (donația rămâne Direct și nu intră în raport).
export function atribuireDeSalvat(valid: StareValidata | null, ignorate: readonly string[]): AtribuireDeSalvat | null {
  if (!valid) return null;
  const catU = clasificaSursa(valid.stare.ultima, ignorate);
  if (!catU) return null;
  const catP = clasificaSursa(valid.stare.prima, ignorate);
  return { prima: catP ? dinMemorata(valid.stare.prima, catP) : null, ultima: dinMemorata(valid.stare.ultima, catU), persistent: valid.persistent };
}

// ---------- EUR ----------

export type ConversieEur = { eurCenti: number | null; curs: number | null; baza: "eur" | "ron" | "echivalent_lei" | "indisponibila" };

// `sumaBani`+`moneda`: suma efectiv încasată (null/RON = lei * 100; EUR = cenți); `sumaLei`: echivalentul în lei reținut pe donație; `cursEurRon`: lei pentru 1 EUR la momentul plății.
// Fără curs sau fără sumă => conversie indisponibilă (null), NICIODATĂ 0: raportul semnalează înregistrarea.
export function convertesteInEur(i: { sumaBani: number | null; moneda: string | null; sumaLei: number | null }, cursEurRon: number | null): ConversieEur {
  const moneda = (i.moneda ?? "RON").trim().toUpperCase();
  if (moneda === "EUR" && i.sumaBani != null && Number.isFinite(i.sumaBani) && i.sumaBani >= 0) return { eurCenti: Math.round(i.sumaBani), curs: null, baza: "eur" };
  const curs = cursEurRon != null && Number.isFinite(cursEurRon) && cursEurRon > 0 ? cursEurRon : null;
  if (!curs) return { eurCenti: null, curs: null, baza: "indisponibila" };
  if (moneda === "RON") {
    const lei = i.sumaBani != null && Number.isFinite(i.sumaBani) ? i.sumaBani / 100 : i.sumaLei;
    if (lei == null || !Number.isFinite(lei) || lei < 0) return { eurCenti: null, curs: null, baza: "indisponibila" };
    return { eurCenti: Math.round((lei * 100) / curs), curs, baza: "ron" };
  }
  // Altă monedă (ex. USD/GBP la PayPal): folosim echivalentul în lei reținut pe donație, convertit în EUR la cursul momentului.
  if (i.sumaLei == null || !Number.isFinite(i.sumaLei) || i.sumaLei < 0) return { eurCenti: null, curs: null, baza: "indisponibila" };
  return { eurCenti: Math.round((i.sumaLei * 100) / curs), curs, baza: "echivalent_lei" };
}

// ---------- raport ----------

// Pondere (procent întreg cu o zecimală) din totalul afișat; fără total nu există pondere.
export function pondere(parte: number, total: number): number | null {
  return total > 0 ? Math.round((parte / total) * 1000) / 10 : null;
}
