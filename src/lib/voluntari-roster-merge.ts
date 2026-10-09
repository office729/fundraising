// Îmbinarea modificărilor pe lista de voluntari (CRM Voluntari). Înainte, fiecare salvare trimitea TOATĂ lista și o înlocuia pe cea de pe
// server: dacă două colege lucrau simultan, cea care salva ultima ștergea modificările celeilalte. Acum clientul trimite doar ce s-a schimbat
// (voluntari modificați, voluntari șterși, setări), iar serverul îmbină în tranzacție, sub blocarea rândului.

export type Voluntar = { id: string; [camp: string]: unknown };
export type Roster = { volunteers: Voluntar[]; settings?: unknown; updatedBy?: string; updatedAt?: string };
export type Modificari = { changed?: unknown; deleted?: unknown; settings?: unknown; updatedBy?: unknown };

export const MAX_MODIFICATI = 2000;
export const MAX_BYTES_VOLUNTAR = 40_000;

const idValid = (id: unknown): id is string => typeof id === "string" && id.length > 0 && id.length <= 100;

// Un voluntar acceptat: obiect cu id text; cei demonstrativi („demo-…”) nu se salvează niciodată.
export function voluntarValid(v: unknown): v is Voluntar {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const id = (v as { id?: unknown }).id;
  if (!idValid(id) || id.startsWith("demo-")) return false;
  return JSON.stringify(v).length <= MAX_BYTES_VOLUNTAR;
}

export function imbinaRoster(existent: unknown, m: Modificari, acum: Date = new Date()): { roster: Roster; modificati: number; stersi: number } {
  const baza = (existent && typeof existent === "object" ? existent : {}) as Partial<Roster>;
  const lista: Voluntar[] = Array.isArray(baza.volunteers) ? baza.volunteers.filter((v): v is Voluntar => !!v && typeof v === "object" && idValid((v as Voluntar).id)) : [];

  const modificati = (Array.isArray(m.changed) ? m.changed : []).slice(0, MAX_MODIFICATI).filter(voluntarValid);
  const stersi = new Set((Array.isArray(m.deleted) ? m.deleted : []).filter(idValid).slice(0, MAX_MODIFICATI));

  const dupaId = new Map(lista.map((v) => [v.id, v]));
  const noi: Voluntar[] = [];
  for (const v of modificati) {
    if (stersi.has(v.id)) continue; // șters și modificat în același pachet: câștigă ștergerea
    if (dupaId.has(v.id)) dupaId.set(v.id, v);
    else noi.push(v);
  }
  // Ordinea existentă se păstrează; voluntarii noi apar în față (ca în unealtă: „Adaugă voluntar” îl pune primul).
  const volunteers = [...noi, ...lista.map((v) => dupaId.get(v.id)!).filter((v) => !stersi.has(v.id))];

  const roster: Roster = {
    volunteers,
    settings: m.settings !== undefined && m.settings !== null && typeof m.settings === "object" ? m.settings : baza.settings,
    updatedBy: typeof m.updatedBy === "string" ? m.updatedBy.slice(0, 120) : baza.updatedBy,
    updatedAt: acum.toISOString(),
  };
  return { roster, modificati: modificati.length, stersi: stersi.size };
}
