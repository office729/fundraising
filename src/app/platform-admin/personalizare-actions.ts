"use server";

import { cerePlatformAdminActiune } from "@/lib/auth/platform-admin";
import { jurnalizeazaPersonalizare, scriePersonalizare, scrieNota, stergePersonalizare } from "@/lib/suport/personalizare-admin";
import { curataNota, LUNGIME_MAXIMA_NOTA, valideazaPersonalizare } from "@/lib/personalizare-org";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RezultatPersonalizare = { ok: true } | { ok: false; eroare: string };

// Salvează aspectul unei organizații. Tipurile TypeScript nu protejează o acțiune apelată direct: verificăm drepturile, id-ul și configurarea (strict) pe server.
export async function salveazaPersonalizareAction(orgId: string, brut: unknown): Promise<RezultatPersonalizare> {
  const actor = await cerePlatformAdminActiune();
  if (typeof orgId !== "string" || !UUID.test(orgId)) return { ok: false, eroare: "Organizație invalidă." };
  const v = valideazaPersonalizare(brut);
  if (!v.ok) return { ok: false, eroare: v.eroare };
  try {
    await scriePersonalizare(orgId, v.valoare, actor);
    await jurnalizeazaPersonalizare(orgId, actor, "platform_personalizare_salvata", { noi: v.valoare });
  } catch (e) {
    console.error("[platform-admin] salvarea personalizării a eșuat:", e);
    return { ok: false, eroare: "Nu am putut salva. Verifică dacă tabelul org_personalizare a fost creat în baza de date." };
  }
  return { ok: true };
}

// Revenire la aspectul standard.
export async function reseteazaPersonalizareAction(orgId: string): Promise<RezultatPersonalizare> {
  const actor = await cerePlatformAdminActiune();
  if (typeof orgId !== "string" || !UUID.test(orgId)) return { ok: false, eroare: "Organizație invalidă." };
  try {
    await stergePersonalizare(orgId);
    await jurnalizeazaPersonalizare(orgId, actor, "platform_personalizare_resetata");
  } catch (e) {
    console.error("[platform-admin] resetarea personalizării a eșuat:", e);
    return { ok: false, eroare: "Nu am putut reveni la aspectul standard." };
  }
  return { ok: true };
}

// Notița internă a echipei platformei despre ce diferă la o organizație. Nu intră în jurnalul de audit al organizației (acela poate fi citit de ea).
export async function salveazaNotaAction(orgId: string, nota: unknown): Promise<RezultatPersonalizare> {
  const actor = await cerePlatformAdminActiune();
  if (typeof orgId !== "string" || !UUID.test(orgId)) return { ok: false, eroare: "Organizație invalidă." };
  const curata = curataNota(nota);
  if (curata === null) return { ok: false, eroare: `Notița poate avea cel mult ${LUNGIME_MAXIMA_NOTA} de caractere.` };
  try {
    await scrieNota(orgId, curata, actor);
  } catch (e) {
    console.error("[platform-admin] salvarea notiței a eșuat:", e);
    return { ok: false, eroare: "Nu am putut salva notița. Verifică dacă tabelul org_personalizare_note a fost creat în baza de date." };
  }
  return { ok: true };
}
