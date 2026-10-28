// Prioritizarea firmelor pe benzi A/B/C, după eligibilitate fiscală și accesibilitate, nu după cifra de afaceri brută. Deterministă și explicabilă
// (fără AI): fiecare firmă primește banda pe baza unor criterii pe care le poți verifica. Modul pur, fără importuri: aceleași reguli sunt
// scrise în SQL în crm/companii/queries.ts (pentru filtre și sortare) și aici (pentru afișare și teste). Portat din CRM-ul Asociației Salvează o Inimă.
//
//  A = eligibilă pentru redirecționarea impozitului pe profit (D177) ȘI abordabilă acum (site, rețele sociale sau un contact salvat):
//      prima în lista de lucru, se pretează la secvențe de mesaje.
//  B = eligibilă D177, dar fără urmă online sau contact, cu potențial mare (suma disponibilă peste prag): merită un apel direct, prin administrator.
//  C = restul (micro, cu pierdere, fără date sau cu potențial mic și fără contact): nu justifică efort 1 la 1; se abordează în lot.

export type Banda = "A" | "B" | "C";
export const BENZI: readonly Banda[] = ["A", "B", "C"];

// Pragurile sunt estimări de lucru, nu reguli fiscale.
export const PRAG_MICRO_CA = 2_500_000; // lei: sub acest nivel, firma e probabil microîntreprindere (nu plătește impozit pe profit)
export const PRAG_BANDA_B = 15_000; // lei: sub această sumă disponibilă, o firmă fără contact nu merită un apel direct

export type IntrareBanda = {
  regimFiscal: string | null; // profit | micro | pierdere | necunoscut
  profit: number | null;
  ca: number | null;
  sumaDisponibila: number | null;
  areUrma: boolean; // site, LinkedIn, Facebook sau cel puțin un contact salvat
};

// Eligibilă D177: regimul fiscal cunoscut „profit”, sau (regim necunoscut, ca în majoritatea bazei) profit pozitiv și cifră de afaceri peste pragul micro.
export function esteEligibilaD177(x: Pick<IntrareBanda, "regimFiscal" | "profit" | "ca">): boolean {
  if (x.regimFiscal === "profit") return true;
  if (x.regimFiscal === "micro" || x.regimFiscal === "pierdere") return false;
  return (x.profit ?? 0) > 0 && (x.ca ?? 0) >= PRAG_MICRO_CA;
}

export function bandaFirma(x: IntrareBanda): Banda {
  if (!esteEligibilaD177(x)) return "C";
  if (x.areUrma) return "A";
  return (x.sumaDisponibila ?? 0) >= PRAG_BANDA_B ? "B" : "C";
}

export type ContactabilitateInput = { site: boolean; retea: boolean; contactSalvat: boolean; telefon: boolean };

// Cât de ușor se ajunge la un decident cu ce există deja: site +2, LinkedIn/Facebook +2, contact salvat +3, telefon pe firmă +1 (maximum 8).
export function scorContactabilitate(x: ContactabilitateInput): number {
  return (x.site ? 2 : 0) + (x.retea ? 2 : 0) + (x.contactSalvat ? 3 : 0) + (x.telefon ? 1 : 0);
}

export function esteBanda(v: unknown): v is Banda {
  return v === "A" || v === "B" || v === "C";
}

// ===== Suma sponsorizabilă estimată din bilanț =====
// Fallback pentru firmele la care suma disponibilă nu e completată de mână: o firmă care plătește impozit pe profit poate sponsoriza (sau redirecționa prin D177)
// cel mult 20% din impozitul pe profit, dar nu mai mult de 0,75% din cifra de afaceri. Impozitul e cel din bilanț, dacă există, altfel 16% din profit.
// Valoarea estimată NU se scrie în baza de date și nu înlocuiește una introdusă de mână. Procentele sunt estimări de lucru: confirmă-le cu contabilul înainte să te bazezi pe ele.
export const COTA_IMPOZIT_PROFIT = 0.16;
export const PLAFON_SPONSORIZARE_CA = 0.0075;
export const PLAFON_SPONSORIZARE_IMPOZIT = 0.2;

export type IntrareEstimare = { regimFiscal: string | null; profit: number | null; ca: number | null; impozit: number | null };

// 0 când firma nu e eligibilă (micro, cu pierdere, fără date) sau când lipsesc cifra de afaceri ori impozitul.
export function sumaSponsorizabilaEstimata(x: IntrareEstimare): number {
  if (!esteEligibilaD177(x)) return 0;
  const ca = x.ca ?? 0;
  const impozit = (x.impozit ?? 0) > 0 ? (x.impozit as number) : Math.max(0, x.profit ?? 0) * COTA_IMPOZIT_PROFIT;
  if (ca <= 0 || impozit <= 0) return 0;
  return Math.max(0, Math.round(Math.min(ca * PLAFON_SPONSORIZARE_CA, impozit * PLAFON_SPONSORIZARE_IMPOZIT)));
}

// Suma cu care se lucrează (scor, benzi, sortare): cea introdusă de mână dacă e pozitivă, altfel estimarea. `estimata` = true când suma vine din bilanț.
export function sumaEfectiva(manual: number | null | undefined, x: IntrareEstimare): { suma: number; estimata: boolean } {
  if ((manual ?? 0) > 0) return { suma: manual as number, estimata: false };
  const e = sumaSponsorizabilaEstimata(x);
  return { suma: e, estimata: e > 0 };
}
