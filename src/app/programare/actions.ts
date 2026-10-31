"use server";

import { anuleazaDupaToken, paginaPublica, rezerva, sloturiZi, zileDisponibile, type RezultatRezervare, type TipPublic } from "@/lib/programari/server";
import { PROGRAMARE_UI_DICT } from "@/lib/i18n/dictionaries/programare-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import type { Slot } from "@/lib/programari/sloturi";

// Punctele publice ale calendarului de programări. Tot ce vine din browser e validat din nou în lib/programari/server (tip, dată, slot liber, persoană).
export async function paginaAction(): Promise<{ tipuri: TipPublic[]; cereTelefon: boolean }> {
  const p = await paginaPublica().catch(() => null);
  return { tipuri: p?.tipuri ?? [], cereTelefon: p?.setari.cereTelefon ?? false };
}

export async function zileDisponibileAction(tipId: string, an: number, luna: number): Promise<string[]> {
  return zileDisponibile(String(tipId), Number(an), Number(luna)).catch(() => []);
}

export async function sloturiAction(tipId: string, data: string): Promise<Slot[]> {
  return sloturiZi(String(tipId), String(data)).catch(() => []);
}

export async function rezervaAction(intrare: { tipId: string; startUtc: string; persoana: unknown; capcana?: string; sursa?: string }): Promise<RezultatRezervare> {
  const t = PROGRAMARE_UI_DICT[await getLocale()];
  if (!intrare || typeof intrare !== "object") return { ok: false, eroare: t.cerereInvalida };
  const r = await rezerva({ tipId: String(intrare.tipId), startUtc: String(intrare.startUtc), persoana: intrare.persoana, capcana: typeof intrare.capcana === "string" ? intrare.capcana : "", sursa: typeof intrare.sursa === "string" ? intrare.sursa : undefined });
  if (r.ok) return r;
  // Mesajele vin în română din lib/programari/*; le aducem în limba curentă (cele necunoscute rămân neschimbate).
  const tr = (m: string) => t.mesajeServer[m] ?? m;
  return { ...r, eroare: tr(r.eroare), campuri: r.campuri ? Object.fromEntries(Object.entries(r.campuri).map(([k, m]) => [k, tr(m)])) : undefined };
}

export async function anuleazaAction(token: string): Promise<{ ok: boolean; eroare?: string }> {
  const t = PROGRAMARE_UI_DICT[await getLocale()];
  const r = await anuleazaDupaToken(String(token)).catch(() => ({ ok: false, eroare: t.anulareEsuata }));
  return r.eroare ? { ...r, eroare: t.mesajeServer[r.eroare] ?? r.eroare } : r;
}
