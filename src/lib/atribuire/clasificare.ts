// Clasificarea provenienței unei vizite: SURSĂ (de unde), CANAL (cum a ajuns), TIP DE PROMOVARE (organic / plătit / nedeterminat) și METODA prin
// care am aflat. Funcții pure, fără importuri, ca să se testeze și să ruleze identic în browser și pe server. Regulile sunt descrise în
// documentation/atribuire.md; ordinea de prioritate când semnalele se contrazic e cea din `clasifica` (de la cel mai sigur la cel mai slab):
//
//   1. Parametrii UTM (utm_source / utm_medium) pun sursa și canalul; sunt etichete puse de echipă.
//   2. Identificatori de reclame care DOVEDESC plata (gclid, gbraid, wbraid, msclkid, ttclid, li_fat_id): doar platforma de reclame îi adaugă
//      la clicurile pe reclame. Dacă UTM spune „organic” dar există un astfel de identificator de aceeași platformă, câștigă identificatorul
//      (eticheta poate fi greșită, identificatorul nu); dacă platformele diferă, tipul rămâne „nedeterminat”.
//   3. fbclid NU dovedește plata: Facebook îl adaugă la orice link accesat din Facebook, organic sau reclamă. Dă doar platforma.
//   4. Referrer-ul (site-ul de pe care a venit) dă platforma, dar nu dovedește dacă e reclamă sau postare organică.
//   5. Fără niciun semnal: Direct, tip „nedeterminat”. Absența UTM NU înseamnă trafic organic.
// Domeniile proprii și procesatoarele de plată nu sunt niciodată sursă (la revenirea din plată contează sursa inițială).

export type Canal =
  | "social_organic"
  | "social_platit"
  | "social_nedeterminat"
  | "cautare_organica"
  | "cautare_platita"
  | "email"
  | "mesagerie"
  | "referral"
  | "offline_qr"
  | "direct"
  | "altele";
export type TipPromovare = "organic" | "platit" | "nedeterminat";
export type Metoda = "utm" | "identificator_reclame" | "referrer" | "necunoscut";

export const ETICHETE_CANAL: Record<Canal, string> = {
  social_organic: "Social organic",
  social_platit: "Social plătit",
  social_nedeterminat: "Social (organic sau plătit nedeterminat)",
  cautare_organica: "Căutare organică",
  cautare_platita: "Căutare plătită",
  email: "Email",
  mesagerie: "Mesagerie",
  referral: "Referral",
  offline_qr: "Offline / QR",
  direct: "Direct",
  altele: "Alt canal",
};
export const ETICHETE_TIP: Record<TipPromovare, string> = { organic: "Organic (neplătit)", platit: "Plătit", nedeterminat: "Nedeterminat" };
export const ETICHETE_METODA: Record<Metoda, string> = {
  utm: "Etichetă UTM",
  identificator_reclame: "Identificator de reclame",
  referrer: "Site de proveniență (referrer)",
  necunoscut: "Necunoscută",
};
export const ETICHETE_CANAL_EN: Record<Canal, string> = {
  social_organic: "Organic social",
  social_platit: "Paid social",
  social_nedeterminat: "Social (organic or paid, undetermined)",
  cautare_organica: "Organic search",
  cautare_platita: "Paid search",
  email: "Email",
  mesagerie: "Messaging",
  referral: "Referral",
  offline_qr: "Offline / QR",
  direct: "Direct",
  altele: "Other channel",
};
export const ETICHETE_TIP_EN: Record<TipPromovare, string> = { organic: "Organic (unpaid)", platit: "Paid", nedeterminat: "Undetermined" };
export const ETICHETE_METODA_EN: Record<Metoda, string> = {
  utm: "UTM tag",
  identificator_reclame: "Ad click identifier",
  referrer: "Referring site (referrer)",
  necunoscut: "Unknown",
};
// Etichetele în limba cerută (implicit română).
export const etichetaCanal = (c: Canal, locale: "ro" | "en" = "ro"): string => (locale === "en" ? ETICHETE_CANAL_EN : ETICHETE_CANAL)[c];
export const etichetaTipPromovare = (t: TipPromovare, locale: "ro" | "en" = "ro"): string => (locale === "en" ? ETICHETE_TIP_EN : ETICHETE_TIP)[t];
export const etichetaMetoda = (m: Metoda, locale: "ro" | "en" = "ro"): string => (locale === "en" ? ETICHETE_METODA_EN : ETICHETE_METODA)[m];
export const CANALE: Canal[] = Object.keys(ETICHETE_CANAL) as Canal[];
export const TIPURI: TipPromovare[] = ["organic", "platit", "nedeterminat"];
export const esteCanal = (x: unknown): x is Canal => typeof x === "string" && x in ETICHETE_CANAL;
export const esteTip = (x: unknown): x is TipPromovare => x === "organic" || x === "platit" || x === "nedeterminat";
export const esteMetoda = (x: unknown): x is Metoda => x === "utm" || x === "identificator_reclame" || x === "referrer" || x === "necunoscut";

export type AdClickTip = "gclid" | "gbraid" | "wbraid" | "fbclid" | "ttclid" | "msclkid" | "li_fat_id";
export const AD_CLICK_TIPURI: AdClickTip[] = ["gclid", "gbraid", "wbraid", "fbclid", "ttclid", "msclkid", "li_fat_id"];
export const esteAdClickTip = (x: unknown): x is AdClickTip => typeof x === "string" && (AD_CLICK_TIPURI as string[]).includes(x);

// Semnalele brute ale unei vizite, așa cum le citim din adresă și din referrer (valori deja curățate).
export type Semnale = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  utmId?: string | null;
  adClickTip?: AdClickTip | null;
  adClickId?: string | null;
  referrerHost?: string | null;
};

export type Clasificare = {
  sursa: string;
  canal: Canal;
  tip: TipPromovare;
  metoda: Metoda;
  campanie: string | null;
  continut: string | null;
  termen: string | null;
  utmId: string | null;
  adClickTip: AdClickTip | null;
  adClickId: string | null;
  referrerHost: string | null;
};

// ---------- curățare ----------

// Etichetă UTM: litere mici, cifre și . _ : + -; spațiile devin „_”; fără diacritice sau alte caractere; cel mult 60 de caractere.
export function curataEticheta(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_.:+-]/g, "")
    .slice(0, 60);
  return t.length > 0 ? t : null;
}

// Doar numele gazdei, fără www, port, cale sau parametri.
export function gazdaCurata(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  let h = v.trim().toLowerCase();
  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//.test(h)) h = new URL(h).hostname;
  } catch {
    return null;
  }
  h = h.replace(/^www\./, "").split(/[/:?#]/)[0] ?? "";
  return /^[a-z0-9.-]{3,100}$/.test(h) && h.includes(".") ? h : null;
}

// ---------- platforme ----------

type TipPlatforma = "social" | "cautare" | "mesagerie" | "email";
const PLATFORME: { sursa: string; tip: TipPlatforma; nume: string[]; gazde: string[] }[] = [
  { sursa: "facebook", tip: "social", nume: ["facebook", "fb", "meta", "facebook.com"], gazde: ["facebook.com", "fb.com", "fb.me", "m.facebook.com", "l.facebook.com", "lm.facebook.com", "web.facebook.com", "business.facebook.com"] },
  { sursa: "instagram", tip: "social", nume: ["instagram", "ig", "insta"], gazde: ["instagram.com", "l.instagram.com"] },
  { sursa: "meta_audience_network", tip: "social", nume: ["an", "audience_network", "audience-network"], gazde: [] },
  { sursa: "tiktok", tip: "social", nume: ["tiktok", "tt"], gazde: ["tiktok.com", "vm.tiktok.com"] },
  { sursa: "linkedin", tip: "social", nume: ["linkedin", "li"], gazde: ["linkedin.com", "lnkd.in"] },
  { sursa: "x", tip: "social", nume: ["x", "twitter"], gazde: ["x.com", "twitter.com", "t.co"] },
  { sursa: "youtube", tip: "social", nume: ["youtube", "yt"], gazde: ["youtube.com", "youtu.be", "m.youtube.com"] },
  { sursa: "pinterest", tip: "social", nume: ["pinterest"], gazde: ["pinterest.com", "pin.it"] },
  { sursa: "reddit", tip: "social", nume: ["reddit"], gazde: ["reddit.com", "out.reddit.com"] },
  { sursa: "google", tip: "cautare", nume: ["google", "adwords", "googleads", "google_ads"], gazde: ["google.com", "google.ro", "google.co.uk", "google.de", "google.fr", "google.it", "google.es", "google.hu", "google.bg", "google.md"] },
  { sursa: "bing", tip: "cautare", nume: ["bing", "microsoft"], gazde: ["bing.com"] },
  { sursa: "duckduckgo", tip: "cautare", nume: ["duckduckgo"], gazde: ["duckduckgo.com"] },
  { sursa: "yahoo", tip: "cautare", nume: ["yahoo"], gazde: ["yahoo.com", "search.yahoo.com"] },
  { sursa: "ecosia", tip: "cautare", nume: ["ecosia"], gazde: ["ecosia.org"] },
  { sursa: "yandex", tip: "cautare", nume: ["yandex"], gazde: ["yandex.com", "yandex.ru"] },
  { sursa: "brave", tip: "cautare", nume: ["brave"], gazde: ["search.brave.com"] },
  { sursa: "whatsapp", tip: "mesagerie", nume: ["whatsapp", "wa"], gazde: ["wa.me", "whatsapp.com", "web.whatsapp.com", "api.whatsapp.com"] },
  { sursa: "telegram", tip: "mesagerie", nume: ["telegram", "tg"], gazde: ["t.me", "telegram.org", "web.telegram.org"] },
  { sursa: "messenger", tip: "mesagerie", nume: ["messenger", "msg"], gazde: ["messenger.com", "m.me"] },
  { sursa: "viber", tip: "mesagerie", nume: ["viber"], gazde: ["viber.com"] },
  { sursa: "sms", tip: "mesagerie", nume: ["sms"], gazde: [] },
  { sursa: "email", tip: "email", nume: ["email", "e-mail", "mail", "newsletter", "mailchimp", "mailerlite", "sendgrid", "brevo", "newsman", "themarketer"], gazde: ["mail.google.com", "outlook.live.com", "outlook.office.com", "outlook.office365.com", "mail.yahoo.com"] },
];

const potrivesteGazda = (h: string, gazda: string) => h === gazda || h.endsWith(`.${gazda}`);

function platformaDupaNume(nume: string | null) {
  if (!nume) return null;
  return PLATFORME.find((p) => p.nume.includes(nume)) ?? null;
}
function platformaDupaGazda(h: string | null) {
  if (!h) return null;
  return PLATFORME.find((p) => p.gazde.some((g) => potrivesteGazda(h, g))) ?? null;
}

// Site-uri care NU sunt o sursă: procesatoare de plată (la revenirea din plată contează sursa inițială) și servicii de autentificare.
const PROCESATORI_PLATA = ["stripe.com", "checkout.stripe.com", "js.stripe.com", "paypal.com", "paypal.me", "netopia-payments.com", "mobilpay.ro", "secure.mobilpay.ro", "pay.google.com", "applepay.apple.com", "3dsecure.io", "ing.ro", "bt24.ro", "bcr.ro", "raiffeisen.ro", "revolut.com"];
// Rețele de reclame display: un referrer de la ele dovedește o reclamă.
const RETELE_RECLAME = ["googleadservices.com", "doubleclick.net", "googlesyndication.com", "ads.google.com", "adsrvr.org", "criteo.com", "taboola.com", "outbrain.com"];

export function esteGazdaExclusa(h: string | null, gazdeProprii: string[]): boolean {
  if (!h) return false;
  return gazdeProprii.some((p) => p && potrivesteGazda(h, p)) || PROCESATORI_PLATA.some((p) => potrivesteGazda(h, p));
}

// ---------- medium ----------

type TipMedium = { canal: "social" | "cautare" | "email" | "mesagerie" | "offline_qr" | "referral" | "altele" | "afisare"; tip: TipPromovare };
const MEDIUMURI: Record<string, TipMedium> = {
  // plătit
  paid_social: { canal: "social", tip: "platit" }, paidsocial: { canal: "social", tip: "platit" }, "paid-social": { canal: "social", tip: "platit" }, social_paid: { canal: "social", tip: "platit" }, "social-paid": { canal: "social", tip: "platit" },
  paid_search: { canal: "cautare", tip: "platit" }, paidsearch: { canal: "cautare", tip: "platit" }, "paid-search": { canal: "cautare", tip: "platit" }, search_paid: { canal: "cautare", tip: "platit" }, sem: { canal: "cautare", tip: "platit" },
  cpc: { canal: "cautare", tip: "platit" }, ppc: { canal: "cautare", tip: "platit" },
  cpm: { canal: "afisare", tip: "platit" }, display: { canal: "afisare", tip: "platit" }, banner: { canal: "afisare", tip: "platit" }, paid: { canal: "afisare", tip: "platit" },
  // organic / neplătit
  social: { canal: "social", tip: "organic" }, organic_social: { canal: "social", tip: "organic" }, "organic-social": { canal: "social", tip: "organic" }, social_organic: { canal: "social", tip: "organic" }, "social-organic": { canal: "social", tip: "organic" }, post: { canal: "social", tip: "organic" },
  organic: { canal: "cautare", tip: "organic" }, organic_search: { canal: "cautare", tip: "organic" }, "organic-search": { canal: "cautare", tip: "organic" }, seo: { canal: "cautare", tip: "organic" },
  email: { canal: "email", tip: "organic" }, "e-mail": { canal: "email", tip: "organic" }, newsletter: { canal: "email", tip: "organic" }, mail: { canal: "email", tip: "organic" },
  messaging: { canal: "mesagerie", tip: "organic" }, whatsapp: { canal: "mesagerie", tip: "organic" }, sms: { canal: "mesagerie", tip: "organic" }, chat: { canal: "mesagerie", tip: "organic" }, messenger: { canal: "mesagerie", tip: "organic" },
  qr: { canal: "offline_qr", tip: "organic" }, offline: { canal: "offline_qr", tip: "organic" }, print: { canal: "offline_qr", tip: "organic" }, flyer: { canal: "offline_qr", tip: "organic" }, afis: { canal: "offline_qr", tip: "organic" },
  referral: { canal: "referral", tip: "organic" }, partener: { canal: "referral", tip: "organic" }, partner: { canal: "referral", tip: "organic" }, voluntari: { canal: "referral", tip: "organic" }, presa: { canal: "referral", tip: "organic" },
  // ambiguu: afiliere / sponsorizare (poate fi plătită)
  affiliate: { canal: "referral", tip: "nedeterminat" }, sponsor: { canal: "referral", tip: "nedeterminat" },
};

function canalDinMedium(m: TipMedium, platforma: TipPlatforma | null): Canal {
  switch (m.canal) {
    case "social":
      return m.tip === "platit" ? "social_platit" : "social_organic";
    case "cautare":
      return m.tip === "platit" ? "cautare_platita" : "cautare_organica";
    case "afisare":
      // Reclame display/bannere: pe o platformă socială sunt reclame sociale, altfel căutare/afișare plătită.
      return platforma === "social" ? "social_platit" : "cautare_platita";
    case "email":
      return "email";
    case "mesagerie":
      return "mesagerie";
    case "offline_qr":
      return "offline_qr";
    case "referral":
      return "referral";
    default:
      return "altele";
  }
}

// Mediumul „cpc/ppc/cpm” pe o sursă socială înseamnă reclamă socială, nu căutare plătită.
function ajusteazaMedium(m: TipMedium, platforma: TipPlatforma | null): TipMedium {
  if ((m.canal === "cautare" && m.tip === "platit") && platforma === "social") return { canal: "social", tip: "platit" };
  return m;
}

const CANAL_PLATFORMA: Record<TipPlatforma, { canal: Canal; tip: TipPromovare }> = {
  social: { canal: "social_nedeterminat", tip: "nedeterminat" },
  cautare: { canal: "cautare_organica", tip: "organic" },
  mesagerie: { canal: "mesagerie", tip: "organic" },
  email: { canal: "email", tip: "organic" },
};

const DOVADA_PLATA: Record<string, { sursa: string; canal: Canal }> = {
  gclid: { sursa: "google", canal: "cautare_platita" },
  gbraid: { sursa: "google", canal: "cautare_platita" },
  wbraid: { sursa: "google", canal: "cautare_platita" },
  msclkid: { sursa: "bing", canal: "cautare_platita" },
  ttclid: { sursa: "tiktok", canal: "social_platit" },
  li_fat_id: { sursa: "linkedin", canal: "social_platit" },
};

const goala = (s: Semnale, extra: Partial<Clasificare> = {}): Clasificare => ({
  sursa: "(direct)",
  canal: "direct",
  tip: "nedeterminat",
  metoda: "necunoscut",
  campanie: curataEticheta(s.utmCampaign),
  continut: curataEticheta(s.utmContent),
  termen: curataEticheta(s.utmTerm),
  utmId: curataEticheta(s.utmId),
  adClickTip: s.adClickTip ?? null,
  adClickId: s.adClickId ?? null,
  referrerHost: gazdaCurata(s.referrerHost),
  ...extra,
});

export function clasifica(semnale: Semnale, gazdeProprii: string[] = []): Clasificare {
  const utmSource = curataEticheta(semnale.utmSource);
  const utmMedium = curataEticheta(semnale.utmMedium);
  const referrer = gazdaCurata(semnale.referrerHost);
  const referrerUtil = referrer && !esteGazdaExclusa(referrer, gazdeProprii) ? referrer : null;
  const baza = goala(semnale, { referrerHost: referrerUtil });
  const click = semnale.adClickTip ?? null;

  // 1) UTM.
  if (utmSource || utmMedium) {
    const platforma = platformaDupaNume(utmSource);
    const sursa = platforma?.sursa ?? utmSource ?? "(necunoscut)";
    const medium = utmMedium ? MEDIUMURI[utmMedium] : undefined;
    let canal: Canal;
    let tip: TipPromovare;
    if (medium) {
      const m = ajusteazaMedium(medium, platforma?.tip ?? null);
      canal = canalDinMedium(m, platforma?.tip ?? null);
      tip = m.tip;
    } else if (platforma) {
      // Platformă cunoscută, dar mediumul lipsește sau nu e recunoscut: nu putem ști dacă e reclamă.
      ({ canal, tip } = CANAL_PLATFORMA[platforma.tip]);
      if (platforma.tip === "cautare") tip = "nedeterminat";
      if (platforma.tip === "cautare") canal = "altele";
    } else {
      canal = "altele";
      tip = "nedeterminat";
    }
    // 2) Un identificator care dovedește plata bate o etichetă „organică” (aceeași platformă); platforme diferite -> nedeterminat.
    if (click && click !== "fbclid") {
      const dovada = DOVADA_PLATA[click];
      if (dovada && tip !== "platit") {
        const aceeasiPlatforma = !platforma || platforma.sursa === dovada.sursa;
        if (aceeasiPlatforma) {
          return { ...baza, sursa: platforma?.sursa ?? dovada.sursa, canal: dovada.canal, tip: "platit", metoda: "identificator_reclame" };
        }
        tip = "nedeterminat";
      }
    }
    return { ...baza, sursa, canal, tip, metoda: "utm" };
  }

  // 2) Identificator care dovedește plata, fără UTM.
  if (click && click !== "fbclid") {
    const dovada = DOVADA_PLATA[click];
    if (dovada) return { ...baza, sursa: dovada.sursa, canal: dovada.canal, tip: "platit", metoda: "identificator_reclame" };
  }

  // 3) fbclid: platforma e Facebook, dar nu știm dacă e reclamă (apare la orice link accesat din Facebook).
  if (click === "fbclid") {
    return { ...baza, sursa: "facebook", canal: "social_nedeterminat", tip: "nedeterminat", metoda: "identificator_reclame" };
  }

  // 4) Referrer.
  if (referrerUtil) {
    if (RETELE_RECLAME.some((g) => potrivesteGazda(referrerUtil, g))) {
      return { ...baza, sursa: referrerUtil, canal: "cautare_platita", tip: "platit", metoda: "referrer" };
    }
    const platforma = platformaDupaGazda(referrerUtil);
    if (platforma) {
      const { canal, tip } = CANAL_PLATFORMA[platforma.tip];
      return { ...baza, sursa: platforma.sursa, canal, tip, metoda: "referrer" };
    }
    return { ...baza, sursa: referrerUtil, canal: "referral", tip: "organic", metoda: "referrer" };
  }

  // 5) Nimic: direct. Tipul rămâne „nedeterminat”, nu „organic”.
  return baza;
}

// Etichetă pentru rapoarte: „Facebook · Social plătit”.
const NUME_AFISAT: Record<string, string> = {
  x: "X (Twitter)",
  meta_audience_network: "Meta Audience Network",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  duckduckgo: "DuckDuckGo",
  email: "Email / newsletter",
  sms: "SMS",
};

export function etichetaSursa(sursa: string, locale: "ro" | "en" = "ro"): string {
  if (sursa === "(direct)") return "Direct";
  if (sursa === "(necunoscut)") return locale === "en" ? "Unknown" : "Necunoscută";
  if (NUME_AFISAT[sursa]) return NUME_AFISAT[sursa];
  return PLATFORME.some((x) => x.sursa === sursa) ? sursa.charAt(0).toUpperCase() + sursa.slice(1) : sursa;
}

// O singură linie pentru fișe: „Facebook · Social plătit · Plătit · cmp_ads”. Fără instantaneu de atribuire (conversie dinainte de activarea măsurării) -> „Fără sursă măsurată”.
export function etichetaProvenienta(p: { sursa: string | null; canal: string | null; tip: string | null; campanie?: string | null }, locale: "ro" | "en" = "ro"): string {
  if (!p.sursa) return locale === "en" ? "No measured source" : "Fără sursă măsurată";
  const canal = p.canal && p.canal in ETICHETE_CANAL ? etichetaCanal(p.canal as Canal, locale).replace(locale === "en" ? " (organic or paid, undetermined)" : " (organic sau plătit nedeterminat)", "") : null;
  const tip = p.tip && p.tip in ETICHETE_TIP ? etichetaTipPromovare(p.tip as TipPromovare, locale) : null;
  return [etichetaSursa(p.sursa, locale), canal, tip, p.campanie || null].filter(Boolean).join(" · ");
}

// Cuvinte de limită, afișate în rapoarte când nu s-a putut stabili.
export function limitaClasificare(c: Pick<Clasificare, "canal" | "tip" | "metoda" | "sursa">, locale: "ro" | "en" = "ro"): string | null {
  const en = locale === "en";
  if (c.canal === "direct") return en ? "No tag and no referring site: the source cannot be determined." : "Fără etichetă și fără site de proveniență: sursa nu poate fi stabilită.";
  if (c.tip === "nedeterminat") return en ? "The source is known, but it cannot be determined whether the promotion was organic or paid." : "Sursa e cunoscută, dar nu se poate stabili dacă promovarea a fost organică sau plătită.";
  return null;
}

// ==================== Context browser <-> server ====================
// Contextul de atribuire care circulă între browser și server: semnalele vizitei (UTM, identificator de reclame, referrer), identificatorul
// pseudonim al vizitatorului și al sesiunii (doar cu acord pentru statistici). Funcții pure, fără importuri externe.
// Nimic din browser nu e de încredere: serverul curăță orice câmp și recalculează clasificarea; organizația și campania se stabilesc pe server.


export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const esteUuid = (x: unknown): x is string => typeof x === "string" && UUID_RE.test(x);

export const FEREASTRA_IMPLICITA_ZILE = 30;
export const FEREASTRA_MINIMA_ZILE = 1;
export const FEREASTRA_MAXIMA_ZILE = 90;
export const INACTIVITATE_SESIUNE_MS = 30 * 60_000;
export const MODEL_VERSIUNE = "atribuire-v1";

export type Flux = "campanie" | "f230" | "sponsorizare20" | "platforma";
export const FLUXURI: Flux[] = ["campanie", "f230", "sponsorizare20", "platforma"];
export const ETICHETE_FLUX: Record<Flux, string> = {
  campanie: "Strângere de fonduri",
  f230: "Formular 230",
  sponsorizare20: "Sponsorizare 20%",
  platforma: "Platforma Alexandrit (înscrieri)",
};
export const ETICHETE_FLUX_EN: Record<Flux, string> = {
  campanie: "Fundraising campaign",
  f230: "Formular 230 (3.5% income-tax redirect)",
  sponsorizare20: "Sponsorship 20%",
  platforma: "Alexandrit platform (sign-ups)",
};
export const etichetaFlux = (f: Flux, locale: "ro" | "en" = "ro"): string => (locale === "en" ? ETICHETE_FLUX_EN : ETICHETE_FLUX)[f];
export const esteFlux = (x: unknown): x is Flux => typeof x === "string" && (FLUXURI as string[]).includes(x);

// Parametrii de adresă pe care îi citim; orice altceva din adresă (inclusiv date personale puse greșit în link) e ignorat și nu se salvează.
export const PARAMETRI_PERMISI = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id", ...AD_CLICK_TIPURI];

function valoareClick(v: string | null): string | null {
  if (!v) return null;
  const t = v.trim().slice(0, 120);
  return /^[A-Za-z0-9_.\-]+$/.test(t) ? t : null;
}

// Semnalele dintr-o adresă. `get` e `searchParams.get`-ul adresei; `referrer` e document.referrer (sau antetul referer) -> doar gazda se păstrează.
export function semnaleDinUrl(get: (nume: string) => string | null, referrer: string | null | undefined): Semnale {
  let adClickTip: AdClickTip | null = null;
  let adClickId: string | null = null;
  // Dacă sunt mai mulți identificatori, cel care dovedește plata are prioritate față de fbclid.
  const ordine = [...AD_CLICK_TIPURI].sort((a, b) => (a === "fbclid" ? 1 : 0) - (b === "fbclid" ? 1 : 0));
  for (const tip of ordine) {
    const v = valoareClick(get(tip));
    if (v) {
      adClickTip = tip;
      adClickId = v;
      break;
    }
  }
  return {
    utmSource: curataEticheta(get("utm_source")),
    utmMedium: curataEticheta(get("utm_medium")),
    utmCampaign: curataEticheta(get("utm_campaign")),
    utmContent: curataEticheta(get("utm_content")),
    utmTerm: curataEticheta(get("utm_term")),
    utmId: curataEticheta(get("utm_id")),
    adClickTip,
    adClickId,
    referrerHost: gazdaCurata(referrer ?? null),
  };
}

export const arataSemnale = (s: Semnale): boolean => !!(s.utmSource || s.utmMedium || s.adClickTip || s.referrerHost);
// O vizită „aduce o nouă atingere” (începe o sesiune nouă) dacă are etichete UTM sau identificator de reclame; un referrer simplu o face doar la prima pagină a sesiunii.
export const areEticheteDeCampanie = (s: Semnale): boolean => !!(s.utmSource || s.utmMedium || s.utmCampaign || s.adClickTip);

export type ContextAtribuire = {
  v: string | null; // vizitator pseudonim (doar cu acord)
  s: string | null; // sesiune (doar cu acord)
  semnale: Semnale;
};

// Forma compactă trimisă în câmpul ascuns al formularelor (cel mult ~600 de caractere).
export function serializeazaContext(c: ContextAtribuire): string {
  const u = c.semnale;
  const o: Record<string, unknown> = { w: 2 };
  if (c.v) o.v = c.v;
  if (c.s) o.s = c.s;
  const sem: Record<string, string> = {};
  const pune = (k: string, x: string | null | undefined) => {
    if (x) sem[k] = x;
  };
  pune("us", u.utmSource);
  pune("um", u.utmMedium);
  pune("uc", u.utmCampaign);
  pune("uk", u.utmContent);
  pune("ut", u.utmTerm);
  pune("ui", u.utmId);
  pune("ct", u.adClickTip);
  pune("ci", u.adClickId);
  pune("rh", u.referrerHost);
  if (Object.keys(sem).length) o.u = sem;
  return JSON.stringify(o);
}

export const LUNGIME_MAXIMA_CONTEXT = 900;

// Validare pe server a contextului primit: UUID-uri valide, semnale curățate din nou, nimic în plus.
export function parseazaContext(brut: unknown): ContextAtribuire | null {
  if (typeof brut !== "string" || !brut || brut.length > LUNGIME_MAXIMA_CONTEXT) return null;
  let o: unknown;
  try {
    o = JSON.parse(brut);
  } catch {
    return null;
  }
  return valideazaObiectContext(o);
}

export function valideazaObiectContext(o: unknown): ContextAtribuire | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  if (r.w !== 2) return null;
  const u = r.u && typeof r.u === "object" ? (r.u as Record<string, unknown>) : {};
  const ct = esteAdClickTip(u.ct) ? u.ct : null;
  const semnale: Semnale = {
    utmSource: curataEticheta(u.us),
    utmMedium: curataEticheta(u.um),
    utmCampaign: curataEticheta(u.uc),
    utmContent: curataEticheta(u.uk),
    utmTerm: curataEticheta(u.ut),
    utmId: curataEticheta(u.ui),
    adClickTip: ct,
    adClickId: ct ? valoareClick(typeof u.ci === "string" ? u.ci : null) : null,
    referrerHost: gazdaCurata(u.rh),
  };
  return { v: esteUuid(r.v) ? r.v : null, s: esteUuid(r.s) ? r.s : null, semnale };
}

// Calea paginii, fără parametri și fără fragment; doar cai publice simple (fără date personale în adresă).
export function caleCurata(cale: unknown): string | null {
  if (typeof cale !== "string") return null;
  const c = cale.split(/[?#]/)[0] ?? "";
  return /^\/[A-Za-z0-9/_\-.]{0,118}$/.test(c) ? c : null;
}
