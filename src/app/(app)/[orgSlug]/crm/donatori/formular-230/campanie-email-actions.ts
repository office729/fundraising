"use server";

import { eq, sql } from "drizzle-orm";

import { withOrgFaze, withOrgSession } from "@/lib/auth/guard";
import { formular230CampaniiEmail } from "@/lib/db/schema";
import { emailConfigurat } from "@/lib/email";
import { trimiteCampanieF230 } from "@/lib/formular230-campanie";
import { DONATORI_UI5_DICT } from "@/lib/i18n/dictionaries/donatori-ui-5";
import { getLocale } from "@/lib/i18n/get-locale";

export type CampanieState = { error: string | null; ok: boolean; nrDestinatari?: number };

// Cât poate rula o trimitere pornită din buton (acțiune de server, durată
// limitată) — ce nu apucă se continuă la următorul click sau de cron.
const DEADLINE_MANUAL_MS = 40_000;

// Trimite campania de reamintire (link de Formular 230) donatorilor reali ai
// organizației cu email valid — folosește contul „principal”. O singură dată pe
// an (unique(org_id, an)), rezumabilă: o trimitere întreruptă continuă doar cu
// cei rămași, iar un dublu-click nu trimite de două ori (vezi
// lib/formular230-campanie.ts — aceeași logică ca cron-ul zilnic).
export const trimiteCampanieEmailF230 = withOrgFaze<
  [],
  { org: { id: string; name: string; slug: string }; userId: string },
  CampanieState,
  CampanieState
>({
  admin: true,
  // Faza 1: doar verificarea accesului (tranzacție scurtă). Trimiterea (până la 40 s) rulează FĂRĂ conexiune DB deschisă —
  // înainte, ctx.db rămânea blocat în tranzacție cât timp helperul folosea alte conexiuni.
  pregateste: async (ctx) => {
    if (!emailConfigurat()) {
      return { gata: { error: DONATORI_UI5_DICT[await getLocale()].erori.emailNeconfigurat, ok: false } };
    }
    return { pregatit: { org: { id: ctx.orgId, name: ctx.orgName, slug: ctx.orgSlug }, userId: ctx.userId } };
  },
  extern: async ({ org, userId }): Promise<CampanieState> => {
    const er = DONATORI_UI5_DICT[await getLocale()].erori;
    const an = new Date().getFullYear();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://alexandrit.ro";
    const r = await trimiteCampanieF230({ org, an, baseUrl, trimisDe: userId, deadline: Date.now() + DEADLINE_MANUAL_MS });

    switch (r.stare) {
      case "deja_trimisa":
        return { error: er.dejaTrimisa(an), ok: false };
      case "fara_link":
        return { error: er.faraLink, ok: false };
      case "fara_destinatari":
        return { error: er.faraDestinatari, ok: false };
      case "in_curs_altundeva":
        return { error: er.inCurs, ok: false };
      case "esuata":
        return { error: er.esuata, ok: false };
      case "partiala":
        return {
          error: er.partiala(r.trimise, r.ramase),
          ok: false,
          nrDestinatari: r.trimise,
        };
      case "trimisa":
        return { error: null, ok: true, nrDestinatari: r.total };
    }
  },
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
