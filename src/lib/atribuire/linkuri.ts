// Generatorul de linkuri de promovare: convenții consecvente, ca aceeași sursă să nu apară în rapoarte sub mai multe denumiri. Funcții pure, fără importuri externe.
// Linkurile duc către paginile PUBLICE (campanii, Formular 230, site-ul platformei), niciodată către CRM. Numele persoanelor nu intră în link: doar coduri.

export type PresetPromovare = {
  cheie: string;
  eticheta: string;
  source: string;
  medium: string;
  grup: "Social" | "Căutare" | "Email și mesagerie" | "Offline și parteneri";
  platit: boolean | null; // null = nu se poate stabili dintr-un link (nu e cazul pentru presetări)
  indiciu: string;
};

export const PRESETURI_PROMOVARE: PresetPromovare[] = [
  { cheie: "facebook-organic", eticheta: "Facebook, postare organică", source: "facebook", medium: "social", grup: "Social", platit: false, indiciu: "Postări obișnuite pe pagina sau în grupurile tale." },
  { cheie: "facebook-ads", eticheta: "Facebook, reclamă plătită", source: "facebook", medium: "paid_social", grup: "Social", platit: true, indiciu: "Reclame din Meta Ads Manager." },
  { cheie: "instagram-organic", eticheta: "Instagram, postare organică", source: "instagram", medium: "social", grup: "Social", platit: false, indiciu: "Bio, story sau postări obișnuite." },
  { cheie: "instagram-ads", eticheta: "Instagram, reclamă plătită", source: "instagram", medium: "paid_social", grup: "Social", platit: true, indiciu: "Reclame din Meta Ads Manager." },
  { cheie: "tiktok-organic", eticheta: "TikTok, organic", source: "tiktok", medium: "social", grup: "Social", platit: false, indiciu: "Link din profil sau din descrierea unui clip." },
  { cheie: "tiktok-ads", eticheta: "TikTok, reclamă plătită", source: "tiktok", medium: "paid_social", grup: "Social", platit: true, indiciu: "Reclame TikTok Ads." },
  { cheie: "linkedin-organic", eticheta: "LinkedIn, postare organică", source: "linkedin", medium: "social", grup: "Social", platit: false, indiciu: "Postări pe pagina organizației sau în feed." },
  { cheie: "linkedin-ads", eticheta: "LinkedIn, reclamă plătită", source: "linkedin", medium: "paid_social", grup: "Social", platit: true, indiciu: "Reclame LinkedIn Campaign Manager." },
  { cheie: "google-ads", eticheta: "Google Ads", source: "google", medium: "cpc", grup: "Căutare", platit: true, indiciu: "Reclame în rezultatele căutării (inclusiv Ad Grants)." },
  { cheie: "newsletter", eticheta: "Newsletter", source: "newsletter", medium: "email", grup: "Email și mesagerie", platit: false, indiciu: "Mesaje trimise pe email de organizație." },
  { cheie: "whatsapp", eticheta: "WhatsApp", source: "whatsapp", medium: "messaging", grup: "Email și mesagerie", platit: false, indiciu: "Linkuri distribuite în grupuri sau conversații." },
  { cheie: "qr", eticheta: "QR / afiș / material tipărit", source: "qr", medium: "qr", grup: "Offline și parteneri", platit: false, indiciu: "Cod QR pe afișe, pliante sau bannere." },
  { cheie: "partener", eticheta: "Site partener", source: "partener", medium: "referral", grup: "Offline și parteneri", platit: false, indiciu: "Link plasat pe site-ul unui partener sau al unei firme." },
  { cheie: "voluntari", eticheta: "Voluntari", source: "voluntari", medium: "referral", grup: "Offline și parteneri", platit: false, indiciu: "Linkuri date voluntarilor." },
];

export const PRESETURI_DUPA_CHEIE = new Map(PRESETURI_PROMOVARE.map((p) => [p.cheie, p]));

const COD = /^[a-z0-9][a-z0-9_.:-]{0,59}$/;
export const esteCodLink = (v: string): boolean => COD.test(v.trim().toLowerCase());

export type RezultatLink = { ok: true; url: string } | { ok: false; eroare: string };

// Adresa completă a linkului. `baza` e adresa paginii publice (https://…); campania de marketing și conținutul sunt coduri neutre
// (de exemplu craciun_2026 și postare_03); numele campaniei umanitare sau al unei persoane nu are ce căuta în ele.
export function construiesteLinkPromovare(input: { baza: string; source: string; medium: string; campaign: string; content?: string }): RezultatLink {
  let u: URL;
  try {
    u = new URL(input.baza.trim());
  } catch {
    return { ok: false, eroare: "Alege pagina către care trimiți." };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { ok: false, eroare: "Adresa paginii trebuie să înceapă cu https://." };
  const campuri: [string, string, string][] = [
    ["utm_source", input.source, "Sursa"],
    ["utm_medium", input.medium, "Canalul (medium)"],
    ["utm_campaign", input.campaign, "Numele campaniei de marketing"],
  ];
  for (const [nume, valoare, eticheta] of campuri) {
    if (!valoare.trim()) return { ok: false, eroare: `${eticheta}: completează câmpul.` };
    if (!esteCodLink(valoare)) return { ok: false, eroare: `${eticheta}: folosește doar litere mici, cifre și . _ : - (de exemplu craciun_2026), fără spații, diacritice sau nume de persoane.` };
    u.searchParams.set(nume, valoare.trim().toLowerCase());
  }
  const continut = (input.content ?? "").trim().toLowerCase();
  if (continut) {
    if (!esteCodLink(continut)) return { ok: false, eroare: "Identificatorul postării sau reclamei: folosește doar litere mici, cifre și . _ : - (de exemplu postare_03)." };
    u.searchParams.set("utm_content", continut);
  } else {
    u.searchParams.delete("utm_content");
  }
  return { ok: true, url: u.toString() };
}

// Din ce a scris omul într-un câmp (litere mari, spații, diacritice) -> cod valid; folosit la „Sugerează cod”.
export function sugereazaCod(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}
