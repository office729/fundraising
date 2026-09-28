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
  const repetare = clamp(parseNum(d.buget.repetare) ?? 0, 0, 300);
  if (recurent && lunara) return { valoare: lunara * luni, explicatie: `donație lunară ${lei(lunara)} × ${luni} luni de recuperare` };
  // Donator unic: valoarea așteptată = donația medie × (1 + rata de repetare). Fără rata de repetare, plafonul e chiar
  // donația medie (break-even la prima donație) — de aceea merită completată.
  if (unica) {
    return {
      valoare: Math.round(unica * (1 + repetare / 100)),
      explicatie: repetare > 0 ? `donația medie unică (${lei(unica)}) × (1 + ${repetare}% donatori care revin)` : `donația medie unică (${lei(unica)}) — completează rata de repetare ca plafonul să reflecte donatorii care revin`,
    };
  }
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
  depasesteCost: boolean; // costul real măsurat depășește plafonul acceptabil
  soloOrganic: boolean; // canal care nu se cumpără (ex. LinkedIn: outreach personalizat, nu reclame)
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

// Câte canale plătite susține un buget: sub ~1.500 lei/lună o singură platformă adună prea puține conversii ca să
// învețe algoritmul; pragurile sunt ordine de mărime (verifică minimele din contul de reclame al fiecărei platforme).
export const PRAG_BUGET_UN_CANAL = 1500;
function nrCanaleMain(buget: number): number {
  if (buget < PRAG_BUGET_UN_CANAL) return 1;
  if (buget < 4000) return 2;
  if (buget < 10000) return 3;
  return 4;
}
// Ponderea datelor proprii în scor crește cu mărimea eșantionului: n/(n+30) — 3 donatori nu cântăresc cât 300.
const K_ESANTION = 30;
export function ponderePeDovezi(d: AvatarData, areDovezi: boolean): number {
  if (!areDovezi) return 0;
  const n = parseNum(d.buget.esantion);
  const efectiv = n != null && n >= 0 ? n : 10; // fără eșantion declarat, prudent: tratăm ca 10 donatori
  return Math.min(0.6, efectiv / (efectiv + K_ESANTION));
}

export function calculeazaAlocare(d: AvatarData): Alocare {
  const { p: varstePct, complet: varsteComplete } = distributieVarste(d.varste);
  const obiectiv = distributieObiectiv(d);
  const cpaMax = cpaMaxim(d).valoare;
  const note: string[] = [];

  const shares = CANALE.map((c) => parseNum(d.canale[c].donatoriNoiPct));
  const cpas = CANALE.map((c) => parseNum(d.canale[c].cpa));
  const sumaShares = shares.reduce<number>((a, s) => a + (s ?? 0), 0);
  const minCpa = Math.min(...cpas.filter((x): x is number => x != null && x > 0), Infinity);
  const areDovezi = shares.some((s) => s != null) || cpas.some((x) => x != null);
  const wDovezi = ponderePeDovezi(d, areDovezi);

  const dominantaIdx = varstePct.indexOf(Math.max(...varstePct));
  const grupaDominanta = varsteComplete ? VARSTE_ETICHETE[VARSTE_KEYS[dominantaIdx]] : null;

  // Dovada fiecărui canal (0–1): cota din donatorii noi (față de total, nu față de cel mai mare canal) și costul real
  // față de plafon. „% din donatorii noi” e declarativ și atribuie prea mult canalelor vizibile — de aceea costul cântărește la fel.
  const dovezi = CANALE.map((_, ci) => {
    const comps: number[] = [];
    const share = shares[ci];
    const cpa = cpas[ci];
    if (share != null && sumaShares > 0) comps.push(clamp(share / sumaShares, 0, 1));
    if (cpa != null && cpa > 0) {
      if (cpaMax) comps.push(clamp(cpaMax / cpa, 0, 2) / 2);
      else if (Number.isFinite(minCpa)) comps.push(clamp(minCpa / cpa, 0, 1));
    }
    return comps.length ? comps.reduce((a, b) => a + b, 0) / comps.length : null;
  });
  const dovadaMedie = (() => {
    const v = dovezi.filter((x): x is number => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0.5;
  })();

  const canale: CanalRezultat[] = CANALE.map((id, ci): CanalRezultat => {
    const scorPublic = clamp(varstePct.reduce((a, p, i) => a + p * AFINITATE_VARSTA[id][i], 0), 0, 1);
    const [fi, fr, fc] = AFINITATE_OBIECTIV[id];
    const scorObiectiv = clamp(obiectiv.individual * fi + obiectiv.recurent * fr + obiectiv.companii * fc, 0, 1);
    const share = shares[ci];
    const cpa = cpas[ci];
    const dovada = dovezi[ci];
    // Un canal netestat NU e penalizat: primește dovada medie a celorlalte (sau 0,5) — altfel câștigătorul de azi se autoîntărește.
    const evidence = dovada ?? dovadaMedie;
    const prior = 0.5 * scorPublic + 0.5 * scorObiectiv;
    const scor = (1 - wDovezi) * prior + wDovezi * evidence;
    const depasesteCost = cpa != null && cpaMax != null && cpa > cpaMax;

    const motive: string[] = [];
    if (varsteComplete) motive.push(`Public: ${Math.round(scorPublic * 100)}/100 potrivire cu vârstele donatorilor tăi${grupaDominanta ? ` (dominantă ${grupaDominanta})` : ""}`);
    motive.push(`Obiectiv: ${Math.round(scorObiectiv * 100)}/100 potrivire cu tipul de venit vizat`);
    if (share != null) motive.push(`Dovadă declarată: aduce ${share}% din donatorii noi`);
    if (cpa != null && cpa > 0) motive.push(`Cost real: ${lei(cpa)} / donator${cpaMax ? ` (maxim acceptabil ${lei(cpaMax)})` : ""}`);
    if (depasesteCost) motive.push("⚠ Costul real depășește maximul acceptabil — nu scala până nu scade");
    // LinkedIn se folosește pentru outreach personalizat către decidenți, nu pentru reclame la public larg.
    const soloOrganic = id === "linkedin";
    if (soloOrganic) motive.push("LinkedIn: outreach personalizat către decidenți (fără reclame plătite)");

    return {
      id,
      scor: Math.round(scor * 100),
      scorPublic: Math.round(scorPublic * 100),
      scorObiectiv: Math.round(scorObiectiv * 100),
      scorDovezi: dovada == null ? null : Math.round(dovada * 100),
      lei: 0,
      procent: 0,
      rol: "organic",
      motive,
      depasesteCost,
      soloOrganic,
    };
  }).sort((a, b) => b.scor - a.scor);

  if (areDovezi) {
    note.push(`Datele tale reale cântăresc ${Math.round(wDovezi * 100)}% din scor (cresc cu numărul de donatori măsurați; completează „donatori noi măsurați” în Buget).`);
  }

  const buget = parseNum(d.buget.lunar);
  const testPct = clamp(parseNum(d.buget.testPct) ?? 20, 0, 60);
  let principal = 0;
  let test = 0;

  if (buget && buget > 0) {
    test = Math.round((buget * testPct) / 100);
    principal = buget - test;
    const k = nrCanaleMain(buget);
    const platibile = canale.filter((c) => !c.soloOrganic);
    // Canalele cu cost real peste maxim și cele cu potrivire slabă (< 35) nu primesc buget principal.
    // Când obiectivul e aproape numai sponsorizări de la companii, reclamele la public larg nu au sens: banii se cheltuie pe timp de outreach.
    const doarCompanii = obiectiv.companii >= 0.7;
    const eligibile = doarCompanii ? [] : platibile.filter((c) => c.scor >= 35 && !c.depasesteCost);
    const main = eligibile.slice(0, k);

    if (main.length === 0 && doarCompanii) {
      note.push("Obiectivul tău e mai ales sponsorizări de la companii: acolo banii nu se cheltuie pe reclame la public larg, ci pe timp de outreach personalizat (LinkedIn, email, întâlniri) către lista de firme din CRM.");
      test = 0;
      principal = 0;
    } else if (main.length === 0) {
      // Nimic nu merită bani acum — nu cheltui „oricum” pe cel mai bun dintre cele rele.
      const toateDepasesc = platibile.some((c) => c.depasesteCost) && platibile.every((c) => c.depasesteCost || c.scor < 35);
      note.push(
        toateDepasesc
          ? "Toate canalele măsurate costă mai mult decât plafonul acceptabil per donator. Oprește reclamele și repară întâi pagina de donație (conversie, încredere, mobil), apoi reia testele cu buget mic."
          : "Niciun canal nu are potrivire suficientă (scor ≥ 35) cu datele introduse. Completează vârstele donatorilor și tipul de venit vizat, sau folosește canalele proprii (email, WhatsApp) până afli unde sunt donatorii.",
      );
      test = 0;
      principal = 0;
    } else {
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
      main[0].lei += principal - alocat; // diferența de rotunjire rămâne pe canalul lider

      // Sub pragul de buget, testul înseamnă DOAR variante de creativ pe canalul principal (un canal nou nu strânge destule date).
      // Peste prag, testul merge la cel mai bun canal care nu e principal (challenger), altfel se adaugă canalului principal.
      const challenger = buget >= PRAG_BUGET_UN_CANAL ? platibile.find((c) => c.rol !== "principal" && c.scor >= 25 && !c.depasesteCost) : undefined;
      if (challenger && test > 0) {
        challenger.lei = test;
        challenger.rol = "test";
      } else if (test > 0) {
        main[0].lei += test;
        note.push(
          buget < PRAG_BUGET_UN_CANAL
            ? `Sub ${PRAG_BUGET_UN_CANAL.toLocaleString("ro-RO")} lei/lună, partea de test înseamnă variante de creativ (hook, imagine, îndemn) pe canalul principal — nu un canal nou, care n-ar aduce destule date.`
            : "Bugetul de test a fost adăugat canalului principal (nu există un canal-provocator cu potrivire suficientă) — folosește-l pentru variante de creativ.",
        );
      }
      if (main.length < k) note.push(`Doar ${main.length} ${main.length === 1 ? "canal are" : "canale au"} potrivire suficientă (scor ≥ 35) — nu le împrăștia buget pe canale slabe.`);
    }
    for (const c of canale) c.procent = buget > 0 ? Math.round((c.lei / buget) * 100) : 0;
  }

  const insista = canale.find((c) => c.rol === "principal") ?? canale.find((c) => !c.soloOrganic) ?? canale[0] ?? null;
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
    continut: "Povestea cazului în video scurt sau imagini reale + update-uri de progres („cât ne-a mai rămas”); dovezile (documente, facturi) doar în versiune minimizată — fără CNP, adresă, alți pacienți — sau la cerere, nu integral într-un comentariu public.",
    frecventa: "3–4 postări/săptămână organic; 1 update de progres la fiecare prag (25/50/75/90%).",
    cta: "„Donează acum” către pagina de donație cu UTM; pentru recurent: „Devino susținător lunar”.",
    masoara: "CTR către pagina de donație, cost per donator, rata de conversie a paginii, sursa donatorilor noi.",
  },
  instagram: {
    rol: "Public mai tânăr (18–34): povești vizuale, Reels și Stories, distribuire prin Stories.",
    continut: "Reels scurte cu vocea voluntarului sau a familiei (cu acord scris), Stories cu sticker de donație; numărătoare inversă doar dacă termenul e real (ex. data operației). Pentru minori: în reclame plătite, implicit fără chipul copilului și fără școală, adresă sau localitate exactă.",
    frecventa: "3 Reels/săptămână + Stories zilnic în campanie.",
    cta: "Link în bio + sticker de donație în Stories; un singur îndemn per material.",
    masoara: "Reach către non-urmăritori, salvări/distribuiri (semnal de încredere), clickuri pe link, donații atribuite prin UTM.",
  },
  tiktok: {
    rol: "Descoperire de public nou (mai ales 16–34) prin video autentic; bun ca test, slab ca sursă unică de donații.",
    continut: "Video vertical 15–45 s, primele 2 secunde = hook, voce reală, fără muzică emoțională exploatatoare. Pentru minori, doar cu acordul ambilor reprezentanți legali, iar copilul este ascultat în funcție de vârstă.",
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
    continut: "Search pe numele organizației și al cazurilor + Google Ad Grants (buget lunar gratuit pentru ONG-uri eligibile — verifică eligibilitatea și tratează-l ca buget separat, nu din cel plătit); YouTube pentru mărturii și rapoarte video.",
    frecventa: "Campanii mereu active pe numele organizației; cazurile — doar cât timp sunt active.",
    cta: "Pagină de destinație cu un singur scop: donația (mobil-first), dovezi de încredere vizibile fără scroll.",
    masoara: "Conversii pe pagina de donație, cost/conversie, termeni de căutare care aduc donatori.",
  },
};

export function genereazaSfaturi(d: AvatarData, alocare: Alocare, stat: StatisticiPlatforma | null): Sfat[] {
  const s: Sfat[] = [];
  const buget = alocare.buget;
  const testPct = parseNum(d.buget.testPct) ?? 20;
  const cpa = cpaMaxim(d);
  const top = alocare.insista;

  if (!buget) {
    s.push({ nivel: "important", titlu: "Setează bugetul lunar de promovare", text: "Fără un buget nu pot împărți banii pe platforme. Pornește de la o sumă pe care ți-o permiți să o „pierzi” în teste, nu de la obiectivul de venit. Regula de start: 80% pe canalul câștigător, 20% pentru teste." });
  }
  if (buget && (testPct < 10 || testPct > 40)) {
    s.push({ nivel: "recomandat", titlu: "Reglează partea de buget pentru teste", text: `Ai ${testPct}% pentru teste. Sub 10% nu mai înveți nimic nou; peste 40% arzi bani fără să scalezi ce merge. Un raport sănătos e 15–30%.` });
  }
  if (buget && buget < PRAG_BUGET_UN_CANAL) {
    s.push({ nivel: "important", titlu: "Buget mic: un singur canal, 60–90 de zile", text: `Cu ${lei(buget)}/lună, împărțirea pe mai multe platforme nu strânge suficiente conversii ca să înveți ceva (la costuri tipice de zeci de lei per donator, rezultă doar câteva donații pe lună). Insistă pe ${top ? CANAL_LABEL[top.id] : "un singur canal"} minimum 2 luni, cu 2–3 creative diferite, apoi decide. Un canal nou se testează de la aproximativ 500 lei, pe 6–8 săptămâni.` });
  }
  const facebook = alocare.canale.find((c) => c.id === "facebook");
  const instagram = alocare.canale.find((c) => c.id === "instagram");
  if (facebook?.rol === "principal" && instagram?.rol === "principal") {
    s.push({ nivel: "idee", titlu: "Facebook și Instagram se cumpără împreună (Meta)", text: "Le administrezi din același cont de reclame Meta. Începe cu plasamente automate, apoi compară costul per donator pe fiecare plasament și mută bugetul pe cel mai ieftin." });
  }
  if (cpa.valoare == null) {
    s.push({ nivel: "important", titlu: "Calculează costul maxim per donator", text: "Completează donația medie (și cea lunară, dacă vizezi recurență) în secțiunea Buget. Fără acest plafon nu poți spune dacă o reclamă „merge”. Regulă: pentru donator unic, costul de achiziție ≤ donația medie × (1 + % de donatori care revin); pentru recurent, costul ≤ donație lunară × luni de recuperare (de regulă 3–4)." });
  } else {
    s.push({ nivel: "idee", titlu: `Plafon de cost: ${lei(cpa.valoare)} per donator`, text: `Calculat din ${cpa.explicatie}. Orice canal sau creativ peste acest cost, după cel puțin 2× plafonul cheltuit și cel puțin 30 de donatori, se oprește sau se schimbă; mai puțin de 30 de donatori înseamnă că prelungești testul, nu că concluzionezi.` });
  }
  s.push({ nivel: "idee", titlu: "Urmărește „costul per leu strâns”", text: "Împarte cheltuiala de promovare la suma strânsă prin ea. Ca punct de pornire, vizează cel puțin 1 leu cheltuit la 2–3 lei strânși (ipoteză de lucru — ajustează cu datele tale). Un cost per donator mic nu ajută dacă donațiile sunt foarte mici." });
  if (!d.raspunsuri[70] || !esteCompletat(d.raspunsuri[70])) {
    s.push({ nivel: "important", titlu: "Fixează o convenție UTM (fără ea nu știi ce canal aduce banii)", text: "Folosește același șablon peste tot: utm_source=<platformă>&utm_medium=<paid_social|organic|email>&utm_campaign=<cod-intern>_<luna-an>&utm_content=<varianta-creativ>. Pentru campanii de caz folosește un COD INTERN (ex. c014_2026-10), niciodată numele beneficiarului, diagnosticul sau localitatea — parametrii ajung în analytics și la platformele de reclame. Pune șablonul pe fiecare link către pagina de donație și pe codurile QR, iar pentru transferurile bancare cere un cod de campanie în mențiune; notează modelul la întrebarea 70." });
  }
  if (!alocare.areDovezi) {
    s.push({ nivel: "important", titlu: "Alocarea de acum e bazată pe euristici, nu pe datele tale", text: "Nu ai introdus încă % din donatorii noi pe canal și costul real per donator (secțiunea Canale). Adaugă în formularul de donație întrebarea „De unde ai auzit de noi?” și recalculează după 60 de zile: datele reale contează cu atât mai mult în scor cu cât ai mai mulți donatori măsurați (completează câți în Buget). „De unde ai auzit” supra-atribuie canalele vizibile (Facebook) și sub-atribuie căutarea pe Google — folosește-l împreună cu UTM, nu în locul lui." });
  }
  s.push({
    nivel: "important",
    titlu: "Cazuri medicale, minori, persoane vulnerabile: verificările de dinainte de promovare",
    text: "Parcurge lista de verificări din secțiunea Sinteză înainte de orice promovare plătită: consimțământ scris separat pentru poveste, imagine și reclame plătite (întrebarea 93); date minime despre beneficiar; niciodată liste de beneficiari sau părinți încărcate ca audiențe; politicile platformelor pentru strângeri de fonduri și conținut medical verificate de un responsabil numit (întrebarea 96); procedură de retragere; transparență privind costul promovării și surplusul. Limitele etice (întrebările 10 și 54) au prioritate față de costul per donator — nu testa niciodată suferința ca variabilă.",
  });
  if (d.conversie === "recurenta" || (parseNum(d.mix.recurent) ?? 0) >= 30) {
    s.push({ nivel: "recomandat", titlu: "Optimizează pentru donația recurentă", text: "Oferă „Devino susținător lunar” ca alegere explicită și vizibilă (nu preselectată), cu 3 sume sugerate și impactul fiecăreia (întrebarea 4); spune clar că donația lunară susține organizația, nu un caz anume. Trimite după prima donație o secvență de mulțumire la ziua 0, 2, 7, 30 și 90 și, după ce donatorul a văzut impactul (ziua 30), invită-l blând la lunar — fără să transformi tacit o donație pentru un copil anume într-un abonament." });
  } else if (d.conversie === "unica") {
    s.push({ nivel: "idee", titlu: "Donație unică: sugerează sume și impact", text: "Afișează 3 sume-prag (ex. o sumă mică, una medie, una „care schimbă ceva”), fiecare cu ce înseamnă concret. După donație, oferă recurentul ca pas doi, nu ca pas unu." });
  }
  const email = { text: "Email/WhatsApp sunt canalele tale proprii și cele mai ieftine: cere permisiunea explicită (temei legal documentat, întrebarea 95), segmentează după recență (activ / în risc / inactiv) și trimite update-uri de impact, nu doar cereri de bani." };
  s.push({ nivel: "recomandat", titlu: "Folosește canalele proprii înainte să plătești reclame", text: email.text });
  if (!esteCompletat(d.raspunsuri[69])) {
    s.push({ nivel: "recomandat", titlu: "Activează audiențele proprii (legal)", text: "Lista de donatori poate fi încărcată ca audiență personalizată doar cu consimțământ specific pentru publicitate personalizată pe platforme sau cu o bază legală confirmată de responsabilul cu protecția datelor — încărcarea unei liste e o comunicare de date către o terță parte, iar apartenența la lista unui ONG medical poate dezvălui indirect date de sănătate. Nu încărca NICIODATĂ liste cu beneficiari, părinți sau pacienți. Verifică politicile platformelor înainte de audiențe similare pe cauze medicale, apoi exclude donatorii existenți din campaniile de achiziție." });
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
  if (stat && stat.medianaUnica > 0 && !parseNum(d.buget.donatieUnica)) {
    s.push({ nivel: "idee", titlu: `Donația unică tipică din platformă: ${lei(stat.medianaUnica)}`, text: `Din ${stat.donatii} donații unice reușite (medie ${lei(stat.medieUnica)}, mediană ${lei(stat.medianaUnica)}, nete de rambursări; încasările lunare sunt tratate separat). Mediana reprezintă mai bine o donație obișnuită decât media. Folosește-o ca punct de plecare pentru costul maxim per donator.` });
  }
  if (stat && stat.abonamenteActive > 0) {
    s.push({ nivel: "idee", titlu: `${stat.abonamenteActive} ${stat.abonamenteActive === 1 ? "abonament lunar activ" : "abonamente lunare active"} în platformă`, text: `${stat.procentRecurent}% din venitul online net vine din donații recurente. Suma lunară tipică: ${lei(stat.medianaLunara)}. Cu ea poți completa donația lunară medie din Buget și poți calcula costul maxim per donator recurent.` });
  }
  s.push({ nivel: "idee", titlu: "Testează cu disciplină: o singură variabilă", text: "Fiecare test = o ipoteză (întrebarea 97): „Dacă schimb [hook-ul], atunci [CTR-ul] crește, pentru [publicul X], în [14 zile]”. Schimbă un singur lucru o dată (hook, imagine, CTA sau public), lasă testul să ruleze cel puțin 7–14 zile și decide după reguli scrise de oprire/continuare/scalare (întrebarea 99)." });
  s.push({ nivel: "idee", titlu: "Rotește creativele înainte de oboseala publicului", text: "Când aceeași persoană vede același material de prea multe ori, conversia scade. Ca regulă practică, schimbă creativul la 2–3 săptămâni sau când frecvența crește vizibil și costul per donator urcă — notează după câte expuneri apare la tine (întrebarea 59). Nu lăsa optimizarea să te împingă spre imaginile cele mai dureroase doar pentru că convertesc mai bine: testează hook-uri, formate și îndemnuri, nu suferința." });
  s.push({ nivel: "idee", titlu: "Calendarul care contează în România", text: "1 iunie (Ziua Copilului) pentru cauze de copii; până pe 25 mai — redirecționarea de 3,5% prin Formular 230 (folosește fereastra de mesaje către donatori); până pe 25 iunie — D177 pentru sponsori; septembrie–noiembrie — firmele își consumă bugetul de sponsorizare înainte de sfârșitul anului (contractul se semnează înainte de plată); noiembrie–decembrie — vârful de generozitate (Giving Tuesday, Crăciun): pregătește campania cu 4–6 săptămâni înainte. Termenele fiscale (Formular 230, D177, mecanica sponsorizării de 20%) se verifică în fiecare an cu contabilul sau pe ANAF. Formular 230 e și motorul tău de retenție: din ianuarie până în mai, scrie foștilor donatori." });
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
