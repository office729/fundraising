"use server";

import { and, eq, sql } from "drizzle-orm";

import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { donatoriReali, formular230Beneficiari, formular230CampaniiEmail } from "@/lib/db/schema";
import { emailConfigurat, trimiteEmailuriInLot } from "@/lib/email";
import { SLUG_PRINCIPAL } from "@/lib/formular230-constants";
import { htmlEmailF230, subiectEmailF230 } from "@/lib/formular230-email-template";

export type CampanieState = { error: string | null; ok: boolean; nrDestinatari?: number };

// Trimite campania de reamintire (link de Formular 230) tuturor donatorilor
// reali ai organizației cu email valid — folosește contul „principal”.
// Blocată dacă s-a mai trimis deja pentru anul curent (unique(org_id, an) pe
// formular230_campanii_email) — atât pornirea manuală, cât și cron-ul zilnic
// respectă aceeași regulă, ca donatorii să nu primească două remindere.
export const trimiteCampanieEmailF230 = withOrgAdmin(async (ctx): Promise<CampanieState> => {
  if (!emailConfigurat()) {
    return { error: "Trimiterea de email nu e configurată încă (lipsește cheia RESEND_API_KEY).", ok: false };
  }

  const an = new Date().getFullYear();
  const [campanieExistenta] = await ctx.db
    .select({ id: formular230CampaniiEmail.id })
    .from(formular230CampaniiEmail)
    .where(and(eq(formular230CampaniiEmail.orgId, ctx.orgId), eq(formular230CampaniiEmail.an, an)))
    .limit(1);
  if (campanieExistenta) {
    return { error: `Campania pentru ${an} a fost deja trimisă — o singură dată pe an.`, ok: false };
  }

  const [beneficiar] = await ctx.db
    .select({ shortCode: formular230Beneficiari.shortCode })
    .from(formular230Beneficiari)
    .where(and(eq(formular230Beneficiari.orgId, ctx.orgId), eq(formular230Beneficiari.slug, SLUG_PRINCIPAL)))
    .limit(1);
  if (!beneficiar?.shortCode) {
    return { error: "Contul principal de Formular 230 nu are un link generat.", ok: false };
  }

  const donatori = await ctx.db
    .select({ email: donatoriReali.email, nume: donatoriReali.nume })
    .from(donatoriReali)
    .where(eq(donatoriReali.orgId, ctx.orgId));
  if (!donatori.length) {
    return { error: "Nu există încă donatori reali către care să trimitem.", ok: false };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fundraising-academy-one.vercel.app";
  const link = `${baseUrl}/s/${beneficiar.shortCode}`;

  const { trimise } = await trimiteEmailuriInLot({
    destinatari: donatori,
    subiect: () => subiectEmailF230(ctx.orgName),
    html: (d) => htmlEmailF230(ctx.orgName, d.nume, link),
  });

  await ctx.db.insert(formular230CampaniiEmail).values({
    orgId: ctx.orgId,
    an,
    nrDestinatari: trimise,
    trimisDe: ctx.userId,
  });

  return { error: null, ok: true, nrDestinatari: trimise };
});

// Citire, nu trimitere — orice membru al organizației poate vedea când s-a
// trimis ultima campanie (nu doar admin/owner, care sunt singurii ce pot porni una nouă).
export const getUltimaCampanieEmail = withOrgSession(async (ctx) => {
  const [rand] = await ctx.db
    .select({
      an: formular230CampaniiEmail.an,
      nrDestinatari: formular230CampaniiEmail.nrDestinatari,
      createdAt: formular230CampaniiEmail.createdAt,
    })
    .from(formular230CampaniiEmail)
    .where(eq(formular230CampaniiEmail.orgId, ctx.orgId))
    .orderBy(sql`${formular230CampaniiEmail.an} desc`)
    .limit(1);
  return rand ?? null;
});
