"use server";

import { cerePlatformAdminActiune } from "@/lib/auth/platform-admin";
import { jurnalizeazaPersonalizare, scriePersonalizare, stergePersonalizare } from "@/lib/suport/personalizare-admin";
import { valideazaPersonalizare } from "@/lib/personalizare-org";

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
