"use server";

import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import { type OrgContext, withOrgSession } from "@/lib/auth/guard";
import { amprentePersoana } from "@/lib/gdpr-persoane";
import { companies, contacts } from "@/lib/db/schema";
import { valideazaFacebook, valideazaLinkedin } from "@/lib/pagini-sociale";
import { stadiuD177Valid } from "@/lib/stadii-d177";

import type { ActionState, PersoanaDeAprobat } from "../actions";

type ExtraFirma = {
  negasit?: { la: string; de: string; deNume: string | null };
  linkedinAdaugat?: { la: string; de: string };
  facebookAdaugat?: { la: string; de: string };
  nuMaiCauta?: string[];
  deAprobat?: PersoanaDeAprobat[];
};

async function incarca(ctx: OrgContext, companyId: string) {
  const [r] = await ctx.db
    .select({ extra: companies.extra, linkedin: companies.linkedin, facebook: companies.facebook })
    .from(companies)
    .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)))
    .limit(1);
  return r ? { ...r, extra: (r.extra ?? {}) as ExtraFirma } : null;
}

// Salvează / șterge linkul de LinkedIn sau Facebook al FIRMEI. Când apare un link NOU (nu la ștergere, nu același link),
// se înregistrează cine și când l-a adăugat — alimentează indicatorul KPI „Firme cu LinkedIn / Facebook adăugat”.
export const seteazaPaginaSociala = withOrgSession(
  async (ctx, companyId: string, platforma: "linkedin" | "facebook", url: string | null): Promise<ActionState & { url?: string | null }> => {
    if (platforma !== "linkedin" && platforma !== "facebook") return { error: "Platformă necunoscută." };
    const firma = await incarca(ctx, companyId);
    if (!firma) return { error: "Firma nu a fost găsită." };
    const vechi = platforma === "linkedin" ? firma.linkedin : firma.facebook;

    let nou: string | null = null;
    if (url && url.trim()) {
      const r = platforma === "linkedin" ? valideazaLinkedin(url) : valideazaFacebook(url);
      if (!r.ok) return { error: r.eroare };
      nou = r.url;
    }
    if (nou === (vechi ?? null)) return { error: null, url: nou };

    const campuriLog = nou ? { [platforma === "linkedin" ? "linkedinAdaugat" : "facebookAdaugat"]: { la: new Date().toISOString(), de: ctx.userId } } : {};
    await ctx.db
      .update(companies)
      .set({
        [platforma]: nou,
        updatedBy: ctx.userId,
        ...(nou ? { extra: sql`coalesce(${companies.extra}, '{}'::jsonb) || ${JSON.stringify(campuriLog)}::text::jsonb` } : {}),
      })
      .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)));
    return { error: null, url: nou };
  },
);

// „Negăsit pe platforme” — se salvează cu data și cine a marcat.
export const comutaNegasit = withOrgSession(async (ctx, companyId: string, activ: boolean): Promise<ActionState> => {
  const firma = await incarca(ctx, companyId);
  if (!firma) return { error: "Firma nu a fost găsită." };
  const marcaj = { la: new Date().toISOString(), de: ctx.userId, deNume: ctx.userName ?? null };
  await ctx.db
    .update(companies)
    .set({
      updatedBy: ctx.userId,
      extra: activ
        ? sql`coalesce(${companies.extra}, '{}'::jsonb) || ${JSON.stringify({ negasit: marcaj })}::text::jsonb`
        : sql`coalesce(${companies.extra}, '{}'::jsonb) - 'negasit'`,
    })
    .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)));
  return { error: null };
});

async function scoateDinDeAprobat(ctx: OrgContext, companyId: string, ids: Set<string>, nuMaiCauta: string[] = []) {
  const firma = await incarca(ctx, companyId);
  if (!firma) return null;
  const ramase = (firma.extra.deAprobat ?? []).filter((p) => !ids.has(p.id));
  const hashuri = [...new Set([...(firma.extra.nuMaiCauta ?? []), ...nuMaiCauta])];
  await ctx.db
    .update(companies)
    .set({
      updatedBy: ctx.userId,
      extra: sql`coalesce(${companies.extra}, '{}'::jsonb) || ${JSON.stringify({ deAprobat: ramase, nuMaiCauta: hashuri })}::text::jsonb`,
    })
    .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)));
  return firma.extra.deAprobat ?? [];
}

// Aprobare = persoana intră în contactele firmei (cu consimțământ „necunoscut”) și dispare din lista „De aprobat”.
export const aprobaPersoane = withOrgSession(async (ctx, companyId: string, ids: string[]): Promise<ActionState & { aprobate?: number }> => {
  const firma = await incarca(ctx, companyId);
  if (!firma) return { error: "Firma nu a fost găsită." };
  const set = new Set(ids);
  const deAdaugat = (firma.extra.deAprobat ?? []).filter((p) => set.has(p.id));
  if (deAdaugat.length === 0) return { error: null, aprobate: 0 };

  await ctx.db.insert(contacts).values(
    deAdaugat.map((p) => ({
      id: randomUUID(),
      orgId: ctx.orgId,
      companyId,
      nume: p.nume,
      rol: p.functie,
      dept: p.departament,
      email: p.email,
      telefon: p.telefon,
      linkedin: p.linkedin,
      createdBy: ctx.userId,
    })),
  );
  await scoateDinDeAprobat(ctx, companyId, set);
  return { error: null, aprobate: deAdaugat.length };
});

// Respingere = datele persoanei se șterg efectiv; rămâne doar amprenta (hash) în lista „nu mai căuta”.
export const respingePersoane = withOrgSession(async (ctx, companyId: string, ids: string[]): Promise<ActionState & { respinse?: number }> => {
  const firma = await incarca(ctx, companyId);
  if (!firma) return { error: "Firma nu a fost găsită." };
  const set = new Set(ids);
  const deRespins = (firma.extra.deAprobat ?? []).filter((p) => set.has(p.id));
  if (deRespins.length === 0) return { error: null, respinse: 0 };
  const amprente = deRespins.flatMap((p) => amprentePersoana(ctx.orgId, companyId, p.nume, p.linkedin));
  await scoateDinDeAprobat(ctx, companyId, set, amprente);
  return { error: null, respinse: deRespins.length };
});

// Acordul unei persoane de contact (da / nu / necunoscut). Un contact cu acord „nu” e ignorat de „Pasul următor” și nu mai e contactat sau îmbogățit automat.
export const seteazaConsimtamantContact = withOrgSession(
  async (ctx, contactId: string, status: "da" | "nu" | "necunoscut"): Promise<ActionState> => {
    if (status !== "da" && status !== "nu" && status !== "necunoscut") return { error: "Stare necunoscută." };
    const r = await ctx.db
      .update(contacts)
      .set({
        consentStatus: status,
        consentAt: status === "necunoscut" ? null : new Date(),
        consentBy: status === "necunoscut" ? null : ctx.userId,
        consentSource: null,
      })
      .where(and(eq(contacts.id, contactId), eq(contacts.orgId, ctx.orgId)))
      .returning({ id: contacts.id });
    return r[0] ? { error: null } : { error: "Contactul nu a fost găsit." };
  },
);
// Punct unic prin care persoanele GĂSITE (de un import / o integrare) ajung în lista „De aprobat” a firmei — niciodată direct în
// contacte. Cine e pe lista „nu mai căuta” (amprentă a numelui sau a profilului) nu mai e adus înapoi.
export const propunePersoane = withOrgSession(
  async (ctx, companyId: string, persoane: Omit<PersoanaDeAprobat, "id" | "adaugatLa">[]): Promise<ActionState & { adaugate?: number; excluse?: number }> => {
    const firma = await incarca(ctx, companyId);
    if (!firma) return { error: "Firma nu a fost găsită." };
    const excluse = new Set(firma.extra.nuMaiCauta ?? []);
    const curente = firma.extra.deAprobat ?? [];
    const noi: PersoanaDeAprobat[] = [];
    let nrExcluse = 0;
    for (const p of persoane.slice(0, 100)) {
      if (!p.nume?.trim()) continue;
      if (amprentePersoana(ctx.orgId, companyId, p.nume, p.linkedin).some((h) => excluse.has(h))) {
        nrExcluse++;
        continue;
      }
      noi.push({ ...p, nume: p.nume.trim(), id: randomUUID(), adaugatLa: new Date().toISOString() });
    }
    if (noi.length) {
      await ctx.db
        .update(companies)
        .set({ extra: sql`coalesce(${companies.extra}, '{}'::jsonb) || ${JSON.stringify({ deAprobat: [...curente, ...noi] })}::text::jsonb` })
        .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)));
    }
    return { error: null, adaugate: noi.length, excluse: nrExcluse };
  },
);
// Stadiul contractului D177 (vezi lib/stadii-d177.ts). Al doilea clic pe stadiul curent îl resetează la „nou”.
export const seteazaStadiuD177 = withOrgSession(async (ctx, companyId: string, stadiu: string): Promise<ActionState> => {
  if (!stadiuD177Valid(stadiu)) return { error: "Stadiu necunoscut." };
  const r = await ctx.db
    .update(companies)
    .set({
      updatedBy: ctx.userId,
      extra: sql`coalesce(${companies.extra}, '{}'::jsonb) || ${JSON.stringify({ d177Stadiu: stadiu })}::text::jsonb`,
    })
    .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)))
    .returning({ id: companies.id });
  return r[0] ? { error: null } : { error: "Firma nu a fost găsită." };
});