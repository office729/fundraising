import type { CampanieForm } from "./campanie-validare";

// Draftul asistentului de campanie se păstrează doar în acest browser (localStorage), per organizație.
// Pagina de campanie din baza de date există doar publicată; fotografia nu se păstrează în draft.

const VERSIUNE = 1;
const cheie = (orgSlug: string) => `campanie-draft:${orgSlug}`;
const CAMPURI: (keyof CampanieForm)[] = ["titlu", "template", "sumaTinta", "judet", "localitate", "poveste", "numeCreator", "emailCreator"];

export type DraftCampanie = { v: number; form: CampanieForm; pas: number; salvatLa: string };

export function citesteDraft(orgSlug: string): DraftCampanie | null {
  try {
    const brut = window.localStorage.getItem(cheie(orgSlug));
    if (!brut) return null;
    const d = JSON.parse(brut) as DraftCampanie;
    if (d?.v !== VERSIUNE || typeof d.form !== "object" || d.form === null) return null;
    if (CAMPURI.some((c) => typeof d.form[c] !== "string")) return null;
    return { v: VERSIUNE, form: d.form, pas: Number.isInteger(d.pas) ? Math.min(4, Math.max(0, d.pas)) : 0, salvatLa: String(d.salvatLa ?? "") };
  } catch {
    return null;
  }
}

export function salveazaDraft(orgSlug: string, form: CampanieForm, pas: number): boolean {
  try {
    const d: DraftCampanie = { v: VERSIUNE, form, pas, salvatLa: new Date().toISOString() };
    window.localStorage.setItem(cheie(orgSlug), JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

export function stergeDraft(orgSlug: string) {
  try {
    window.localStorage.removeItem(cheie(orgSlug));
  } catch {
    /* browser fără stocare: nu e nimic de șters */
  }
}
