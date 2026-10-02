"use server";

import { eq, sql } from "drizzle-orm";

import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { formular230CampaniiEmail } from "@/lib/db/schema";
import { emailConfigurat } from "@/lib/email";
import { trimiteCampanieF230 } from "@/lib/formular230-campanie";

export type CampanieState = { error: string | null; ok: boolean; nrDestinatari?: number };

// Cât poate rula o trimitere pornită din buton (acțiune de server, durată
// limitată) — ce nu apucă se continuă la următorul click sau de cron.
const DEADLINE_MANUAL_MS = 40_000;

// Trimite campania de reamintire (link de Formular 230) donatorilor reali ai
// organizației cu email valid — folosește contul „principal”. O singură dată pe
// an (unique(org_id, an)), rezumabilă: o trimitere întreruptă continuă doar cu
// cei rămași, iar un dublu-click nu trimite de două ori (vezi
// lib/formular230-campanie.ts — aceeași logică ca cron-ul zilnic).
export const trimiteCampanieEmailF230 = withOrgAdmin(async (ctx): Promise<CampanieState> => {
  if (!emailConfigurat()) {
    return { error: "Trimiterea de email nu e configurată încă (lipsesc variabilele SMTP din mediu).", ok: false };
  }

  const an = new Date().getFullYear();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fundraising-academy-one.vercel.app";
  const r = await trimiteCampanieF230({
    org: { id: ctx.orgId, name: ctx.orgName, slug: ctx.orgSlug },
    an,
    baseUrl,
    trimisDe: ctx.userId,
    deadline: Date.now() + DEADLINE_MANUAL_MS,
  });

  switch (r.stare) {
    case "deja_trimisa":
      return { error: `Campania pentru ${an} a fost deja trimisă — o singură dată pe an.`, ok: false };
    case "fara_link":
      return { error: "Contul principal de Formular 230 nu are un link generat.", ok: false };
    case "fara_destinatari":
      return { error: "Nu există încă donatori reali către care să trimitem.", ok: false };
    case "in_curs_altundeva":
      return { error: "O trimitere este deja în curs pentru această organizație — așteaptă câteva minute.", ok: false };
    case "esuata":
      return { error: "Serverul de email nu a răspuns — nu s-a trimis nimic. Încearcă din nou mai târziu.", ok: false };
    case "partiala":
      return {
        error: `Trimiterea e în desfășurare: ${r.trimise} emailuri trimise acum, au mai rămas ${r.ramase}. Apasă din nou ca să continui.`,
        ok: false,
        nrDestinatari: r.trimise,
      };
    case "trimisa":
      return { error: null, ok: true, nrDestinatari: r.total };
  }
});

// Citire, nu trimitere — orice membru al organizației poate vedea când s-a
// trimis ultima campanie (nu doar admin/owner, care sunt singurii ce pot porni una nouă).
export const getUltimaCampanieEmail = withOrgSession(async (ctx) => {
  const [rand] = await ctx.db
    .select({
      an: formular230CampaniiEmail.an,
      nrDestinatari: formular230CampaniiEmail.nrDestinatari,
      createdAt: formular230CampaniiEmail.createdAt,
      status: formular230CampaniiEmail.status,
    })
    .from(formular230CampaniiEmail)
    .where(eq(formular230CampaniiEmail.orgId, ctx.orgId))
    .orderBy(sql`${formular230CampaniiEmail.an} desc`)
    .limit(1);
  return rand ?? null;
});
