// Generatorul de linkuri UTM: convenții consecvente, coduri neutre, fără date personale. Funcții pure, fără importuri.
// Numele campaniei umanitare și al beneficiarului NU intră în UTM: linkul poartă doar coduri (cmp_026, cr_014); legătura cu numele rămâne internă.

const COD = /^[a-z0-9][a-z0-9_.:-]{0,59}$/;
export const esteCodUtm = (v: string): boolean => COD.test(v.trim().toLowerCase());

export type PresetSursa = { cheie: string; eticheta: string; source: string; medium: string; platit: boolean; indiciu: string };

// Separă traficul din reclame (paid_social) de social organic, email, WhatsApp, voluntari și presă.
export const PRESETURI_SURSA: PresetSursa[] = [
  { cheie: "facebook-reclama", eticheta: "Facebook, reclamă", source: "facebook", medium: "paid_social", platit: true, indiciu: "Reclame plătite pe Facebook." },
  { cheie: "instagram-reclama", eticheta: "Instagram, reclamă", source: "instagram", medium: "paid_social", platit: true, indiciu: "Reclame plătite pe Instagram." },
  { cheie: "tiktok-reclama", eticheta: "TikTok, reclamă", source: "tiktok", medium: "paid_social", platit: true, indiciu: "Reclame plătite pe TikTok." },
  { cheie: "linkedin-reclama", eticheta: "LinkedIn, reclamă", source: "linkedin", medium: "paid_social", platit: true, indiciu: "Reclame plătite pe LinkedIn." },
  { cheie: "social-organic", eticheta: "Social organic", source: "facebook", medium: "organic_social", platit: false, indiciu: "Postări obișnuite, fără plată." },
  { cheie: "email", eticheta: "Email / newsletter", source: "newsletter", medium: "email", platit: false, indiciu: "Mesaje trimise pe email." },
  { cheie: "whatsapp", eticheta: "WhatsApp", source: "whatsapp", medium: "whatsapp", platit: false, indiciu: "Linkuri distribuite pe WhatsApp." },
  { cheie: "voluntari", eticheta: "Voluntari", source: "voluntari", medium: "voluntari", platit: false, indiciu: "Linkuri date voluntarilor." },
  { cheie: "presa", eticheta: "Presă", source: "presa", medium: "presa", platit: false, indiciu: "Articole și comunicate." },
];

// Etichetele și indiciile presetărilor în engleză, pe cheie (în română sunt în PRESETURI_SURSA).
export const PRESETURI_SURSA_EN: Record<string, { eticheta: string; indiciu: string }> = {
  "facebook-reclama": { eticheta: "Facebook, ad", indiciu: "Paid ads on Facebook." },
  "instagram-reclama": { eticheta: "Instagram, ad", indiciu: "Paid ads on Instagram." },
  "tiktok-reclama": { eticheta: "TikTok, ad", indiciu: "Paid ads on TikTok." },
  "linkedin-reclama": { eticheta: "LinkedIn, ad", indiciu: "Paid ads on LinkedIn." },
  "social-organic": { eticheta: "Organic social", indiciu: "Regular posts, unpaid." },
  email: { eticheta: "Email / newsletter", indiciu: "Messages sent by email." },
  whatsapp: { eticheta: "WhatsApp", indiciu: "Links shared on WhatsApp." },
  voluntari: { eticheta: "Volunteers", indiciu: "Links given to volunteers." },
  presa: { eticheta: "Press", indiciu: "Articles and press releases." },
};

export type RezultatLink = { ok: true; url: string } | { ok: false; eroare: string };

// Mesajele de eroare sunt în limba cerută prin `locale` (implicit română).
export function construiesteLink(input: { url: string; source: string; medium: string; campaign: string; content?: string }, locale: "ro" | "en" = "ro"): RezultatLink {
  const en = locale === "en";
  let baza: URL;
  try {
    baza = new URL(input.url.trim());
  } catch {
    return { ok: false, eroare: en ? "The page address isn't valid. Paste the full address, starting with https://." : "Adresa paginii nu e validă. Lipește adresa completă, cu https://." };
  }
  if (baza.protocol !== "https:" && baza.protocol !== "http:") return { ok: false, eroare: en ? "The address must start with https://." : "Adresa trebuie să înceapă cu https://." };
  const campuri: [string, string, string][] = [
    ["utm_source", input.source, en ? "Source" : "Sursa"],
    ["utm_medium", input.medium, en ? "Channel (medium)" : "Canalul (medium)"],
    ["utm_campaign", input.campaign, en ? "Campaign code" : "Codul campaniei"],
  ];
  for (const [nume, valoare, eticheta] of campuri) {
    if (!esteCodUtm(valoare)) {
      return {
        ok: false,
        eroare: en
          ? `${eticheta}: use only lowercase letters, digits and . _ : - (for example cmp_026), with no spaces, diacritics or people's names.`
          : `${eticheta}: folosește doar litere mici, cifre și . _ : - (de exemplu cmp_026), fără spații, diacritice sau nume de persoane.`,
      };
    }
    baza.searchParams.set(nume, valoare.trim().toLowerCase());
  }
  const continut = (input.content ?? "").trim().toLowerCase();
  if (continut) {
    if (!esteCodUtm(continut)) return { ok: false, eroare: en ? "Material code: use only lowercase letters, digits and . _ : - (for example cr_014)." : "Codul materialului: folosește doar litere mici, cifre și . _ : - (de exemplu cr_014)." };
    baza.searchParams.set("utm_content", continut);
  } else {
    baza.searchParams.delete("utm_content");
  }
  return { ok: true, url: baza.toString() };
}

// Următorul cod liber dintr-o serie (cmp_001, cmp_002, …), pe baza celor deja folosite.
export function urmatorulCod(prefix: string, folosite: string[]): string {
  let max = 0;
  const re = new RegExp(`^${prefix}_(\\d+)$`);
  for (const f of folosite) {
    const m = re.exec(f);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}_${String(max + 1).padStart(3, "0")}`;
}

// Parametrii de adăugat în câmpul „URL parameters” al unei reclame Meta; {{...}} sunt macrourile completate de Meta la afișare.
export const PARAMETRI_META = (campaign: string, content: string): string =>
  `utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign=${campaign}&utm_content=${content}`;
