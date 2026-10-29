"use server";

import { anuleazaDupaToken, paginaPublica, rezerva, sloturiZi, zileDisponibile, type RezultatRezervare, type TipPublic } from "@/lib/programari/server";
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
  if (!intrare || typeof intrare !== "object") return { ok: false, eroare: "Cerere invalidă." };
  return rezerva({ tipId: String(intrare.tipId), startUtc: String(intrare.startUtc), persoana: intrare.persoana, capcana: typeof intrare.capcana === "string" ? intrare.capcana : "", sursa: typeof intrare.sursa === "string" ? intrare.sursa : undefined });
}

export async function anuleazaAction(token: string): Promise<{ ok: boolean; eroare?: string }> {
  return anuleazaDupaToken(String(token)).catch(() => ({ ok: false, eroare: "Nu am putut anula acum. Încearcă din nou." }));
}
