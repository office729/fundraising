"use server";

import { and, desc, eq, gte } from "drizzle-orm";
import { after } from "next/server";

import { withOrgSession } from "@/lib/auth/guard";
import { isPlatformAdmin } from "@/lib/billing/trial";
import { feedbackPlatforma } from "@/lib/db/schema";
import { notificaChestionarCuProblema, notificaSugestieNoua } from "@/lib/feedback/notificare";
import { chestionarulCerePrompt } from "@/lib/feedback/notificare-continut";
import {
  CATEGORII_SUGESTIE,
  MAX_SUGESTII_PE_ZI,
  ZILE_INTRE_CHESTIONARE,
  trebuieInvitat,
  valideazaChestionar,
  valideazaSugestie,
  zileRamaseChestionar,
  type ChestionarInput,
  type SugestieInput,
} from "@/lib/feedback/calcule";

// Feedback de la utilizatorii platformei. Orice membru al organizației poate trimite chestionarul (cel mult unul pe lună, per utilizator)
// și sugestii; vede sugestiile organizației sale și răspunsul echipei Alexandrit. Citirea peste toate organizațiile e în /platform-admin/feedback.

export type SugestieRand = {
  id: string;
  categorie: string;
  titlu: string;
  mesaj: string;
  stare: string;
  raspuns: string | null;
  raspunsLa: string | null;
  createdAt: string;
  alMeu: boolean;
};

export type DateFeedback = {
  sugestii: SugestieRand[];
  ultimulChestionarLa: string | null;
  zileRamaseChestionar: number;
};

export type Rezultat = { ok: true } | { ok: false; eroare: string };

const MS_ZI = 86_400_000;

export const obtineDateFeedback = withOrgSession(async (ctx): Promise<DateFeedback> => {
  const sugestii = await ctx.db
    .select()
    .from(feedbackPlatforma)
    .where(and(eq(feedbackPlatforma.orgId, ctx.orgId), eq(feedbackPlatforma.tip, "sugestie")))
    .orderBy(desc(feedbackPlatforma.createdAt))
    .limit(100);
  const [ultimul] = await ctx.db
    .select({ la: feedbackPlatforma.createdAt })
    .from(feedbackPlatforma)
    .where(and(eq(feedbackPlatforma.orgId, ctx.orgId), eq(feedbackPlatforma.userId, ctx.userId), eq(feedbackPlatforma.tip, "chestionar")))
    .orderBy(desc(feedbackPlatforma.createdAt))
    .limit(1);
  return {
    sugestii: sugestii.map((s) => ({
      id: s.id,
      categorie: s.categorie ?? "altceva",
      titlu: s.titlu ?? "",
      mesaj: s.mesaj ?? "",
      stare: s.stare,
      raspuns: s.raspuns,
      raspunsLa: s.raspunsLa ? s.raspunsLa.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      alMeu: s.userId === ctx.userId,
    })),
    ultimulChestionarLa: ultimul ? ultimul.la.toISOString() : null,
    zileRamaseChestionar: zileRamaseChestionar(ultimul?.la ?? null, new Date()),
  };
});

export const trimiteChestionarAction = withOrgSession(async (ctx, input: ChestionarInput): Promise<Rezultat> => {
  const r = valideazaChestionar(input);
  if (!r.ok) return { ok: false, eroare: r.eroare };
  const [ultimul] = await ctx.db
    .select({ la: feedbackPlatforma.createdAt })
    .from(feedbackPlatforma)
    .where(and(eq(feedbackPlatforma.orgId, ctx.orgId), eq(feedbackPlatforma.userId, ctx.userId), eq(feedbackPlatforma.tip, "chestionar")))
    .orderBy(desc(feedbackPlatforma.createdAt))
    .limit(1);
  if (zileRamaseChestionar(ultimul?.la ?? null, new Date()) > 0) {
    return { ok: false, eroare: `Ai trimis deja chestionarul în ultimele ${ZILE_INTRE_CHESTIONARE} de zile. Mulțumim! Poți trimite oricând o sugestie.` };
  }
  const v = r.v;
  await ctx.db.insert(feedbackPlatforma).values({
    orgId: ctx.orgId,
    userId: ctx.userId,
    tip: "chestionar",
    nps: v.nps,
    satisfactie: v.satisfactie,
    note: v.note,
    module: v.module,
    cePlace: v.cePlace,
    ceLipseste: v.ceLipseste,
    poateContacta: v.poateContacta,
  });
  // Echipa află pe e-mail doar de chestionarele cu scor scăzut; trimiterea pleacă după ce răspunsul s-a întors și tranzacția s-a încheiat.
  if (chestionarulCerePrompt(v.nps, v.satisfactie)) {
    const c = { orgNume: ctx.orgName, nps: v.nps, satisfactie: v.satisfactie, cePlace: v.cePlace, ceLipseste: v.ceLipseste, contact: v.poateContacta ? ctx.userEmail : null };
    after(() => notificaChestionarCuProblema(c));
  }
  return { ok: true };
});

export const trimiteSugestieAction = withOrgSession(async (ctx, input: SugestieInput): Promise<Rezultat> => {
  const r = valideazaSugestie(input);
  if (!r.ok) return { ok: false, eroare: r.eroare };
  // Plafon pe organizație: apără de trimiteri în serie (greșeală sau abuz), fără să încurce pe cine are mai multe idei.
  const dinUltimaZi = await ctx.db
    .select({ id: feedbackPlatforma.id })
    .from(feedbackPlatforma)
    .where(and(eq(feedbackPlatforma.orgId, ctx.orgId), eq(feedbackPlatforma.tip, "sugestie"), gte(feedbackPlatforma.createdAt, new Date(Date.now() - MS_ZI))))
    .limit(MAX_SUGESTII_PE_ZI);
  if (dinUltimaZi.length >= MAX_SUGESTII_PE_ZI) {
    return { ok: false, eroare: `Ați trimis deja ${MAX_SUGESTII_PE_ZI} sugestii azi. Le citim pe toate; revino mâine cu următoarele.` };
  }
  const v = r.v;
  await ctx.db.insert(feedbackPlatforma).values({
    orgId: ctx.orgId,
    userId: ctx.userId,
    tip: "sugestie",
    categorie: v.categorie,
    titlu: v.titlu,
    mesaj: v.mesaj,
    poateContacta: v.poateContacta,
  });
  const s = {
    orgNume: ctx.orgName,
    categorie: CATEGORII_SUGESTIE.find((c) => c.cheie === v.categorie)?.eticheta ?? v.categorie,
    titlu: v.titlu,
    mesaj: v.mesaj,
    contact: v.poateContacta ? ctx.userEmail : null,
  };
  after(() => notificaSugestieNoua(s));
  return { ok: true };
});

// Invitația discretă din CRM: întreabă o singură dată pe sesiune dacă are sens să apară (vezi feedback-invitatie.tsx).
export const cereInvitatieChestionarAction = withOrgSession(async (ctx): Promise<boolean> => {
  if (isPlatformAdmin(ctx.userEmail)) return false;
  const [ultimul] = await ctx.db
    .select({ la: feedbackPlatforma.createdAt })
    .from(feedbackPlatforma)
    .where(and(eq(feedbackPlatforma.orgId, ctx.orgId), eq(feedbackPlatforma.userId, ctx.userId), eq(feedbackPlatforma.tip, "chestionar")))
    .orderBy(desc(feedbackPlatforma.createdAt))
    .limit(1);
  const acum = new Date();
  const zileDeLaInscriere = Math.floor((acum.getTime() - ctx.orgCreatedAt.getTime()) / MS_ZI);
  return trebuieInvitat(zileDeLaInscriere, ultimul?.la ?? null, acum);
});
