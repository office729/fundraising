"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { inregistreazaAudit } from "@/lib/audit";
import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { esteEntitateCamp, maiPoateAdauga, valideazaDefinitie, type DefinitieCamp, type EntitateCamp, type EroareDefinitie } from "@/lib/campuri-personalizate";
import { listeazaDefinitii, salveazaValori, type RezultatSalvareCampuri } from "@/lib/campuri-personalizate-server";
import { campuriPersonalizate } from "@/lib/db/schema";
import { getLocale } from "@/lib/i18n/get-locale";
import { getTr } from "@/lib/i18n/tr-server";

// Câmpurile personalizate ale organizației (pachetul CREȘTERE): le definesc administratorii, le completează oricine din echipă în fișa donatorului sau a firmei.
const OPTIUNI = { modul: "campuri-personalizate" as const };

export type CampuriOrganizatie = { donator: DefinitieCamp[]; companie: DefinitieCamp[] };

export const listeazaCampuri = withOrgAdmin(async (ctx): Promise<CampuriOrganizatie> => {
  const [donator, companie] = await Promise.all([listeazaDefinitii(ctx.db, ctx.orgId, "donator", false), listeazaDefinitii(ctx.db, ctx.orgId, "companie", false)]);
  return { donator, companie };
}, OPTIUNI);

export type RezultatDefinitie = { ok: true } | { ok: false; mesaj: string; erori?: EroareDefinitie[] };

export const adaugaCamp = withOrgAdmin(async (ctx, brut: { entitate: string; eticheta: string; tip: string; optiuni?: string | string[] }): Promise<RezultatDefinitie> => {
  const t = await getTr();
  const v = valideazaDefinitie(brut, await getLocale());
  if (!v.ok) return { ok: false, mesaj: v.erori[0]?.mesaj ?? t("Verifică câmpul.", "Check the field."), erori: v.erori };
  const existente = await ctx.db
    .select({ cheie: campuriPersonalizate.cheie, ordine: campuriPersonalizate.ordine })
    .from(campuriPersonalizate)
    .where(and(eq(campuriPersonalizate.orgId, ctx.orgId), eq(campuriPersonalizate.entitate, v.def.entitate)));
  if (!maiPoateAdauga(existente.length)) return { ok: false, mesaj: t("Ai atins numărul maxim de câmpuri. Arhivarea unui câmp nu eliberează un loc: cheia lui rămâne rezervată.", "You have reached the maximum number of fields. Archiving a field does not free up a slot: its key stays reserved.") };
  // Cheia e unică pe organizație și entitate: dacă există deja (și arhivată), adăugăm un număr.
  const folosite = new Set(existente.map((e) => e.cheie));
  let cheie = v.def.cheie;
  for (let i = 2; folosite.has(cheie); i++) cheie = `${v.def.cheie.slice(0, 36)}_${i}`;
  await ctx.db.insert(campuriPersonalizate).values({
    orgId: ctx.orgId,
    entitate: v.def.entitate,
    cheie,
    eticheta: v.def.eticheta,
    tip: v.def.tip,
    optiuni: v.def.optiuni,
    ordine: existente.reduce((m, e) => Math.max(m, e.ordine), 0) + 1,
  });
  await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "camp_personalizat_adaugat", entitate: "camp_personalizat", detalii: { entitate: v.def.entitate, cheie, tip: v.def.tip } });
  revalidatePath(`/${ctx.orgSlug}/crm/setari`);
  return { ok: true };
}, OPTIUNI);

// Se pot schimba numele și variantele (la „alegere”). Tipul și cheia nu se schimbă: valorile deja introduse ar rămâne fără sens.
export const actualizeazaCamp = withOrgAdmin(async (ctx, id: string, brut: { eticheta: string; optiuni?: string | string[] }): Promise<RezultatDefinitie> => {
  const t = await getTr();
  const [existent] = await ctx.db.select().from(campuriPersonalizate).where(and(eq(campuriPersonalizate.id, id), eq(campuriPersonalizate.orgId, ctx.orgId))).limit(1);
  if (!existent) return { ok: false, mesaj: t("Câmpul nu a fost găsit.", "The field was not found.") };
  const v = valideazaDefinitie({ entitate: existent.entitate, eticheta: brut.eticheta, tip: existent.tip, optiuni: brut.optiuni ?? existent.optiuni }, await getLocale());
  if (!v.ok) return { ok: false, mesaj: v.erori[0]?.mesaj ?? t("Verifică câmpul.", "Check the field."), erori: v.erori };
  await ctx.db.update(campuriPersonalizate).set({ eticheta: v.def.eticheta, optiuni: v.def.optiuni }).where(and(eq(campuriPersonalizate.id, id), eq(campuriPersonalizate.orgId, ctx.orgId)));
  await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "camp_personalizat_modificat", entitate: "camp_personalizat", entitateId: id });
  revalidatePath(`/${ctx.orgSlug}/crm/setari`);
  return { ok: true };
}, OPTIUNI);

// Arhivare în loc de ștergere: câmpul dispare din fișe, dar valorile rămân (și revin dacă îl reactivezi).
export const seteazaActivCamp = withOrgAdmin(async (ctx, id: string, activ: boolean): Promise<RezultatDefinitie> => {
  const t = await getTr();
  const r = await ctx.db.update(campuriPersonalizate).set({ activ: activ === true }).where(and(eq(campuriPersonalizate.id, id), eq(campuriPersonalizate.orgId, ctx.orgId))).returning({ id: campuriPersonalizate.id });
  if (r.length === 0) return { ok: false, mesaj: t("Câmpul nu a fost găsit.", "The field was not found.") };
  await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: activ ? "camp_personalizat_reactivat" : "camp_personalizat_arhivat", entitate: "camp_personalizat", entitateId: id });
  revalidatePath(`/${ctx.orgSlug}/crm/setari`);
  return { ok: true };
}, OPTIUNI);

// Valorile unui donator sau ale unei firme, din fișa lor. Oricine din echipă le poate completa; se salvează doar câmpurile active ale organizației.
export const salveazaCampuriFisa = withOrgSession(async (ctx, entitate: string, idEntitate: string, valori: Record<string, unknown>): Promise<RezultatSalvareCampuri> => {
  const t = await getTr();
  if (!esteEntitateCamp(entitate as EntitateCamp)) return { ok: false, mesaj: t("Cerere invalidă.", "Invalid request."), erori: {} };
  if (typeof idEntitate !== "string" || !/^[0-9a-f-]{36}$/i.test(idEntitate) || !valori || typeof valori !== "object" || Array.isArray(valori)) return { ok: false, mesaj: t("Cerere invalidă.", "Invalid request."), erori: {} };
  const r = await salveazaValori(ctx.db, ctx.orgId, entitate as EntitateCamp, idEntitate, valori, await getLocale());
  if (r.ok) revalidatePath(`/${ctx.orgSlug}/crm/${entitate === "donator" ? "donatori/reali" : "companii"}/${idEntitate}`);
  return r;
}, OPTIUNI);
