// Motorul paginii „Avatar donator": transformă răspunsurile și cifrele introduse în (1) alocarea bugetului de
// promovare pe platforme, (2) platforma pe care să insiști, (3) sfaturi de marketing și (4) scoruri.
// Funcții pure, fără acces la DB — se rulează identic pe server și în browser (recalculare live la editare).
//
// IMPORTANT (onestitate a modelului): afinitățile canal × vârstă / canal × obiectiv de mai jos sunt PRIORI
// EURISTICI (judecată de practică), nu statistici măsurate. Cât timp nu ai date proprii despre sursa donatorilor
// noi și costul real per donator, alocarea se bazează doar pe ei; imediat ce le introduci, datele tale
// primesc jumătate din pondere și devin decisive. Modelul spune asta explicit în interfață.

import { TOATE_INTREBARILE } from "./intrebari";
import {
  CANALE,
  CANAL_LABEL,
  GRADE,
  PROFILE,
  RASPUNS_GOL,
  VARSTE_ETICHETE,
  type AvatarData,
  type CanalId,
  type Grad,
  type ProfilId,
  type Raspuns,
  type Segment,
  type StatisticiPlatforma,
  type Varste,
} from "./tipuri";

// ===== Numere =====
export function parseNum(s: string | undefined | null): number | null {
  if (!s) return null;
  let t = String(s).trim().replace(/\s/g, "").replace(/[^\d.,-]/g, "");
  if (!t) return null;
  if (t.includes(".") && t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (t.includes(",")) t = t.replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const lei = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} lei`;

// ===== Priori euristici =====
const VARSTE_KEYS: (keyof Varste)[] = ["v18_24", "v25_34", "v35_44", "v45_54", "v55"];
// Cât de bine „ajunge" fiecare platformă la fiecare grupă de vârstă (0–1), în contextul donațiilor.
const AFINITATE_VARSTA: Record<CanalId, number[]> = {
  facebook: [0.35, 0.65, 0.9, 1.0, 0.85],
  instagram: [0.9, 1.0, 0.7, 0.4, 0.15],
  tiktok: [1.0, 0.8, 0.45, 0.2, 0.05],
  linkedin: [0.3, 0.9, 1.0, 0.9, 0.5],
  google: [0.6, 0.85, 0.9, 0.9, 0.8],
};
// Cât de potrivită e platforma pentru fiecare tip de venit vizat (0–1): [individual, recurent, companii].
const AFINITATE_OBIECTIV: Record<CanalId, [number, number, number]> = {
  facebook: [1.0, 0.8, 0.25],
  instagram: [0.75, 0.6, 0.2],
  tiktok: [0.7, 0.35, 0.1],
  linkedin: [0.1, 0.2, 1.0],
  google: [0.6, 0.75, 0.5],
};

// ===== Cost maxim per donator =====
export type CpaMaxim = { valoare: number | null; explicatie: string };
export function cpaMaxim(d: AvatarData): CpaMaxim {
  const unica = parseNum(d.buget.donatieUnica);
  const lunara = parseNum(d.buget.donatieLunara);
  const luni = clamp(parseNum(d.buget.luniRecuperare) ?? 3, 1, 24);
  const recurent = d.conversie === "recurenta" || (parseNum(d.mix.recurent) ?? 0) > (parseNum(d.mix.individual) ?? 0);
  if (recurent && lunara) return { valoare: lunara * luni, explicatie: `donație lunară ${lei(lunara)} × ${luni} luni de recuperare` };
  if (unica) return { valoare: unica, explicatie: `donația medie unică (${lei(unica)}) — peste ea pierzi bani la prima donație` };
  if (lunara) return { valoare: lunara * luni, explicatie: `donație lunară ${lei(lunara)} × ${luni} luni de recuperare` };
  return { valoare: null, explicatie: "" };
}

// ===== Alocare buget =====
export type RolCanal = "principal" | "test" | "organic";
export type CanalRezultat = {
  id: CanalId;
  scor: number; // 0–100
  scorPublic: number;
  scorObiectiv: number;
  scorDovezi: number | null; // null = fără date proprii
  lei: number;
  procent: number;
  rol: RolCanal;
  motive: string[];
};
export type Alocare = {
  buget: number | null;
  test: number;
  principal: number;
  areDovezi: boolean;
  canale: CanalRezultat[]; // sortate descrescător după scor
  insista: CanalRezultat | null;
  grupaDominanta: string | null;
  obiectiv: { individual: number; recurent: number; companii: number };
  note: string[];
};

function distributieVarste(v: Varste): { p: number[]; complet: boolean } {
  const vals = VARSTE_KEYS.map((k) => Math.max(0, parseNum(v[k]) ?? 0));
  const sum = vals.reduce((a, b) => a + b, 0);
  if (sum <= 0) return { p: [0.2, 0.2, 0.2, 0.2, 0.2], complet: false };
  return { p: vals.map((x) => x / sum), complet: true };
}

function distributieObiectiv(d: AvatarData): { individual: number; recurent: number; companii: number } {
  const i = Math.max(0, parseNum(d.mix.individual) ?? 0);
  const r = Math.max(0, parseNum(d.mix.recurent) ?? 0);
  const c = Math.max(0, parseNum(d.mix.companii) ?? 0);
  let t = i + r + c;
  if (t <= 0) {
    if (d.conversie === "recurenta") return { individual: 0.4, recurent: 0.6, companii: 0 };
    if (d.conversie === "sponsorizare") return { individual: 0, recurent: 0, companii: 1 };
    if (d.conversie === "unica") return { individual: 1, recurent: 0, companii: 0 };
    return { individual: 0.6, recurent: 0.3, companii: 0.1 };
  }
  t = i + r + c;
  return { individual: i / t, recurent: r / t, companii: c / t };
}

function nrCanaleMain(buget: number): number {
  if (buget < 600) return 1;
  if (buget < 2000) return 2;
  if (buget < 5000) return 3;
  return 4;
}

export function calculeazaAlocare(d: AvatarData): Alocare {
  const { p: varstePct, complet: varsteComplete } = distributieVarste(d.varste);
  const obiectiv = distributieObiectiv(d);
  const cpaMax = cpaMaxim(d).valoare;
  const note: string[] = [];

  const shares = CANALE.map((c) => parseNum(d.canale[c].donatoriNoiPct));
  const cpas = CANALE.map((c) => parseNum(d.canale[c].cpa));
  const maxShare = Math.max(0, ...shares.map((s) => s ?? 0));
  const minCpa = Math.min(...cpas.filter((x): x is number => x != null && x > 0), Infinity);
  const areDovezi = shares.some((s) => s != null) || cpas.some((x) => x != null);

  const dominantaIdx = varstePct.indexOf(Math.max(...varstePct));
  const grupaDominanta = varsteComplete ? VARSTE_ETICHETE[VARSTE_KEYS[dominantaIdx]] : null;

  const canale: CanalRezultat[] = CANALE.map((id, ci): CanalRezultat => {
    const scorPublic = clamp(varstePct.reduce((a, p, i) => a + p * AFINITATE_VARSTA[id][i], 0), 0, 1);
    const [fi, fr, fc] = AFINITATE_OBIECTIV[id];
    const scorObiectiv = clamp(obiectiv.individual * fi + obiectiv.recurent * fr + obiectiv.companii * fc, 0, 1);

    const comps: number[] = [];
    const share = shares[ci];
    const cpa = cpas[ci];
    if (share != null && maxShare > 0) comps.push(clamp(share / maxShare, 0, 1));
    if (cpa != null && cpa > 0) {
      if (cpaMax) comps.push(clamp(cpaMax / cpa, 0, 1.5) / 1.5);
      else if (Number.isFinite(minCpa)) comps.push(clamp(minCpa / cpa, 0, 1));
    }
    const dovada = comps.length ? comps.reduce((a, b) => a + b, 0) / comps.length : null;
    const evidence = dovada ?? (areDovezi ? 0.3 : 0);
    const scor = areDovezi ? 0.25 * scorPublic + 0.25 * scorObiectiv + 0.5 * evidence : 0.5 * scorPublic + 0.5 * scorObiectiv;

    const motive: string[] = [];
    if (varsteComplete) motive.push(`Public: ${Math.round(scorPublic * 100)}/100 potrivire cu vârstele donatorilor tăi${grupaDominanta ? ` (dominantă ${grupaDominanta})` : ""}`);
    motive.push(`Obiectiv: ${Math.round(scorObiectiv * 100)}/100 potrivire cu tipul de venit vizat`);
    if (share != null) motive.push(`Dovadă reală: aduce ${share}% din donatorii noi`);
    if (cpa != null && cpa > 0) motive.push(`Cost real: ${lei(cpa)} / donator${cpaMax ? ` (maxim acceptabil ${lei(cpaMax)})` : ""}`);
    if (cpa != null && cpaMax && cpa > cpaMax) motive.push("⚠ Costul real depășește maximul acceptabil — nu scala până nu scade");

    return { id, scor: Math.round(scor * 100), scorPublic: Math.round(scorPublic * 100), scorObiectiv: Math.round(scorObiectiv * 100), scorDovezi: dovada == null ? null : Math.round(dovada * 100), lei: 0, procent: 0, rol: "organic", motive };
  }).sort((a, b) => b.scor - a.scor);

  const buget = parseNum(d.buget.lunar);
  const testPct = clamp(parseNum(d.buget.testPct) ?? 20, 0, 60);
  let principal = 0;
  let test = 0;

  if (buget && buget > 0) {
    test = Math.round((buget * testPct) / 100);
    principal = buget - test;
    const k = nrCanaleMain(buget);
    // Canalele cu cost real peste maxim nu primesc buget principal.
    const eligibile = canale.filter((c) => c.scor >= 35 && !c.motive.some((m) => m.startsWith("⚠")));
    const main = eligibile.slice(0, k);
    if (main.length === 0 && canale[0]) main.push(canale[0]);
    // ponderi ∝ scor², cu pod minim de 15% pentru fiecare canal ales
    const w = main.map((c) => c.scor * c.scor);
    const sw = w.reduce((a, b) => a + b, 0) || 1;
    let sh = w.map((x) => x / sw);
    if (main.length > 1) {
      for (let it = 0; it < 4; it++) {
        const jos = sh.map((s) => s < 0.15);
        if (!jos.some(Boolean)) break;
        const fixat = jos.filter(Boolean).length * 0.15;
        const restW = w.reduce((a, x, i) => a + (jos[i] ? 0 : x), 0) || 1;
        sh = sh.map((s, i) => (jos[i] ? 0.15 : ((1 - fixat) * w[i]) / restW));
      }
    }
    const pas = principal > 2000 ? 50 : 10;
    let alocat = 0;
    main.forEach((c, i) => {
      c.lei = Math.round((principal * sh[i]) / pas) * pas;
      c.rol = "principal";
      alocat += c.lei;
    });
    if (main[0]) main[0].lei += principal - alocat; // diferența de rotunjire rămâne pe canalul lider

    // Testul merge la cel mai bun canal care nu e în principal (challenger), altfel se împarte pe cele principale.
    const challenger = canale.find((c) => c.rol !== "principal" && c.scor >= 25);
    if (challenger && test > 0) {
      challenger.lei = test;
      challenger.rol = "test";
    } else if (test > 0 && main[0]) {
      main[0].lei += test;
      note.push("Bugetul de test a fost adăugat canalului principal (nu există un canal-provocator cu potrivire suficientă) — folosește-l pentru variante de creativ.");
    }
    for (const c of canale) c.procent = buget > 0 ? Math.round((c.lei / buget) * 100) : 0;
    if (main.length < k) note.push(`Doar ${main.length} ${main.length === 1 ? "canal are" : "canale au"} potrivire suficientă (scor ≥ 35) — nu le împrăștia buget pe canale slabe.`);
  }

  const insista = canale.find((c) => c.rol === "principal") ?? canale[0] ?? null;
  return { buget: buget && buget > 0 ? buget : null, test, principal, areDovezi, canale, insista, grupaDominanta, obiectiv, note };
}

// ===== Maturitate =====
export const DIMENSIUNI_MATURITATE: { key: string; label: string; intrebari: number[] }[] = [
  { key: "misiune", label: "Misiune, impact și dovadă", intrebari: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { key: "date", label: "Calitatea datelor", intrebari: [21, 22, 24, 25, 26, 27, 28, 29, 30] },
  { key: "donatori", label: "Cunoașterea donatorilor", intrebari: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] },
  { key: "digital", label: "Conversie digitală", intrebari: [61, 62, 63, 64, 65, 66, 67, 68] },
  { key: "creativ", label: "Conținut și creativ", intrebari: [51, 52, 53, 54, 55, 56, 57, 58, 59, 60] },
  { key: "retentie", label: "Retenție și comunitate", intrebari: [71, 72, 73, 74, 75, 76, 77, 78, 79, 80] },
  { key: "corporate", label: "Fundraising corporate", intrebari: [81, 82, 83, 84, 85] },
  { key: "offline", label: "Execuție offline", intrebari: [86, 87, 88, 89, 90] },
  { key: "masurare", label: "Măsurare și experimentare", intrebari: [69, 70, 94, 97, 98, 99, 100] },
  { key: "conformitate", label: "Conformitate și guvernanță", intrebari: [93, 95, 96] },
];

export function esteCompletat(r: Raspuns | undefined): boolean {
  return !!r && (r.text.trim().length > 0 || r.variante.trim().length > 0);
}
function pondereGrad(g: Grad): number {
  return GRADE.find((x) => x.key === g)?.pondere ?? 0.6; // fără grad ales = tratat ca estimare
}
export function scorIntrebare(r: Raspuns | undefined): number {
  return esteCompletat(r) ? pondereGrad(r!.grad) : 0;
}

export function calculeazaMaturitate(d: AvatarData): { dimensiuni: { key: string; label: string; scor: number }[]; total: number } {
  const dimensiuni = DIMENSIUNI_MATURITATE.map((dim) => {
    const s = dim.intrebari.reduce((a, nr) => a + scorIntrebare(d.raspunsuri[nr]), 0) / dim.intrebari.length;
    return { key: dim.key, label: dim.label, scor: Math.round(s * 100) / 10 };
  });
  const total = Math.round(dimensiuni.reduce((a, x) => a + x.scor, 0));
  return { dimensiuni, total };
}

export function progresChestionar(d: AvatarData): { completate: number; total: number; masurate: number } {
  let completate = 0;
  let masurate = 0;
  for (const q of TOATE_INTREBARILE) {
    const r = d.raspunsuri[q.nr];
    if (esteCompletat(r)) {
      completate++;
      if (r!.grad === "masurat") masurate++;
    }
  }
  return { completate, total: TOATE_INTREBARILE.length, masurate };
}

// ===== Scor profiluri =====
export function scorSegment(profil: ProfilId, seg: Segment): { total: number; linii: { key: string; label: string; pct: number; max: number; puncte: number }[] } {
  const cfg = PROFILE.find((p) => p.id === profil)!;
  const linii = cfg.criterii.map((c) => {
    const pct = clamp(seg.criterii[c.key] ?? 0, 0, 100);
    return { key: c.key, label: c.label, pct, max: c.max, puncte: Math.round((pct / 100) * c.max * 10) / 10 };
  });
  return { total: Math.round(linii.reduce((a, l) => a + l.puncte, 0)), linii };
}

// ===== Sfaturi de marketing =====
export type Sfat = { nivel: "important" | "recomandat" | "idee"; titlu: string; text: string };

export const PLAYBOOK: Record<CanalId, { rol: string; continut: string; frecventa: string; cta: string; masoara: string }> = {
  facebook: {
    rol: "Acoperire largă la public matur (35–64), campanii de caz, comunitate și distribuire între prieteni.",
    continut: "Povestea cazului în video scurt sau imagini reale + update-uri de progres („cât ne-a mai rămas”); dovezi (documente, facturi) în comentariu fixat.",
    frecventa: "3–4 postări/săptămână organic; 1 update de progres la fiecare prag (25/50/75/90%).",
    cta: "„Donează acum” către pagina de donație cu UTM; pentru recurent: „Devino susținător lunar”.",
    masoara: "CTR către pagina de donație, cost per donator, rata de conversie a paginii, sursa donatorilor noi.",
  },
  instagram: {
    rol: "Public mai tânăr (18–34): povești vizuale, Reels și Stories, distribuire prin Stories.",
    continut: "Reels scurte cu vocea familiei/voluntarului, „o zi din viața cazului”, Stories cu sticker de donație și numărătoare inversă.",
    frecventa: "3 Reels/săptămână + Stories zilnic în campanie.",
    cta: "Link în bio + sticker de donație în Stories; un singur îndemn per material.",
    masoara: "Reach către non-urmăritori, salvări/distribuiri (semnal de încredere), clickuri pe link, donații atribuite prin UTM.",
  },
  tiktok: {
    rol: "Descoperire de public nou (mai ales 16–34) prin video autentic; bun ca test, slab ca sursă unică de donații.",
    continut: "Video vertical 15–45 s, primele 2 secunde = hook („Ce faci când…”), voce reală, fără muzică emoțională exploatatoare.",
    frecventa: "3–5 video/săptămână, ritm constant 4–6 săptămâni înainte de a judeca rezultatul.",
    cta: "„Link în profil” + text pe ecran; direcționează spre o pagină simplă, rapidă pe mobil.",
    masoara: "Vizionări complete, urmăritori noi, clickuri în profil, donații atribuite prin UTM (TikTok atribuie slab — folosește și „de unde ai auzit de noi?”).",
  },
  linkedin: {
    rol: "Companii și decidenți: sponsorizări (20%, D177), parteneriate CSR — nu donații mici de la public larg.",
    continut: "Rapoarte de impact, studii de caz cu sponsori existenți, postări ale președintelui, oferta de sponsorizare pe nivele.",
    frecventa: "2 postări/săptămână + 10–15 mesaje personalizate/săptămână către decidenți din lista de firme țintă.",
    cta: "„Programează 15 minute” către un singur contact; atașează one-pager-ul organizației.",
    masoara: "Răspunsuri la mesaje, întâlniri programate, firme mutate în pipeline (vezi CRM → Companii).",
  },
  google: {
    rol: "Intenție deja formată: oameni care caută cauza/organizația/„cum donez” — cel mai bun pentru recurent și pentru încredere.",
    continut: "Search pe numele organizației și al cazurilor + Google Ad Grants dacă ești eligibil; YouTube pentru mărturii și rapoarte video.",
    frecventa: "Campanii mereu active pe numele organizației; cazurile — doar cât timp sunt active.",
    cta: "Pagină de destinație cu un singur scop: donația (mobil-first), dovezi de încredere vizibile fără scroll.",
    masoara: "Conversii pe pagina de donație, cost/conversie, termeni de căutare care aduc donatori.",
  },
};

const CUVINTE_SENSIBILE = /(copi|boal|bol[ni]|tratament|medical|cancer|spital|operați|operati|sănătate|sanatate|handicap|dizabil|tumor)/i;

export function genereazaSfaturi(d: AvatarData, alocare: Alocare, stat: StatisticiPlatforma | null): Sfat[] {
  const s: Sfat[] = [];
  const buget = alocare.buget;
  const testPct = parseNum(d.buget.testPct) ?? 20;
  const cpa = cpaMaxim(d);
  const top = alocare.insista;
  const textMisiune = [d.raspunsuri[1]?.text, d.raspunsuri[2]?.text, d.raspunsuri[3]?.text].filter(Boolean).join(" ");
  const sensibil = CUVINTE_SENSIBILE.test(textMisiune);

  if (!buget) {
    s.push({ nivel: "important", titlu: "Setează bugetul lunar de promovare", text: "Fără un buget nu pot împărți banii pe platforme. Pornește de la o sumă pe care ți-o permiți să o „pierzi” în teste, nu de la obiectivul de venit. Regula de start: 80% pe canalul câștigător, 20% pentru teste." });
  }
  if (buget && (testPct < 10 || testPct > 40)) {
    s.push({ nivel: "recomandat", titlu: "Reglează partea de buget pentru teste", text: `Ai ${testPct}% pentru teste. Sub 10% nu mai înveți nimic nou; peste 40% arzi bani fără să scalezi ce merge. Un raport sănătos e 15–30%.` });
  }
  if (buget && buget < 600) {
    s.push({ nivel: "important", titlu: "Buget mic: un singur canal, 60–90 de zile", text: `Cu ${lei(buget)}/lună, împărțirea pe mai multe platforme nu strânge suficiente date ca să înveți ceva. Insistă pe ${top ? CANAL_LABEL[top.id] : "un singur canal"} minimum 2 luni, cu 2–3 creative diferite, apoi decide.` });
  }
  const facebook = alocare.canale.find((c) => c.id === "facebook");
  const instagram = alocare.canale.find((c) => c.id === "instagram");
  if (facebook?.rol === "principal" && instagram?.rol === "principal") {
    s.push({ nivel: "idee", titlu: "Facebook și Instagram se cumpără împreună (Meta)", text: "Le administrezi din același cont de reclame Meta. Începe cu plasamente automate, apoi compară costul per donator pe fiecare plasament și mută bugetul pe cel mai ieftin." });
  }
  if (cpa.valoare == null) {
    s.push({ nivel: "important", titlu: "Calculează costul maxim per donator", text: "Completează donația medie (și cea lunară, dacă vizezi recurență) în secțiunea Buget. Fără acest plafon nu poți spune dacă o reclamă „merge”. Regulă: pentru donator unic, costul de achiziție ≤ donația medie; pentru recurent, costul ≤ donație lunară × luni de recuperare (de regulă 3–4)." });
  } else {
    s.push({ nivel: "idee", titlu: `Plafon de cost: ${lei(cpa.valoare)} per donator`, text: `Calculat din ${cpa.explicatie}. Orice canal sau creativ peste acest cost, după cel puțin 2× plafonul cheltuit, se oprește sau se schimbă.` });
  }
  if (!d.raspunsuri[70] || !esteCompletat(d.raspunsuri[70])) {
    s.push({ nivel: "important", titlu: "Fixează o convenție UTM (fără ea nu știi ce canal aduce banii)", text: "Folosește același șablon peste tot: utm_source=<platformă>&utm_medium=<paid_social|organic|email>&utm_campaign=<caz>_<luna-an>&utm_content=<varianta-creativ>. Pune-l pe fiecare link către pagina de donație și pe codurile QR; notează modelul la întrebarea 70." });
  }
  if (!alocare.areDovezi) {
    s.push({ nivel: "important", titlu: "Alocarea de acum e bazată pe euristici, nu pe datele tale", text: "Nu ai introdus încă % din donatorii noi pe canal și costul real per donator (secțiunea Canale). Adaugă în formularul de donație întrebarea „De unde ai auzit de noi?” și recalculează după 60 de zile: datele reale vor conta jumătate din scor." });
  }
  if (sensibil || !esteCompletat(d.raspunsuri[93]) || !esteCompletat(d.raspunsuri[96])) {
    s.push({
      nivel: sensibil ? "important" : "recomandat",
      titlu: "Teme medicale/sensibile: consimțământ și reguli de platformă",
      text: `${sensibil ? "Misiunea ta implică cazuri medicale/copii. " : ""}Înainte de orice promovare plătită: (1) consimțământ scris pentru poze, video și poveste, inclusiv pentru reclame (întrebarea 93); (2) verifică politicile de publicitate ale fiecărei platforme pentru strângeri de fonduri și conținut medical și desemnează cine le aprobă (întrebarea 96); (3) notează în scris limitele etice (întrebarea 10) — fără imagini care exploatează suferința.`,
    });
  }
  if (d.conversie === "recurenta" || (parseNum(d.mix.recurent) ?? 0) >= 30) {
    s.push({ nivel: "recomandat", titlu: "Optimizează pentru donația recurentă", text: "Pune „Devino susținător lunar” ca opțiune implicită sau primul buton, cu 3 sume sugerate și impactul fiecăreia (întrebarea 4). Trimite după prima donație o secvență de mulțumire la ziua 0, 2, 7, 30 și 90, iar la ziua 7–30 propune trecerea la lunar — mulți donatori unici acceptă dacă li se cere după ce au văzut impactul." });
  } else if (d.conversie === "unica") {
    s.push({ nivel: "idee", titlu: "Donație unică: sugerează sume și impact", text: "Afișează 3 sume-prag (ex. o sumă mică, una medie, una „care schimbă ceva”), fiecare cu ce înseamnă concret. După donație, oferă recurentul ca pas doi, nu ca pas unu." });
  }
  const email = { text: "Email/WhatsApp sunt canalele tale proprii și cele mai ieftine: cere permisiunea explicită (temei legal documentat, întrebarea 95), segmentează după recență (activ / în risc / inactiv) și trimite update-uri de impact, nu doar cereri de bani." };
  s.push({ nivel: "recomandat", titlu: "Folosește canalele proprii înainte să plătești reclame", text: email.text });
  if (!esteCompletat(d.raspunsuri[69])) {
    s.push({ nivel: "recomandat", titlu: "Activează audiențele proprii (legal)", text: "Încarcă lista de donatori/abonați (doar cu temei legal) ca audiență personalizată pentru remarketing și audiențe similare — și exclude donatorii existenți din campaniile de achiziție, ca să nu plătești ca să convingi oameni care au donat deja." });
  }
  if (!alocare.canale.some((c) => d.canale[c.id].statistici.trim())) {
    s.push({ nivel: "recomandat", titlu: "Adaugă linkurile către statisticile din social media", text: "În secțiunea Canale, lipește linkul panoului de statistici al fiecărei platforme (Facebook, Instagram, TikTok, LinkedIn). Fă un ritual lunar de 30 de minute: notezi urmăritori, reach 30 zile, engagement și donatori atribuiți, apoi actualizezi cifrele aici." });
  }
  if (!alocare.grupaDominanta) {
    s.push({ nivel: "recomandat", titlu: "Completează vârstele donatorilor", text: "Distribuția pe vârste este cea mai importantă intrare pentru alegerea platformei. Scoate-o din CRM/formularele de donație (întrebarea 41) și introdu procentele în secțiunea Public." });
  }
  const digital = parseNum(d.digital);
  if (digital != null && digital <= 2) {
    s.push({ nivel: "recomandat", titlu: "Public cu educație digitală redusă: simplifică plata", text: "Oferă și metode simple (transfer bancar cu IBAN vizibil, SMS, cod QR către pagina de donație) și textul în limbaj foarte simplu. Reduce numărul de pași până la plată la minimum." });
  }
  const companii = alocare.obiectiv.companii;
  if (companii >= 0.2 || d.conversie === "sponsorizare") {
    s.push({ nivel: "recomandat", titlu: "Sponsori: LinkedIn + lista de firme din CRM", text: "Pentru companii nu cumpăra reclame la public larg. Ia lista din CRM → Companii, alege 30–50 de firme cu capacitate, găsește decidentul (întrebarea 82) și fă outreach personalizat pe LinkedIn cu one-pager-ul și oferta pe nivele de sponsorizare." });
  }
  if (stat && stat.medie > 0 && !parseNum(d.buget.donatieUnica)) {
    s.push({ nivel: "idee", titlu: `Donația medie reală din platformă: ${lei(stat.medie)}`, text: `Din ${stat.donatii} donații online reușite (mediană ${lei(stat.mediana)}). Poți folosi valoarea ca punct de plecare pentru calculul costului maxim per donator.` });
  }
  s.push({ nivel: "idee", titlu: "Testează cu disciplină: o singură variabilă", text: "Fiecare test = o ipoteză (întrebarea 97): „Dacă schimb [hook-ul], atunci [CTR-ul] crește, pentru [publicul X], în [14 zile]”. Schimbă un singur lucru o dată (hook, imagine, CTA sau public), lasă testul să ruleze cel puțin 7–14 zile și decide după reguli scrise de oprire/continuare/scalare (întrebarea 99)." });
  s.push({ nivel: "idee", titlu: "Rotește creativele înainte de oboseala publicului", text: "Când aceeași persoană vede același material de prea multe ori, conversia scade. Ca regulă practică, schimbă creativul la 2–3 săptămâni sau când frecvența crește vizibil și costul per donator urcă — notează după câte expuneri apare la tine (întrebarea 59)." });
  s.push({ nivel: "idee", titlu: "Calendarul care contează în România", text: "1 iunie (Ziua Copilului) pentru cauze de copii; până pe 25 mai — redirecționarea de 3,5% prin Formular 230 (folosește fereastra de mesaje către donatori); până pe 25 iunie — D177 pentru sponsori; noiembrie–decembrie — vârful de generozitate (Giving Tuesday, Crăciun): pregătește campania cu 4–6 săptămâni înainte." });
  if (top) {
    s.push({ nivel: "recomandat", titlu: `Insistă pe ${CANAL_LABEL[top.id]}`, text: `${PLAYBOOK[top.id].rol} Recomandare de conținut: ${PLAYBOOK[top.id].continut}` });
  }
  return s.sort((a, b) => ORDINE[a.nivel] - ORDINE[b.nivel]);
}
const ORDINE: Record<Sfat["nivel"], number> = { important: 0, recomandat: 1, idee: 2 };

// ===== Import din exportul .txt („Avatarul donatorului perfect") =====
const GOL = new Set(["", "—", "- niciuna -", "— niciuna —", "— necompletat —", "-"]);
const curat = (v: string) => (GOL.has(v.trim().toLowerCase()) || GOL.has(v.trim()) ? "" : v.trim());

function gradDinText(v: string): Grad {
  const t = v.trim().toLowerCase();
  if (t.startsWith("măs") || t.startsWith("mas")) return "masurat";
  if (t.startsWith("est")) return "estimat";
  if (t.startsWith("ip")) return "ipoteza";
  return "";
}

export function parseazaExport(text: string): { raspunsuri: Record<number, Raspuns>; gasite: number } {
  const linii = text.replace(/\r/g, "").split("\n");
  const raspunsuri: Record<number, Raspuns> = {};
  let curent: number | null = null;
  let gasite = 0;
  for (const linie of linii) {
    if (/^SCOR PROFIL/.test(linie)) break; // după chestionar urmează profilurile — nu mai sunt răspunsuri
    const m = linie.match(/^(\d{1,3})\.\s+\S/);
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= 100) {
      curent = Number(m[1]);
      raspunsuri[curent] = { ...RASPUNS_GOL };
      continue;
    }
    if (curent == null) continue;
    const t = linie.trim();
    if (!t) continue;
    const r = raspunsuri[curent];
    if (t.startsWith("Variante bifate:")) {
      r.variante = curat(t.slice("Variante bifate:".length));
      continue;
    }
    if (t.startsWith("Grad:")) {
      const g = t.match(/Grad:\s*(.*?)\s{2,}Perioad[ăa]:\s*(.*?)\s{2,}Responsabil:\s*(.*)$/);
      if (g) {
        r.grad = gradDinText(g[1]);
        r.perioada = curat(g[2]);
        r.responsabil = curat(g[3]);
      }
      continue;
    }
    const intrebare = TOATE_INTREBARILE.find((q) => q.nr === curent);
    const prefix = intrebare ? `${intrebare.prompt}: ` : "";
    let valoare = "";
    if (prefix && t.startsWith(prefix)) valoare = t.slice(prefix.length);
    else if (t.includes(": ")) valoare = t.slice(t.lastIndexOf(": ") + 2);
    else continue;
    r.text = curat(valoare);
  }
  for (const nr of Object.keys(raspunsuri)) {
    const r = raspunsuri[Number(nr)];
    if (r.text || r.variante) gasite++;
    else delete raspunsuri[Number(nr)];
  }
  return { raspunsuri, gasite };
}
