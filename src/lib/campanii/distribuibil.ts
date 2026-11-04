// Regula GDPR „ce campanii pot pleca la AI sau către public” (Agent email, Influenceri, promovare cu AI).
// Fișier pur, fără importuri de valori, ca să fie testat direct (tests/campanii-acorduri.test.mjs).
//
// O campanie poate fi distribuită public dacă: pagina e activă, există acordul de publicare, nu e anonimizată,
// acordul nu a fost retras și, dacă beneficiarul e minor, părintele/tutorele a acceptat distribuirea.
// Povestea (care conține de obicei diagnosticul) pleacă la AI doar în plus cu acordul pentru diagnostic și cu bifa organizației.
// Verificările sunt stricte (=== true / === false): o valoare lipsă sau nepotrivită ca tip NU deschide distribuirea.

export type AcorduriCampanie = {
  consimtamantGdpr: boolean;
  minor: boolean;
  acordDistribuireMinor: boolean;
  anonimizat: boolean;
  acordRetras: boolean;
  acordDiagnostic: boolean;
};

export type CampaniePentruDistribuire = AcorduriCampanie & { status: string };

export type MotivNedistribuibil = "fara_acord_publicare" | "anonimizat" | "acord_retras" | "minor_fara_acord";

// Primul motiv pentru care acordurile NU permit distribuirea (indiferent de starea paginii), sau null dacă permit.
export function motivNedistribuibil(p: AcorduriCampanie): MotivNedistribuibil | null {
  if (p.anonimizat !== false) return "anonimizat";
  if (p.acordRetras !== false) return "acord_retras";
  if (p.consimtamantGdpr !== true) return "fara_acord_publicare";
  if (p.minor !== false && p.acordDistribuireMinor !== true) return "minor_fara_acord";
  return null;
}

export const acordPermiteDistribuirea = (p: AcorduriCampanie): boolean => motivNedistribuibil(p) === null;

// Pagina activă + acordurile permit: campania poate fi propusă firmelor, dată influencerilor sau promovată public.
export const poateFiDistribuit = (p: CampaniePentruDistribuire): boolean => p.status === "activa" && acordPermiteDistribuirea(p);

// Povestea (diagnostic, descrierea cazului) pleacă la AI doar dacă campania poate fi distribuită, există acordul pentru diagnostic și organizația a bifat trimiterea poveștii.
export const poatePlecaPovesteaLaAi = (p: CampaniePentruDistribuire, orgAreBifa: boolean): boolean =>
  poateFiDistribuit(p) && p.acordDiagnostic === true && orgAreBifa === true;

// Aceeași regulă ca SQL pentru interogările brute cu `fundraising_pages` aliasată (alias fix, din cod, niciodată din intrare).
export function conditieSqlDistribuibil(alias: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(alias)) throw new Error("Alias SQL invalid.");
  const c = (nume: string) => `${alias}.${nume}`;
  return [
    `${c("status")} = 'activa'`,
    `${c("consimtamant_gdpr")} = true`,
    `${c("anonimizat")} = false`,
    `${c("acord_retras")} = false`,
    `(${c("minor")} = false or ${c("acord_distribuire_minor")} = true)`,
  ].join(" and ");
}

// Mesajul arătat când o campanie nu poate fi folosită la promovarea cu AI (în limba interfeței).
export function mesajNedistribuibil(motiv: MotivNedistribuibil, locale: "ro" | "en"): string {
  const ro = locale === "ro";
  switch (motiv) {
    case "anonimizat":
      return ro ? "Cazul este marcat ca anonimizat și nu poate fi folosit la promovarea cu AI." : "The case is marked as anonymized and cannot be used for AI promotion.";
    case "acord_retras":
      return ro ? "Acordul pentru acest caz a fost retras: nu îl mai putem folosi la promovarea cu AI." : "Consent for this case was withdrawn: we can no longer use it for AI promotion.";
    case "minor_fara_acord":
      return ro
        ? "Beneficiarul este minor și lipsește acordul părintelui sau al tutorelui pentru distribuire: nu putem folosi cazul la promovarea cu AI. Bifează acordul la „Acorduri și protecția datelor”, dacă îl ai."
        : "The beneficiary is a minor and the parent's or guardian's consent to share is missing: we cannot use the case for AI promotion. Tick the consent under “Consents and data protection” if you have it.";
    default:
      return ro ? "Campania nu are acordul pentru publicare, deci nu o putem folosi la promovarea cu AI. Verifică „Acorduri și protecția datelor” la campanie." : "The campaign has no consent to be published, so we cannot use it for AI promotion. Check “Consents and data protection” on the campaign.";
  }
}

// Promovarea cu AI (postări, calendar, comunicat, mulțumiri): o campanie care nu poate fi distribuită nu ajunge deloc la AI;
// povestea pleacă doar dacă poatePlecaPovesteaLaAi (acord pentru diagnostic + bifa organizației).
export type VerdictPromovareAi = { ok: true; povesteLaAi: boolean } | { ok: false; eroare: string };

export function verdictPromovareAi(p: CampaniePentruDistribuire, orgAreBifa: boolean, locale: "ro" | "en"): VerdictPromovareAi {
  const motiv = motivNedistribuibil(p);
  if (motiv) return { ok: false, eroare: mesajNedistribuibil(motiv, locale) };
  return { ok: true, povesteLaAi: poatePlecaPovesteaLaAi(p, orgAreBifa) };
}

// Doar câmpurile care contează pentru regulă, din rândul paginii (ca să nu căram povestea după noi).
export const acorduriDin = (p: CampaniePentruDistribuire): CampaniePentruDistribuire => ({
  status: p.status,
  consimtamantGdpr: p.consimtamantGdpr,
  minor: p.minor,
  acordDistribuireMinor: p.acordDistribuireMinor,
  anonimizat: p.anonimizat,
  acordRetras: p.acordRetras,
  acordDiagnostic: p.acordDiagnostic,
});

// Citire strictă a unei bife dintr-un formular: lipsă = false, exact "1" = true, orice altceva (valoare străină, dublură) = null (invalid).
export function citesteBifa(valori: readonly unknown[]): boolean | null {
  if (valori.length === 0) return false;
  if (valori.length === 1 && valori[0] === "1") return true;
  return null;
}
