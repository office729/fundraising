// Influenceri — importul din CSV / Excel: parserul de text (pe caractere, cu celule pe mai multe rânduri) și potrivirea coloanelor după antet. Fără importuri de valori.
// Excelul se citește în browser (xlsx) în rânduri de text și trece prin aceeași potrivire de coloane.

export const MAX_RANDURI_IMPORT = 2000;
export const LIMITA_BUCATA = 200; // rânduri trimise la server într-o cerere (corpul acțiunilor de server e limitat)

// Textul unui tabel în rânduri de celule. Separatorul (tab, ; sau ,) se alege după primul rând, în afara ghilimelelor.
// Ghilimelele protejează separatorul și rândul nou din celulă; "" înseamnă o ghilimea. Rândurile complet goale se sar.
export function parseazaTabel(textBrut: string): string[][] {
  const t = textBrut.replace(/^﻿/, "");
  const sep = alegeSeparator(t);
  const randuri: string[][] = [];
  let rand: string[] = [];
  let celula = "";
  let ghilimele = false;
  let rasarit = false; // celula curentă a avut conținut sau ghilimele (distinge „” gol de lipsă)
  const inchideCelula = () => {
    rand.push(celula.trim());
    celula = "";
    rasarit = false;
  };
  const inchideRand = () => {
    inchideCelula();
    if (rand.some((c) => c !== "")) randuri.push(rand);
    rand = [];
  };
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]!;
    if (ghilimele) {
      if (ch === '"') {
        if (t[i + 1] === '"') {
          celula += '"';
          i++;
        } else ghilimele = false;
      } else celula += ch;
      continue;
    }
    if (ch === '"' && celula.trim() === "") {
      ghilimele = true;
      rasarit = true;
    } else if (ch === sep) inchideCelula();
    else if (ch === "\r") {
      if (t[i + 1] === "\n") i++;
      inchideRand();
    } else if (ch === "\n") inchideRand();
    else {
      celula += ch;
      rasarit = true;
    }
  }
  if (rasarit || celula !== "" || rand.length > 0) inchideRand();
  return randuri;
}

function alegeSeparator(t: string): string {
  const numar: Record<string, number> = { "\t": 0, ";": 0, ",": 0 };
  let ghilimele = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]!;
    if (ch === '"') {
      if (ghilimele && t[i + 1] === '"') i++;
      else ghilimele = !ghilimele;
    } else if (!ghilimele) {
      if (ch === "\n" || ch === "\r") {
        if (Object.values(numar).some((n) => n > 0)) break; // primul rând cu conținut
      } else if (ch in numar) numar[ch]!++;
    }
  }
  if (numar["\t"]! > 0 && numar["\t"]! >= numar[";"]! && numar["\t"]! >= numar[","]!) return "\t";
  return numar[";"]! > numar[","]! ? ";" : ",";
}

export type CampImport =
  | "numePublic"
  | "nume"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "urm_instagram"
  | "urm_facebook"
  | "urm_tiktok"
  | "urm_youtube"
  | "categorie"
  | "domeniu"
  | "publicTinta"
  | "oras"
  | "judet"
  | "tara"
  | "email"
  | "telefon"
  | "sursaDate"
  | "note";

// Antetul fără diacritice, litere mici, „_” și „.” devin spații.
export function normAntet(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[_.\-:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const URM = "(?:urmaritori|followers|abonati|subscribers)";
const COLOANE: Array<[CampImport, RegExp]> = [
  ["urm_instagram", new RegExp(`^(?:${URM} (?:instagram|ig)|(?:instagram|ig) ${URM})$`)],
  ["urm_facebook", new RegExp(`^(?:${URM} (?:facebook|fb)|(?:facebook|fb) ${URM})$`)],
  ["urm_tiktok", new RegExp(`^(?:${URM} (?:tiktok|tik tok)|(?:tiktok|tik tok) ${URM})$`)],
  ["urm_youtube", new RegExp(`^(?:${URM} (?:youtube|yt)|(?:youtube|yt) ${URM}|abonati|subscribers)$`)],
  ["numePublic", /^(?:nume public|nume|name|influencer|creator|titlu)$/],
  ["nume", /^(?:nume real|nume complet|full name|real name)$/],
  ["instagram", /^(?:(?:link |url |profil |cont |pagina )?(?:instagram|ig|insta)(?: link| url| handle| username)?|handle instagram)$/],
  ["facebook", /^(?:(?:link |url |profil |cont |pagina )?(?:facebook|fb)(?: link| url| page)?|pagina facebook)$/],
  ["tiktok", /^(?:(?:link |url |profil |cont )?(?:tiktok|tik tok)(?: link| url| handle)?)$/],
  ["youtube", /^(?:(?:link |url |canal |profil )?(?:youtube|yt)(?: link| url| channel)?|canal)$/],
  ["categorie", /^(?:categorie|category|tip)$/],
  ["domeniu", /^(?:domeniu|nisa|niche|topic)$/],
  ["publicTinta", /^(?:public tinta|public|audienta|audience|target audience)$/],
  ["oras", /^(?:oras|city|localitate)$/],
  ["judet", /^(?:judet|judetul|county)$/],
  ["tara", /^(?:tara|country)$/],
  ["email", /^(?:email|e mail|mail|email profesional|email colaborare)$/],
  ["telefon", /^(?:telefon|phone|tel|mobil)$/],
  ["sursaDate", /^(?:sursa|sursa datelor|source|data source)$/],
  ["note", /^(?:note|notite|observatii|notes|comentarii)$/],
];

export function potrivesteColoana(antet: string): CampImport | null {
  const n = normAntet(antet);
  for (const [k, re] of COLOANE) if (re.test(n)) return k;
  return null;
}

export type RandImport = Partial<Record<Exclude<CampImport, `urm_${string}`>, string>> & { urmaritori: Partial<Record<"instagram" | "facebook" | "tiktok" | "youtube", number>> };

export type TabelImport = {
  antet: string[];
  harta: (CampImport | null)[];
  randuri: RandImport[];
  // Cîte rânduri nu au nimic de identificat (nici nume, nici handle, nici email) — se sar la import.
  goale: number;
  // Rândurile peste limită nu se importă.
  depasire: boolean;
};

// Primul rând = antetul. Fiecare coloană recunoscută se potrivește o singură dată (prima câștigă); restul se ignoră.
export function potrivesteTabel(celule: readonly (readonly string[])[], max = MAX_RANDURI_IMPORT): TabelImport {
  const antet = (celule[0] ?? []).map((c) => c.trim());
  const folosite = new Set<CampImport>();
  const harta = antet.map((h) => {
    const k = potrivesteColoana(h);
    if (!k || folosite.has(k)) return null;
    folosite.add(k);
    return k;
  });
  const randuri: RandImport[] = [];
  let goale = 0;
  const date = celule.slice(1);
  for (const r of date) {
    const rand: RandImport = { urmaritori: {} };
    harta.forEach((k, i) => {
      const v = (r[i] ?? "").trim();
      if (!k || !v) return;
      if (k.startsWith("urm_")) {
        const n = Math.round(Number(v.replace(/[^\d]/g, "")));
        if (Number.isFinite(n) && n > 0) rand.urmaritori[k.slice(4) as "instagram" | "facebook" | "tiktok" | "youtube"] = n;
      } else rand[k as Exclude<CampImport, `urm_${string}`>] = v;
    });
    if (!rand.numePublic && !rand.nume && !rand.instagram && !rand.facebook && !rand.tiktok && !rand.youtube && !rand.email) {
      goale++;
      continue;
    }
    randuri.push(rand);
  }
  return { antet, harta, randuri: randuri.slice(0, max), goale, depasire: randuri.length > max };
}

// Rândurile în bucăți pentru trimiterea la server.
export function inBucati<T>(randuri: readonly T[], marime = LIMITA_BUCATA): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < randuri.length; i += marime) out.push(randuri.slice(i, i + marime));
  return out;
}
