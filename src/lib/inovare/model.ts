// Centrul de inovare în fundraising: ideile ONG-urilor, voturile și starea lor. Funcții și constante pure, fără importuri, ca să se testeze.

export type StareIdee = "propus" | "vazuta" | "in_planificare" | "in_dezvoltare" | "finalizat" | "nu_acum";
export const STARI: { cheie: StareIdee; eticheta: string; descriere: string }[] = [
  { cheie: "propus", eticheta: "Propusă", descriere: "A fost trimisă și așteaptă voturi și analiza echipei." },
  { cheie: "vazuta", eticheta: "Văzută", descriere: "Echipa a citit-o și o analizează sau cere detalii." },
  { cheie: "in_planificare", eticheta: "În planificare", descriere: "Am decis să o facem și o programăm." },
  { cheie: "in_dezvoltare", eticheta: "În dezvoltare", descriere: "Lucrăm acum la ea." },
  { cheie: "finalizat", eticheta: "Finalizată", descriere: "E gata și o poți folosi." },
  { cheie: "nu_acum", eticheta: "Nu acum", descriere: "Nu o facem în perioada următoare; rămâne aici cu explicația echipei." },
];
export const ETICHETE_STARE: Record<StareIdee, string> = Object.fromEntries(STARI.map((s) => [s.cheie, s.eticheta])) as Record<StareIdee, string>;
export const esteStare = (x: unknown): x is StareIdee => typeof x === "string" && x in ETICHETE_STARE;

export type Efort = "scazut" | "mediu" | "mare";
export const ETICHETE_EFORT: Record<Efort, string> = { scazut: "Efort mic", mediu: "Efort mediu", mare: "Efort mare" };
export const esteEfort = (x: unknown): x is Efort => x === "scazut" || x === "mediu" || x === "mare";

export const CATEGORII = [
  "Strângere de fonduri",
  "Donatori",
  "Recurență și retenție",
  "Campanii de caz",
  "Companii și sponsorizări",
  "Formular 230",
  "Conformitate și termene fiscale",
  "Voluntari",
  "Rapoarte și statistici",
  "Comunicare",
  "Integrări",
  "Import și export",
  "Alt subiect",
] as const;
export type Categorie = (typeof CATEGORII)[number];
// „Altele” a fost redenumită „Alt subiect”; ideile vechi cu „Altele” rămân valide.
export const CATEGORIE_IMPLICITA: Categorie = "Alt subiect";
export const esteCategorie = (x: unknown): x is Categorie => typeof x === "string" && ((CATEGORII as readonly string[]).includes(x) || x === "Altele");

// Ce vrea ONG-ul să crească cu ideea: leagă popularitatea de un rezultat de fundraising. `potrivire` (1–3) intră în scorul de prioritate.
export const OBIECTIVE = [
  { cheie: "donatii_recurente", eticheta: "Mai multe donații recurente", potrivire: 3 },
  { cheie: "formular_230", eticheta: "Mai multe formulare 230 (3,5%)", potrivire: 3 },
  { cheie: "d177_sponsorizari", eticheta: "Mai mulți bani de la firme (D177, sponsorizări)", potrivire: 3 },
  { cheie: "campanii_caz", eticheta: "Campanii de caz mai de succes", potrivire: 2 },
  { cheie: "retentie", eticheta: "Donatori care rămân și donează din nou", potrivire: 2 },
  { cheie: "timp", eticheta: "Mai puțin timp pierdut pe muncă manuală", potrivire: 1 },
  { cheie: "alt", eticheta: "Altceva", potrivire: 1 },
] as const;
export type Obiectiv = (typeof OBIECTIVE)[number]["cheie"];
export const esteObiectiv = (x: unknown): x is Obiectiv => typeof x === "string" && OBIECTIVE.some((o) => o.cheie === x);
export const ETICHETE_OBIECTIV: Record<string, string> = Object.fromEntries(OBIECTIVE.map((o) => [o.cheie, o.eticheta]));

export const FRECVENTE = [
  { cheie: "zilnic", eticheta: "În fiecare zi" },
  { cheie: "saptamanal", eticheta: "În fiecare săptămână" },
  { cheie: "lunar", eticheta: "În fiecare lună" },
  { cheie: "rar", eticheta: "Doar din când în când" },
] as const;
export type Frecventa = (typeof FRECVENTE)[number]["cheie"];
export const esteFrecventa = (x: unknown): x is Frecventa => typeof x === "string" && FRECVENTE.some((f) => f.cheie === x);
export const ETICHETE_FRECVENTA: Record<string, string> = Object.fromEntries(FRECVENTE.map((f) => [f.cheie, f.eticheta]));

export const LIMITE = { titluMin: 8, titluMax: 120, descriereMin: 20, descriereMax: 2000, acumMax: 1000, raspunsMax: 2000, motivRaportareMax: 300 };

// ---------- date personale în text ----------
// Ideile se văd între organizații: nu acceptăm adrese de email, numere de telefon sau CNP-uri în titlu, descriere ori „cum faci acum”.

const RE_EMAIL = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/i;
const RE_TELEFON = /(?:\+|00)?(?:40|0)[\s.\-()]*7[\s.\-()]*(?:\d[\s.\-()]*){8}/;
const RE_CNP = /(?<!\d)[1-8]\d{12}(?!\d)/;

export type DatePersonale = "email" | "telefon" | "cnp";

export function datePersonaleInText(text: string): DatePersonale | null {
  if (RE_EMAIL.test(text)) return "email";
  // Separatorii dintre cifre (spații, puncte, cratime) se scot, ca un CNP scris „1 850 101 123 456” să fie prins.
  if (RE_CNP.test(text.replace(/(?<=\d)[\s.\-](?=\d)/g, ""))) return "cnp";
  if (RE_TELEFON.test(text)) return "telefon";
  return null;
}

const NUME_DATE_PERSONALE: Record<DatePersonale, string> = { email: "o adresă de email", telefon: "un număr de telefon", cnp: "un CNP" };

export type CampuriPropunere = "titlu" | "descriere" | "cumFaciAcum" | "categorie" | "obiectiv" | "frecventa";
export type DatePropunere = {
  titlu: string;
  descriere: string;
  cumFaciAcum: string;
  categorie: Categorie;
  obiectiv: Obiectiv;
  frecventa: Frecventa;
  afiseazaOrganizatia: boolean;
};

export function valideazaPropunere(x: unknown): { ok: true; date: DatePropunere } | { ok: false; erori: Partial<Record<CampuriPropunere, string>> } {
  const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const t = (k: string, max: number) => (typeof r[k] === "string" ? (r[k] as string).replace(/\s+/g, " ").trim().slice(0, max) : "");
  const titlu = t("titlu", LIMITE.titluMax);
  // Descrierea păstrează rândurile noi (paragrafele), dar limitează spațiile multiple.
  const descriere = (typeof r.descriere === "string" ? r.descriere : "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, LIMITE.descriereMax);
  const cumFaciAcum = (typeof r.cumFaciAcum === "string" ? r.cumFaciAcum : "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, LIMITE.acumMax);
  const erori: Partial<Record<CampuriPropunere, string>> = {};
  if (titlu.length < LIMITE.titluMin) erori.titlu = `Scrie un titlu de cel puțin ${LIMITE.titluMin} caractere.`;
  if (descriere.length < LIMITE.descriereMin) erori.descriere = `Povestește pe scurt situația, în cel puțin ${LIMITE.descriereMin} de caractere.`;
  // Categoria e opțională (un ONG mic nu știe mereu în ce categorie intră); fără alegere, ideea intră la „Alt subiect”.
  const categorieAleasa = typeof r.categorie === "string" && r.categorie !== "" ? r.categorie : CATEGORIE_IMPLICITA;
  if (!esteCategorie(categorieAleasa) || (categorieAleasa as string) === "Altele") erori.categorie = "Alege o categorie din listă.";
  if (!esteObiectiv(r.obiectiv)) erori.obiectiv = "Spune ce vrei să crești cu ajutorul ei.";
  if (!esteFrecventa(r.frecventa)) erori.frecventa = "Spune cât de des apare problema.";
  for (const [camp, text] of [["titlu", titlu], ["descriere", descriere], ["cumFaciAcum", cumFaciAcum]] as const) {
    const gasit = datePersonaleInText(text);
    if (gasit && !erori[camp]) erori[camp] = `Textul pare să conțină ${NUME_DATE_PERSONALE[gasit]}. Ideile se văd între organizații: scoate-l și păstrează doar situația.`;
  }
  if (Object.keys(erori).length) return { ok: false, erori };
  return {
    ok: true,
    date: {
      titlu,
      descriere,
      cumFaciAcum,
      categorie: categorieAleasa as Categorie,
      obiectiv: r.obiectiv as Obiectiv,
      frecventa: r.frecventa as Frecventa,
      afiseazaOrganizatia: r.afiseazaOrganizatia !== false,
    },
  };
}

// ---------- idei asemănătoare (înainte de a propune, vezi dacă există deja) ----------

const CUVINTE_GOALE = new Set(["si", "sa", "de", "la", "in", "pe", "cu", "un", "o", "ce", "cum", "pentru", "din", "al", "ale", "a", "e", "este", "sau", "mai", "prin", "fie", "fi", "nu", "se", "ca", "the", "to", "of", "and"]);
const tokeni = (s: string): Set<string> =>
  new Set(
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !CUVINTE_GOALE.has(w))
      .map((w) => w.slice(0, 4)), // rădăcină aproximativă: „donator”, „donatori”, „donații” se potrivesc
  );

// Cât de asemănătoare sunt două titluri (0–1): cuvintele comune ÷ cuvintele celui mai scurt.
export function asemanare(a: string, b: string): number {
  const ta = tokeni(a);
  const tb = tokeni(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let comune = 0;
  for (const w of ta) if (tb.has(w)) comune++;
  return comune / Math.min(ta.size, tb.size);
}

export function ideiSimilare<T extends { titlu: string }>(titlu: string, existente: T[], prag = 0.6, maxim = 3): T[] {
  if (titlu.trim().length < 6) return [];
  return existente
    .map((e) => ({ e, s: asemanare(titlu, e.titlu) }))
    .filter((x) => x.s >= prag)
    .sort((a, b) => b.s - a.s)
    .slice(0, maxim)
    .map((x) => x.e);
}

export type Sortare = "voturi" | "noi";
export const esteSortare = (x: unknown): x is Sortare => x === "voturi" || x === "noi";

// ---------- prioritizare ----------
// Scor = voturi (organizații distincte) × potrivirea cu fundraising-ul (1–3) ÷ efort (mic=1, mediu=2, mare=4). Efortul neevaluat se tratează ca mediu.
// Voturile sunt un semnal, nu un verdict: echipa decide.

const GREUTATE_EFORT: Record<Efort, number> = { scazut: 1, mediu: 2, mare: 4 };

export function potrivireObiectiv(obiectiv: string | null | undefined): number {
  return OBIECTIVE.find((o) => o.cheie === obiectiv)?.potrivire ?? 1;
}

export function scorPrioritate(i: { voturi: number; obiectiv?: string | null; efort?: Efort | "" | null }): number {
  const efort = i.efort ? GREUTATE_EFORT[i.efort] : GREUTATE_EFORT.mediu;
  return Math.round(((i.voturi * potrivireObiectiv(i.obiectiv)) / efort) * 10) / 10;
}

// Victorie rapidă: efort mic și cel puțin 3 voturi (echipa păstrează ~20% din capacitate pentru ele).
export const esteVictorieRapida = (i: { voturi: number; efort?: Efort | "" | null }): boolean => i.efort === "scazut" && i.voturi >= 3;

// ---------- termene de răspuns ----------

export const TERMENE = { primulRaspunsZileLucratoare: 5, decizieZile: 30, voturiPentruDecizie: 5, revizuireZile: 90 };

// Zile lucrătoare întregi între două momente (luni–vineri, fără sărbători legale: aproximare suficientă pentru un indicator intern).
export function zileLucratoareIntre(de: Date, pana: Date): number {
  if (pana <= de) return 0;
  let n = 0;
  const d = new Date(Date.UTC(de.getUTCFullYear(), de.getUTCMonth(), de.getUTCDate()));
  const sfarsit = Date.UTC(pana.getUTCFullYear(), pana.getUTCMonth(), pana.getUTCDate());
  while (d.getTime() < sfarsit) {
    d.setUTCDate(d.getUTCDate() + 1);
    const z = d.getUTCDay();
    if (z !== 0 && z !== 6) n++;
  }
  return n;
}

export function mediana(valori: number[]): number | null {
  if (valori.length === 0) return null;
  const s = [...valori].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

// ---------- indicatori pentru echipă (Panou platformă) ----------

export type IdeePentruIndicatori = {
  stare: StareIdee;
  ascunsa: boolean;
  voturi: number;
  creatLa: string;
  actualizatLa: string;
  primulRaspunsLa: string | null;
  finalizatLa: string | null;
  reevaluareLa: string | null;
};

export type Indicatori = {
  active: number; // idei neascunse
  faraRaspuns: number; // încă „Propuse", fără niciun răspuns
  faraRaspunsDepasit: number; // fără răspuns de mai mult de 5 zile lucrătoare
  medianaPrimRaspuns: number | null; // zile lucrătoare, pentru ideile cu răspuns
  inTermenPrimRaspuns: number | null; // procent din ideile cu răspuns, răspunse în 5 zile lucrătoare
  deciziePeste30: number; // ≥5 voturi, încă Propusă/Văzută, mai vechi de 30 de zile
  deRevizuit: number; // „În planificare" nemișcate de 90 de zile
  deReevaluat: number; // „Nu acum" cu data de reevaluare trecută
  rataLivrare: number | null; // % din ideile cu ≥5 voturi mai vechi de 6 luni care sunt finalizate
};

export function indicatoriInovare(idei: IdeePentruIndicatori[], acum: Date): Indicatori {
  const active = idei.filter((i) => !i.ascunsa);
  const zile = (iso: string) => (acum.getTime() - new Date(iso).getTime()) / 86_400_000;
  const faraRaspuns = active.filter((i) => i.stare === "propus" && !i.primulRaspunsLa);
  const timpi = active.filter((i) => i.primulRaspunsLa).map((i) => zileLucratoareIntre(new Date(i.creatLa), new Date(i.primulRaspunsLa!)));
  const inTermen = timpi.filter((z) => z <= TERMENE.primulRaspunsZileLucratoare).length;
  const veche6 = active.filter((i) => i.voturi >= TERMENE.voturiPentruDecizie && zile(i.creatLa) >= 183);
  return {
    active: active.length,
    faraRaspuns: faraRaspuns.length,
    faraRaspunsDepasit: faraRaspuns.filter((i) => zileLucratoareIntre(new Date(i.creatLa), acum) > TERMENE.primulRaspunsZileLucratoare).length,
    medianaPrimRaspuns: mediana(timpi),
    inTermenPrimRaspuns: timpi.length ? Math.round((inTermen / timpi.length) * 100) : null,
    deciziePeste30: active.filter((i) => (i.stare === "propus" || i.stare === "vazuta") && i.voturi >= TERMENE.voturiPentruDecizie && zile(i.creatLa) > TERMENE.decizieZile).length,
    deRevizuit: active.filter((i) => i.stare === "in_planificare" && zile(i.actualizatLa) > TERMENE.revizuireZile).length,
    deReevaluat: active.filter((i) => i.stare === "nu_acum" && i.reevaluareLa && new Date(`${i.reevaluareLa}T23:59:59Z`) < acum).length,
    rataLivrare: veche6.length ? Math.round((veche6.filter((i) => i.stare === "finalizat").length / veche6.length) * 100) : null,
  };
}
