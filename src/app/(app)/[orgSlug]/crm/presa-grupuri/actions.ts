"use server";

import { and, eq } from "drizzle-orm";

import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { fundraisingLocalGroups, fundraisingMediaContacts } from "@/lib/db/schema";

const MEDIA_TIPURI = ["publicatie", "tv", "radio", "site"] as const;
const GROUP_PLATFORME = ["facebook", "whatsapp", "altul"] as const;

export type FormState = { error: string | null };
const OK: FormState = { error: null };

export const listMediaContacts = withOrgSession(async (ctx) => {
  return ctx.db.select().from(fundraisingMediaContacts).where(eq(fundraisingMediaContacts.orgId, ctx.orgId));
});

export const adaugaMediaContactAction = withOrgAdmin(
  async (ctx, _prevState: FormState, formData: FormData): Promise<FormState> => {
    const judet = String(formData.get("judet") ?? "").trim();
    const numeRedactie = String(formData.get("numeRedactie") ?? "").trim();
    const tip = String(formData.get("tip") ?? "");
    if (!judet) return { error: "Județul este obligatoriu." };
    if (!numeRedactie) return { error: "Numele redacției este obligatoriu." };
    if (!MEDIA_TIPURI.includes(tip as (typeof MEDIA_TIPURI)[number])) return { error: "Tip de contact invalid." };

    await ctx.db.insert(fundraisingMediaContacts).values({
      orgId: ctx.orgId,
      judet,
      tip: tip as (typeof MEDIA_TIPURI)[number],
      numeRedactie,
      email: String(formData.get("email") ?? "").trim() || null,
      telefon: String(formData.get("telefon") ?? "").trim() || null,
      website: String(formData.get("website") ?? "").trim() || null,
      persoanaContact: String(formData.get("persoanaContact") ?? "").trim() || null,
    });
    return OK;
  },
);

export const stergeMediaContactAction = withOrgAdmin(async (ctx, id: string) => {
  await ctx.db.delete(fundraisingMediaContacts).where(and(eq(fundraisingMediaContacts.id, id), eq(fundraisingMediaContacts.orgId, ctx.orgId)));
});

export const listLocalGroups = withOrgSession(async (ctx) => {
  return ctx.db.select().from(fundraisingLocalGroups).where(eq(fundraisingLocalGroups.orgId, ctx.orgId));
});

export const adaugaLocalGroupAction = withOrgAdmin(
  async (ctx, _prevState: FormState, formData: FormData): Promise<FormState> => {
    const judet = String(formData.get("judet") ?? "").trim();
    const nume = String(formData.get("nume") ?? "").trim();
    const link = String(formData.get("link") ?? "").trim();
    const platforma = String(formData.get("platforma") ?? "");
    if (!judet) return { error: "Județul este obligatoriu." };
    if (!nume) return { error: "Numele grupului este obligatoriu." };
    if (!link) return { error: "Link-ul grupului este obligatoriu." };
    if (!GROUP_PLATFORME.includes(platforma as (typeof GROUP_PLATFORME)[number])) return { error: "Platformă invalidă." };

    await ctx.db.insert(fundraisingLocalGroups).values({
      orgId: ctx.orgId,
      judet,
      localitate: String(formData.get("localitate") ?? "").trim() || null,
      platforma: platforma as (typeof GROUP_PLATFORME)[number],
      nume,
      link,
      categorie: String(formData.get("categorie") ?? "").trim() || null,
    });
    return OK;
  },
);

export const stergeLocalGroupAction = withOrgAdmin(async (ctx, id: string) => {
  await ctx.db.delete(fundraisingLocalGroups).where(and(eq(fundraisingLocalGroups.id, id), eq(fundraisingLocalGroups.orgId, ctx.orgId)));
});

const GROUP_STATUSES = ["activ", "inactiv"] as const;
export const actualizeazaStatusGrupAction = withOrgAdmin(async (ctx, id: string, status: (typeof GROUP_STATUSES)[number]) => {
  if (!GROUP_STATUSES.includes(status)) return;
  await ctx.db
    .update(fundraisingLocalGroups)
    .set({ status })
    .where(and(eq(fundraisingLocalGroups.id, id), eq(fundraisingLocalGroups.orgId, ctx.orgId)));
});
