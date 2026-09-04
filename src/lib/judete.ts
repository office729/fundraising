// Lista canonică a celor 41 de județe + București — sursă unică, folosită de
// modulul CRM Companii (filtre) și de Formularul 230 (dropdown/filtru/hartă).
// Codurile sunt cele auto (identice cu ID-urile din pachetul "romania-map-kit",
// folosit pentru harta interactivă) — permit potrivire fiabilă între numele
// scrise de utilizator/formular și geometria hărții.
export const JUDETE = [
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani", "Brăila", "Brașov",
  "București", "Buzău", "Călărași", "Caraș-Severin", "Cluj", "Constanța", "Covasna", "Dâmbovița",
  "Dolj", "Galați", "Giurgiu", "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov",
  "Maramureș", "Mehedinți", "Mureș", "Neamț", "Olt", "Prahova", "Satu Mare", "Sălaj", "Sibiu",
  "Suceava", "Teleorman", "Timiș", "Tulcea", "Vaslui", "Vâlcea", "Vrancea",
] as const;

export type Judet = (typeof JUDETE)[number];

export const COD_JUDET: Record<Judet, string> = {
  "Alba": "AB", "Arad": "AR", "Argeș": "AG", "Bacău": "BC", "Bihor": "BH",
  "Bistrița-Năsăud": "BN", "Botoșani": "BT", "Brăila": "BR", "Brașov": "BV",
  "București": "B", "Buzău": "BZ", "Călărași": "CL", "Caraș-Severin": "CS",
  "Cluj": "CJ", "Constanța": "CT", "Covasna": "CV", "Dâmbovița": "DB", "Dolj": "DJ",
  "Galați": "GL", "Giurgiu": "GR", "Gorj": "GJ", "Harghita": "HR", "Hunedoara": "HD",
  "Ialomița": "IL", "Iași": "IS", "Ilfov": "IF", "Maramureș": "MM", "Mehedinți": "MH",
  "Mureș": "MS", "Neamț": "NT", "Olt": "OT", "Prahova": "PH", "Satu Mare": "SM",
  "Sălaj": "SJ", "Sibiu": "SB", "Suceava": "SV", "Teleorman": "TR", "Timiș": "TM",
  "Tulcea": "TL", "Vaslui": "VS", "Vâlcea": "VL", "Vrancea": "VN",
};

// Normalizează un județ scris liber (fără diacritice, orice literă mare/mică,
// eventual „jud.”/„județul” în față) la numele canonic din JUDETE — pentru
// potrivirea răspunsurilor vechi (câmp text liber) cu filtrul/harta.
function normalizeaza(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^jude(t|ț)ul?\s+/i, "")
    .trim();
}

const DUPA_NORMALIZARE = new Map(JUDETE.map((j) => [normalizeaza(j), j]));

export function gasesteJudet(textLiber: string | null | undefined): Judet | null {
  if (!textLiber) return null;
  return DUPA_NORMALIZARE.get(normalizeaza(textLiber)) ?? null;
}

export function codJudetDinTextLiber(textLiber: string | null | undefined): string | null {
  const judet = gasesteJudet(textLiber);
  return judet ? COD_JUDET[judet] : null;
}

// Invers față de COD_JUDET — folosit pentru afișare (ex. eticheta pe hover
// din harta interactivă), ca numele să apară cu diacritice corecte, nu cele
// din pachetul de hartă (romania-map-kit), care nu le are peste tot.
export const JUDET_DUPA_COD: Record<string, Judet> = Object.fromEntries(
  Object.entries(COD_JUDET).map(([judet, cod]) => [cod, judet as Judet]),
);
