// Personalizarea dashboardului unei organizații: ce intrări din meniu se văd și cum se numesc, ce familie vizuală are dashboardul și ce blocuri de pe
// prima pagină apar și în ce ordine. E DOAR configurare (JSON validat strict), niciodată conținut: o poate scrie doar echipa platformei (vezi
// app/platform-admin) și nu atinge datele organizației. Funcții pure, fără importuri externe, ca să se poată folosi în pagini, în editor și în teste.

export const VERSIUNE_PERSONALIZARE = 1;

// Cele cinci familii vizuale de dashboard (vezi crm/components/dashboard/*-dashboard.tsx).
export const FAMILII_DASHBOARD = ["cald-protector", "natural-ancorat", "indraznet-dinamic", "elegant-editorial", "neutru"] as const;
export type FamilieDashboard = (typeof FAMILII_DASHBOARD)[number];

// Blocurile de pe prima pagină a CRM (crm/page.tsx). Primele patru se pot ascunde și reordona; „primii-pasi” se poate doar ascunde (rămâne după celelalte).
export const BLOCURI_ORDONABILE = ["taskuri", "indicatori", "risc-pipeline", "top-sponsori"] as const;
export const BLOCURI_DASHBOARD = [...BLOCURI_ORDONABILE, "primii-pasi"] as const;
export type BlocDashboard = (typeof BLOCURI_DASHBOARD)[number];

// Intrări de meniu care nu se pot ascunde: fără ele, utilizatorul nu mai găsește pagina de start și nici setările sau facturarea.
export const NAV_PROTEJATE: readonly string[] = ["", "setari", "facturare"];

// Variante de pagini: versiuni alternative ale unei pagini, scrise în cod (cu teste) și activate per organizație din editorul de aspect. Registrul de aici e singura sursă:
// o variantă nouă se adaugă întâi aici, apoi în pagina respectivă. Fără ea, orice organizație vede pagina standard.
export const VARIANTE_PAGINI = {
  decidenti: {
    eticheta: "Decidenți",
    optiuni: { grafic: "Cu grafic al persoanelor pe etape, sub liste" },
  },
} as const satisfies Record<string, { eticheta: string; optiuni: Record<string, string> }>;
export type PaginaCuVarianta = keyof typeof VARIANTE_PAGINI;

const are = (obiect: object, cheie: string) => Object.prototype.hasOwnProperty.call(obiect, cheie);

const MAX_ELEMENTE = 80;
const MAX_ETICHETA = 40;
// href-urile din meniu: litere mici, cifre, „-”, „/”, „?”, „=”, „&”. Orice altceva e refuzat (nu ajunge niciodată în HTML ca atare, dar rămâne strict).
const HREF_VALID = /^\/?[a-z0-9][a-z0-9\-/?=&]{0,60}$|^$/;

export type PersonalizareOrg = {
  v: typeof VERSIUNE_PERSONALIZARE;
  familie?: FamilieDashboard;
  navAscunse?: string[];
  navEtichete?: Record<string, string>;
  dashboard?: { ascunse?: BlocDashboard[]; ordine?: BlocDashboard[] };
  // pagină → varianta activă (vezi VARIANTE_PAGINI); lipsa înseamnă pagina standard.
  variante?: Record<string, string>;
};

export type RezultatValidare = { ok: true; valoare: PersonalizareOrg } | { ok: false; eroare: string };

const esteObiect = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

// Text scurt de afișat în meniu: fără caractere de control sau marcaje HTML, spații normalizate.
function curataEticheta(x: unknown): string | null {
  if (typeof x !== "string") return null;
  const t = x.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim();
  if (!t || t.length > MAX_ETICHETA) return null;
  return t;
}

// Validează și normalizează o configurare primită de la client sau citită din baza de date. Refuză orice nu e recunoscut, în loc să ignore în tăcere.
export function valideazaPersonalizare(brut: unknown): RezultatValidare {
  if (!esteObiect(brut)) return { ok: false, eroare: "Configurarea trebuie să fie un obiect." };
  const permise = new Set(["v", "familie", "navAscunse", "navEtichete", "dashboard", "variante"]);
  for (const k of Object.keys(brut)) if (!permise.has(k)) return { ok: false, eroare: `Câmp necunoscut: ${k}.` };
  if (brut.v !== VERSIUNE_PERSONALIZARE) return { ok: false, eroare: "Versiune de configurare necunoscută." };

  const rez: PersonalizareOrg = { v: VERSIUNE_PERSONALIZARE };

  if (brut.familie !== undefined) {
    if (typeof brut.familie !== "string" || !(FAMILII_DASHBOARD as readonly string[]).includes(brut.familie)) return { ok: false, eroare: "Familie de dashboard necunoscută." };
    rez.familie = brut.familie as FamilieDashboard;
  }

  if (brut.navAscunse !== undefined) {
    if (!Array.isArray(brut.navAscunse) || brut.navAscunse.length > MAX_ELEMENTE) return { ok: false, eroare: "Lista de intrări ascunse e invalidă." };
    const lista: string[] = [];
    for (const h of brut.navAscunse) {
      if (typeof h !== "string" || !HREF_VALID.test(h)) return { ok: false, eroare: "Intrare de meniu invalidă." };
      if (NAV_PROTEJATE.includes(h)) return { ok: false, eroare: "Pagina de start, Facturarea și Setările nu se pot ascunde." };
      if (!lista.includes(h)) lista.push(h);
    }
    if (lista.length) rez.navAscunse = lista;
  }

  if (brut.navEtichete !== undefined) {
    if (!esteObiect(brut.navEtichete) || Object.keys(brut.navEtichete).length > MAX_ELEMENTE) return { ok: false, eroare: "Lista de denumiri e invalidă." };
    const etichete: Record<string, string> = {};
    for (const [h, e] of Object.entries(brut.navEtichete)) {
      if (!HREF_VALID.test(h)) return { ok: false, eroare: "Intrare de meniu invalidă la denumiri." };
      const curat = curataEticheta(e);
      if (curat === null) return { ok: false, eroare: `Denumire invalidă (maximum ${MAX_ETICHETA} de caractere, fără marcaje).` };
      etichete[h] = curat;
    }
    if (Object.keys(etichete).length) rez.navEtichete = etichete;
  }

  if (brut.dashboard !== undefined) {
    if (!esteObiect(brut.dashboard)) return { ok: false, eroare: "Configurarea dashboardului e invalidă." };
    for (const k of Object.keys(brut.dashboard)) if (k !== "ascunse" && k !== "ordine") return { ok: false, eroare: `Câmp necunoscut la dashboard: ${k}.` };
    const dash: NonNullable<PersonalizareOrg["dashboard"]> = {};
    if (brut.dashboard.ascunse !== undefined) {
      const a = brut.dashboard.ascunse;
      if (!Array.isArray(a)) return { ok: false, eroare: "Lista de blocuri ascunse e invalidă." };
      const lista: BlocDashboard[] = [];
      for (const b of a) {
        if (typeof b !== "string" || !(BLOCURI_DASHBOARD as readonly string[]).includes(b)) return { ok: false, eroare: "Bloc de dashboard necunoscut." };
        if (!lista.includes(b as BlocDashboard)) lista.push(b as BlocDashboard);
      }
      if (lista.length) dash.ascunse = lista;
    }
    if (brut.dashboard.ordine !== undefined) {
      const o = brut.dashboard.ordine;
      if (!Array.isArray(o)) return { ok: false, eroare: "Ordinea blocurilor e invalidă." };
      const lista: BlocDashboard[] = [];
      for (const b of o) {
        if (typeof b !== "string" || !(BLOCURI_ORDONABILE as readonly string[]).includes(b)) return { ok: false, eroare: "Ordinea poate conține doar blocurile reordonabile." };
        if (lista.includes(b as BlocDashboard)) return { ok: false, eroare: "Un bloc apare de două ori în ordine." };
        lista.push(b as BlocDashboard);
      }
      if (lista.length) dash.ordine = lista;
    }
    if (dash.ascunse || dash.ordine) rez.dashboard = dash;
  }

  if (brut.variante !== undefined) {
    if (!esteObiect(brut.variante)) return { ok: false, eroare: "Lista de variante e invalidă." };
    const variante: Record<string, string> = {};
    for (const [pagina, varianta] of Object.entries(brut.variante)) {
      if (!are(VARIANTE_PAGINI, pagina)) return { ok: false, eroare: `Pagină necunoscută la variante: ${pagina}.` };
      const optiuni = VARIANTE_PAGINI[pagina as PaginaCuVarianta].optiuni;
      if (typeof varianta !== "string" || !are(optiuni, varianta)) return { ok: false, eroare: `Variantă necunoscută pentru ${pagina}.` };
      variante[pagina] = varianta;
    }
    if (Object.keys(variante).length) rez.variante = variante;
  }

  return { ok: true, valoare: rez };
}

// Varianta activă a unei pagini pentru o organizație, sau null pentru pagina standard. Valorile necunoscute (de exemplu o variantă scoasă din cod) dau null.
export function variantaPagina(pers: PersonalizareOrg | null | undefined, pagina: PaginaCuVarianta): string | null {
  const v = pers?.variante?.[pagina];
  return v && are(VARIANTE_PAGINI[pagina].optiuni, v) ? v : null;
}

// Configurarea efectivă: cea din baza de date, peste cea veche din fișier (lib/org-customizations.ts), care rămâne valabilă pentru conturile care o au.
export function combinaPersonalizari(
  dinFisier: { hiddenNav?: string[]; navLabels?: Record<string, string> } | undefined,
  dinBaza: PersonalizareOrg | null | undefined,
): PersonalizareOrg {
  const navAscunse = [...new Set([...(dinFisier?.hiddenNav ?? []), ...(dinBaza?.navAscunse ?? [])])].filter((h) => !NAV_PROTEJATE.includes(h));
  const navEtichete = { ...(dinFisier?.navLabels ?? {}), ...(dinBaza?.navEtichete ?? {}) };
  return {
    v: VERSIUNE_PERSONALIZARE,
    ...(dinBaza?.familie ? { familie: dinBaza.familie } : {}),
    ...(navAscunse.length ? { navAscunse } : {}),
    ...(Object.keys(navEtichete).length ? { navEtichete } : {}),
    ...(dinBaza?.dashboard ? { dashboard: dinBaza.dashboard } : {}),
    ...(dinBaza?.variante ? { variante: dinBaza.variante } : {}),
  };
}

// Ordinea efectivă a blocurilor reordonabile: întâi cele din configurare, apoi restul în ordinea implicită; cele ascunse nu apar.
export function blocuriVizibile(pers: PersonalizareOrg | null | undefined): BlocDashboard[] {
  const ascunse = new Set(pers?.dashboard?.ascunse ?? []);
  const ordine = pers?.dashboard?.ordine ?? [];
  const rest = BLOCURI_ORDONABILE.filter((b) => !ordine.includes(b));
  return [...ordine, ...rest].filter((b) => !ascunse.has(b));
}

// Transport în adresa paginii de previzualizare (editorul trimite configurarea nesalvată, ca să o vadă imediat). Doar text base64url, validat la primire.
export function codeazaPentruAdresa(pers: PersonalizareOrg): string {
  const bytes = new TextEncoder().encode(JSON.stringify(pers));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeazaDinAdresa(cod: string): RezultatValidare {
  if (cod.length > 6000 || !/^[A-Za-z0-9_-]*$/.test(cod)) return { ok: false, eroare: "Cod de previzualizare invalid." };
  try {
    const b64 = cod.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (cod.length % 4)) % 4);
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return valideazaPersonalizare(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return { ok: false, eroare: "Cod de previzualizare invalid." };
  }
}
