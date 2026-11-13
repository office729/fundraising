// Activitatea utilizatorilor, pentru Panou platformă: cine a intrat prima și ultima dată, cine a lucrat și dacă e activ. Funcții pure, fără importuri externe (se testează direct).
//
//  - prima/ultima autentificare: app_users.first_login_at / last_login_at (parola introdusă la /login);
//  - „ultima vizită”: app_users.last_seen_at — ultima pagină din CRM deschisă (sesiunea poate dura zile fără o nouă autentificare);
//  - „ultima lucrare”: app_users.last_action_at — ultima acțiune făcută în CRM (salvare, import, căutare, trimitere...).
// Ultimele două se scriu cel mult o dată la 5 minute, ca să nu încarce baza de date.

export const PRAG_SCRIERE_MS = 5 * 60_000;
export const ZILE_ACTIV = 14;
const ZI_MS = 86_400_000;

export type SemnaleActivitate = {
  creatLa: Date;
  primaAutentificare: Date | null;
  ultimaAutentificare: Date | null;
  ultimaVizita: Date | null;
  ultimaLucrare: Date | null;
};

export type StareUtilizator = "activ" | "inactiv" | "niciodata";

// Merită o scriere nouă? Doar dacă nu s-a notat nimic sau a trecut pragul de la ultima notare.
export function trebuieNotat(ultima: Date | null | undefined, acum: Date): boolean {
  if (!ultima) return true;
  return acum.getTime() - ultima.getTime() >= PRAG_SCRIERE_MS;
}

const maxData = (...d: (Date | null | undefined)[]): Date | null =>
  d.reduce<Date | null>((m, x) => (x && (!m || x.getTime() > m.getTime()) ? x : m), null);

// Cel mai recent semn de viață: ce s-a notat mai nou dintre autentificare, vizită și lucrare.
export function ultimulSemn(s: Pick<SemnaleActivitate, "ultimaAutentificare" | "ultimaVizita" | "ultimaLucrare">): Date | null {
  return maxData(s.ultimaAutentificare, s.ultimaVizita, s.ultimaLucrare);
}

// Activ = un semn de viață în ultimele ZILE_ACTIV zile. Inactiv = a intrat vreodată, dar mai demult. Niciodată = nu s-a autentificat și nu există nicio activitate.
export function stareUtilizator(s: SemnaleActivitate, acum: Date): { stare: StareUtilizator; zileDeLaUltimulSemn: number | null } {
  const semn = ultimulSemn(s);
  if (!semn) return { stare: "niciodata", zileDeLaUltimulSemn: null };
  const zile = Math.max(0, Math.floor((acum.getTime() - semn.getTime()) / ZI_MS));
  return { stare: zile <= ZILE_ACTIV ? "activ" : "inactiv", zileDeLaUltimulSemn: zile };
}

// Prima intrare: data notată; la conturile mai vechi (dinainte de notare) folosim data creării contului, marcată ca estimare — dar numai dacă s-a autentificat cu adevărat.
export function primaIntrare(s: Pick<SemnaleActivitate, "creatLa" | "primaAutentificare" | "ultimaAutentificare" | "ultimaVizita" | "ultimaLucrare">): { data: Date | null; estimata: boolean } {
  if (s.primaAutentificare) return { data: s.primaAutentificare, estimata: false };
  if (ultimulSemn(s)) return { data: s.creatLa, estimata: true };
  return { data: null, estimata: false };
}

// „Fără activitate înregistrată” (nu „nu a intrat niciodată”): conturile mai vechi, confirmate pe email sau create cu Google, nu aveau notată autentificarea.
export const ETICHETE_STARE: Record<StareUtilizator, string> = { activ: "Activ", inactiv: "Inactiv", niciodata: "Fără activitate înregistrată" };
