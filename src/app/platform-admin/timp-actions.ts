"use server";

import { cerePlatformAdminActiune } from "@/lib/auth/platform-admin";
import { adaugaIntrare, opreste, porneste, scrieTarife, stergeIntrare } from "@/lib/suport/timp-admin";
import { curataDescriere, EXECUTANTI, CATEGORII, valideazaIntrare, valideazaTarife } from "@/lib/timp-custom";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const orgOk = (x: unknown): x is string => typeof x === "string" && UUID.test(x);

export type RezultatTimp = { ok: true; minute?: number } | { ok: false; eroare: string };

// Toate acțiunile cer administrator al platformei și validează strict ce primesc (tipurile TypeScript nu protejează o acțiune apelată direct).
export async function adaugaIntrareAction(orgId: string, brut: unknown): Promise<RezultatTimp> {
  const actor = await cerePlatformAdminActiune();
  if (!orgOk(orgId)) return { ok: false, eroare: "Organizație invalidă." };
  const v = valideazaIntrare(brut);
  if (!v.ok) return { ok: false, eroare: v.eroare };
  try {
    await adaugaIntrare(orgId, v.valoare, actor);
  } catch (e) {
    console.error("[platform-admin] adăugarea intrării de timp a eșuat:", e);
    return { ok: false, eroare: "Nu am putut salva intrarea. Verifică dacă tabelele de timp au fost create în baza de date." };
  }
  return { ok: true };
}

export async function stergeIntrareAction(orgId: string, id: string): Promise<RezultatTimp> {
  await cerePlatformAdminActiune();
  if (!orgOk(orgId) || !orgOk(id)) return { ok: false, eroare: "Date invalide." };
  try {
    await stergeIntrare(orgId, id);
  } catch (e) {
    console.error("[platform-admin] ștergerea intrării de timp a eșuat:", e);
    return { ok: false, eroare: "Nu am putut șterge intrarea." };
  }
  return { ok: true };
}

export async function pornesteTimerAction(orgId: string, brut: unknown): Promise<RezultatTimp> {
  const actor = await cerePlatformAdminActiune();
  if (!orgOk(orgId)) return { ok: false, eroare: "Organizație invalidă." };
  const o = typeof brut === "object" && brut !== null ? (brut as Record<string, unknown>) : {};
  const descriere = curataDescriere(o.descriere);
  if (typeof o.executant !== "string" || !Object.prototype.hasOwnProperty.call(EXECUTANTI, o.executant)) return { ok: false, eroare: "Alege cine lucrează." };
  if (typeof o.categorie !== "string" || !Object.prototype.hasOwnProperty.call(CATEGORII, o.categorie)) return { ok: false, eroare: "Alege categoria." };
  if (descriere === null) return { ok: false, eroare: "Scrie o descriere de 3–300 de caractere." };
  try {
    return await porneste(orgId, { executant: o.executant as keyof typeof EXECUTANTI, categorie: o.categorie as keyof typeof CATEGORII, descriere }, actor);
  } catch (e) {
    console.error("[platform-admin] pornirea timerului a eșuat:", e);
    return { ok: false, eroare: "Nu am putut porni timerul. Verifică dacă tabelele de timp au fost create în baza de date." };
  }
}

export async function opresteTimerAction(orgId: string, id: string): Promise<RezultatTimp> {
  const actor = await cerePlatformAdminActiune();
  if (!orgOk(orgId) || !orgOk(id)) return { ok: false, eroare: "Date invalide." };
  try {
    return await opreste(orgId, id, actor);
  } catch (e) {
    console.error("[platform-admin] oprirea timerului a eșuat:", e);
    return { ok: false, eroare: "Nu am putut opri timerul." };
  }
}

export async function salveazaTarifeAction(orgId: string, brut: unknown): Promise<RezultatTimp> {
  const actor = await cerePlatformAdminActiune();
  if (!orgOk(orgId)) return { ok: false, eroare: "Organizație invalidă." };
  const v = valideazaTarife(brut);
  if (!v.ok) return { ok: false, eroare: v.eroare };
  try {
    await scrieTarife(orgId, v.valoare, actor);
  } catch (e) {
    console.error("[platform-admin] salvarea tarifelor a eșuat:", e);
    return { ok: false, eroare: "Nu am putut salva tarifele." };
  }
  return { ok: true };
}
