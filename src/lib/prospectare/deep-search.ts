// Deep Search pentru decidenți: partea pură (fără rețea, fără bază de date). Căutarea aduce DOAR nume + funcție de la fiecare furnizor; aici se unesc rezultatele,
// se scriu antetul și planul de aprobare (cine plătește ce). Emailul și telefonul se cumpără abia la „Aprobă”, de la furnizorul care a găsit persoana, doar pentru cei bifați.

export type CandidatDeep = {
  nume: string;
  rol: string;
  dept: string;
  linkedin: string;
  email: string;
  emailStatus: string | null;
  telefon?: string;
  sursa: string; // furnizorul care ține persoana: apollo | prospeo | lusha | hunter | web-ai
  ids?: Record<string, string>; // id-ul persoanei la fiecare furnizor care a găsit-o
  cerereLusha?: string;
  roConfirmat?: boolean;
  seniority?: string;
  sursaUrl?: string; // doar Internet (AI): pagina unde a fost găsită persoana
  alteSurse?: string[];
  // Doar la rândurile deja salvate în „De aprobat”: scorul și rolul stabilite la găsire.
  scor?: number;
  prioritate?: number | null;
  eticheta?: string;
};

const faraDiacritice = (s: string) =>
  (s || "")
    .replace(/[șş]/gi, "s")
    .replace(/[țţ]/gi, "t")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Cheia de potrivire ÎNTRE furnizori: numele complet, fără diacritice, cuvintele în ordine alfabetică („Popescu Ion” = „Ion Popescu”).
// Un nume dintr-un singur cuvânt (Apollo dă uneori doar prenumele) NU are cheie: ar contopi persoane diferite.
export function cheieNumeComplet(nume: string): string {
  const cuvinte = faraDiacritice(nume)
    .replace(/[^a-z\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);
  return cuvinte.length >= 2 ? [...cuvinte].sort().join(" ") : "";
}

// Cheia salvată în baza de date (unică pe firmă): numele complet sortat; pentru un nume dintr-un singur cuvânt se adaugă furnizorul, ca persoanele de la furnizori diferiți să nu se suprascrie.
export function cheieStocata(nume: string, sursa: string): string {
  const cuvinte = faraDiacritice(nume)
    .replace(/[^a-z\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);
  const k = [...cuvinte].sort().join(" ");
  return cuvinte.length >= 2 ? k : `${k}~${sursa}`;
}

const unice = (l: readonly string[]): string[] => [...new Set(l)];

// Unește rezultatele (în ordinea dată, de ex. Apollo, Prospeo, Lusha, Hunter): aceeași persoană găsită de furnizori diferiți devine una, cu „găsit și în …”.
//  - dubluri se caută doar ÎNTRE furnizori, nu în interiorul aceluiași furnizor;
//  - la dublură rămâne furnizorul care are deja emailul (aprobarea nu mai plătește nimic); dacă niciunul/amândoi îl au, rămâne primul;
//  - id-urile tuturor furnizorilor se păstrează, iar câmpurile goale se completează din celălalt.
export function uneste<T extends CandidatDeep>(grupuri: ReadonlyArray<readonly T[]>): Array<T & { alteSurse: string[] }> {
  const iesire: Array<T & { alteSurse: string[] }> = [];
  const peCheie = new Map<string, number>();
  for (const grup of grupuri) {
    for (const c of grup) {
      const k = cheieNumeComplet(c.nume);
      const idx = k ? peCheie.get(k) : undefined;
      const propriu = { ...c, ids: { ...c.ids }, alteSurse: unice(c.alteSurse ?? []) };
      if (idx === undefined) {
        if (k) peCheie.set(k, iesire.length);
        iesire.push(propriu);
        continue;
      }
      const vechi = iesire[idx];
      if (vechi.sursa === c.sursa) {
        iesire.push(propriu); // același furnizor: două persoane diferite cu același nume rămân două
        continue;
      }
      const alte = unice([...vechi.alteSurse, ...propriu.alteSurse]);
      if (!vechi.email && c.email) {
        // Noul are emailul: el devine principalul, vechiul trece la „găsit și în”.
        iesire[idx] = {
          ...vechi,
          ...propriu,
          rol: propriu.rol || vechi.rol,
          dept: propriu.dept || vechi.dept,
          linkedin: propriu.linkedin || vechi.linkedin,
          telefon: propriu.telefon || vechi.telefon,
          sursaUrl: propriu.sursaUrl || vechi.sursaUrl,
          cerereLusha: propriu.cerereLusha || vechi.cerereLusha,
          roConfirmat: Boolean(propriu.roConfirmat || vechi.roConfirmat),
          ids: { ...vechi.ids, ...propriu.ids },
          alteSurse: unice([...alte, vechi.sursa]).filter((s) => s !== c.sursa),
        };
      } else {
        vechi.alteSurse = unice([...alte, c.sursa]).filter((s) => s !== vechi.sursa);
        vechi.ids = { ...c.ids, ...vechi.ids };
        vechi.rol ||= c.rol;
        vechi.dept ||= c.dept;
        vechi.linkedin ||= c.linkedin;
        vechi.telefon ||= c.telefon;
        vechi.sursaUrl ||= c.sursaUrl;
        vechi.cerereLusha ||= c.cerereLusha;
        vechi.roConfirmat = Boolean(vechi.roConfirmat || c.roConfirmat);
      }
    }
  }
  return iesire;
}

// ===== Antetul: câți a găsit fiecare furnizor =====
export type StareFurnizor = {
  furnizor: string;
  gasiti: number;
  memorat: boolean; // rezultatul vine din căutarea făcută recent (0 credite)
  eroare?: string; // motivul exact, afișat în loc de număr
};

export function antetFurnizori(stari: readonly StareFurnizor[], nume: (furnizor: string) => string, memorat = "memorat"): string {
  return stari.map((s) => `${nume(s.furnizor)}: ${s.eroare ? s.eroare : `${s.gasiti}${s.memorat ? ` (${memorat})` : ""}`}`).join(" · ");
}

// ===== Planul de aprobare =====
// Cine aduce emailul/telefonul: ÎNTOTDEAUNA furnizorul care ține persoana (cel care a găsit-o). Internet (AI) nu are nimic de cumpărat.
// Furnizori care dau mobilul la cerere: Prospeo (imediat). Lusha îl dă odată cu emailul. Hunter nu vinde mobil.
export const FURNIZORI_CU_MOBIL = ["prospeo"] as const;

export type CandidatDePlan = { id: string; sursa: string; email: string | null; telefon: string | null; ids: Record<string, string> };

export type PlanAprobare = {
  cumpara: Record<string, string[]>; // furnizor → id-urile candidaților pentru care se plătește îmbogățirea
  directe: string[]; // se adaugă ca atare (au deja ce au; nu se plătește nimic)
  faraId: string[]; // furnizorul n-are id-ul persoanei (rând vechi): se adaugă ca atare, fără îmbogățire
};

export function planAprobare(candidati: readonly CandidatDePlan[], optiuni: { cuTelefon?: boolean } = {}): PlanAprobare {
  const plan: PlanAprobare = { cumpara: {}, directe: [], faraId: [] };
  for (const c of candidati) {
    const lipseEmail = !c.email;
    const vreaTelefon = optiuni.cuTelefon === true && !c.telefon && (FURNIZORI_CU_MOBIL as readonly string[]).includes(c.sursa);
    if (c.sursa === "web-ai" || (!lipseEmail && !vreaTelefon) || c.sursa === "hunter") {
      plan.directe.push(c.id);
      continue;
    }
    if (!c.ids[c.sursa]) {
      plan.faraId.push(c.id);
      continue;
    }
    (plan.cumpara[c.sursa] ??= []).push(c.id);
  }
  return plan;
}

// Câți candidați au fost aprobați / au rămas pentru reîncercare după ce furnizorii au răspuns: `esuati` = furnizorii care au dat eroare.
export function separaDupaRezultat<T extends { sursa: string }>(candidati: readonly T[], esuati: ReadonlySet<string>): { reusiti: T[]; ramasi: T[] } {
  const reusiti: T[] = [];
  const ramasi: T[] = [];
  for (const c of candidati) (esuati.has(c.sursa) ? ramasi : reusiti).push(c);
  return { reusiti, ramasi };
}

// ===== Orchestratorul: Apollo întâi, apoi ceilalți în paralel =====
// Adaptoarele (apeluri către furnizori) se injectează: aici nu există rețea, deci ordinea și regulile se testează direct.
//  - Apollo rulează PRIMUL: căutarea lui e gratuită și, dacă firma nu are site, află o singură dată domeniul pe care îl refolosesc apoi ceilalți (Hunter caută doar după domeniu).
//  - Prospeo, Hunter și Lusha rulează apoi în paralel; un furnizor care dă eroare nu le pierde pe celelalte.
//  - Un furnizor căutat recent pentru aceeași firmă nu se mai apelează („memorat”, 0 credite).
//  - „În lanț (economic)”: pe rând, în ordinea cost, și se oprește la primul furnizor care găsește pe cineva.
export type RezultatAdaptor<T> = { ok: true; date: T } | { ok: false; eroare: string; status?: number };
export type CautareFurnizor = (firma: { nume: string; domeniu: string | null }) => Promise<RezultatAdaptor<{ candidati: CandidatDeep[]; unitati: number }>>;
export type Adaptoare = {
  domeniu?: (nume: string) => Promise<RezultatAdaptor<string | null>>;
  cauta: Partial<Record<string, CautareFurnizor>>;
};

export type ModCautare = "deep" | "lant";

export type IntrareDeep = {
  firma: { nume: string; domeniu: string | null };
  furnizori: readonly string[]; // furnizorii cu cheie, în ordinea căutării (Apollo primul)
  memorate: Readonly<Record<string, number>>; // furnizor → câți candidați are deja în listă (căutat recent: nu se mai apelează)
  mod: ModCautare;
  apeluriRamase: number;
};

export type ApelDeep = { furnizor: string; operatie: "cautare" | "domeniu"; ok: boolean; unitati: number };
export type IesireDeep = {
  domeniu: string | null;
  brut: { furnizor: string; candidati: CandidatDeep[] }[];
  stari: StareFurnizor[];
  apeluri: ApelDeep[];
};

// Aceleași texte ca în motor.ts (traducerile lor stau în lib-mesaje-ui).
export const MESAJ_LIMITA_APELURI = "Limita zilnică de căutări a organizației a fost atinsă; continuă mâine.";
export const MESAJ_HUNTER_FARA_SITE = "Hunter a fost sărit: firma nu are site completat, iar Hunter caută după domeniu. Completează site-ul firmei sau adaugă un contact cu e-mail de firmă (nu Gmail, Yahoo etc.).";
const COST_APELURI: Record<string, number> = { lusha: 2 }; // Lusha poate face două cereri (România, apoi fără țară)

export async function ruleazaCautare(i: IntrareDeep, a: Adaptoare): Promise<IesireDeep> {
  const apeluri: ApelDeep[] = [];
  const brut: IesireDeep["brut"] = [];
  const stari: StareFurnizor[] = [];
  let ramase = i.apeluriRamase;
  let domeniu = i.firma.domeniu;
  const activi = i.furnizori.filter((f) => a.cauta[f]);

  // Un singur furnizor: memorat, fără buget sau apel real. Întoarce starea (numărul găsit sau eroarea).
  const cauta = async (f: string): Promise<StareFurnizor> => {
    const memorat = i.memorate[f];
    if (memorat !== undefined) return { furnizor: f, gasiti: memorat, memorat: true };
    const cost = COST_APELURI[f] ?? 1;
    if (ramase < cost) return { furnizor: f, gasiti: 0, memorat: false, eroare: MESAJ_LIMITA_APELURI };
    ramase -= cost;
    const r = await a.cauta[f]!({ nume: i.firma.nume, domeniu });
    apeluri.push({ furnizor: f, operatie: "cautare", ok: r.ok, unitati: r.ok ? r.date.unitati : 0 });
    if (!r.ok) return { furnizor: f, gasiti: 0, memorat: false, eroare: r.eroare };
    brut.push({ furnizor: f, candidati: r.date.candidati });
    return { furnizor: f, gasiti: r.date.candidati.length, memorat: false };
  };

  // Hunter nu poate căuta fără domeniu.
  const faraSite = (f: string): StareFurnizor | null => (f === "hunter" && !domeniu ? { furnizor: f, gasiti: 0, memorat: false, eroare: MESAJ_HUNTER_FARA_SITE } : null);

  // Apollo întâi: domeniul (o singură dată, doar dacă lipsește) și apoi căutarea lui.
  const apolloActiv = activi.includes("apollo");
  if (apolloActiv && i.memorate.apollo === undefined && !domeniu && a.domeniu && ramase >= 1) {
    ramase -= 1;
    const d = await a.domeniu(i.firma.nume);
    apeluri.push({ furnizor: "apollo", operatie: "domeniu", ok: d.ok, unitati: d.ok && d.date ? 1 : 0 });
    if (d.ok && d.date) domeniu = d.date;
  }
  const rest = activi.filter((f) => f !== "apollo");

  if (i.mod === "lant") {
    for (const f of apolloActiv ? ["apollo", ...rest] : rest) {
      const sarit = faraSite(f);
      const s = sarit ?? (await cauta(f));
      stari.push(s);
      if (!s.eroare && s.gasiti > 0) break;
    }
    return { domeniu, brut, stari, apeluri };
  }

  if (apolloActiv) stari.push(await cauta("apollo"));
  const paralel = await Promise.all(
    rest.map(async (f) => {
      const sarit = faraSite(f);
      return sarit ?? (await cauta(f));
    }),
  );
  stari.push(...paralel);
  return { domeniu, brut, stari, apeluri };
}
