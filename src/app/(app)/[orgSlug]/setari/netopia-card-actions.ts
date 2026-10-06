"use server";

import { eq } from "drizzle-orm";

import { withOrgAdmin } from "@/lib/auth/guard";
import { organizations } from "@/lib/db/schema";

export type StatusReinnoireAutomata = {
  // Există un token salvat — indiferent dacă reînnoirea e activă sau oprită.
  cardSalvat: boolean;
  cardMasked: string | null;
  expiraLuna: number | null;
  expiraAn: number | null;
  activa: boolean;
  incercariEsuate: number;
};

export const obtineStatusReinnoireAutomata = withOrgAdmin(async (ctx): Promise<StatusReinnoireAutomata> => {
  const rows = await ctx.db
    .select({
      token: organizations.netopiaCardTokenEnc,
      masked: organizations.netopiaCardMasked,
      luna: organizations.netopiaCardExpireMonth,
      an: organizations.netopiaCardExpireYear,
      activa: organizations.netopiaAutoRenew,
      incercari: organizations.netopiaRenewalAttempts,
    })
    .from(organizations)
    .where(eq(organizations.id, ctx.orgId))
    .limit(1);
  const r = rows[0];
  return {
    cardSalvat: Boolean(r?.token),
    cardMasked: r?.masked ?? null,
    expiraLuna: r?.luna ?? null,
    expiraAn: r?.an ?? null,
    activa: r?.activa ?? false,
    incercariEsuate: r?.incercari ?? 0,
  };
});

// Oprește taxarea lunară automată — PĂSTREAZĂ cardul salvat (organizația poate
// reactiva oricând, fără să treacă din nou printr-o plată). Cronul de reînnoire
// (api/cron/netopia-reinnoire) selectează doar organizațiile cu acest flag activ.
export const dezactiveazaReinnoireAutomataAction = withOrgAdmin(async (ctx): Promise<void> => {
  // opt-out explicit: o plată manuală ulterioară nu trebuie să repornească taxarea automată pe care clientul a oprit-o.
  await ctx.db.update(organizations).set({ netopiaAutoRenew: false, netopiaAutorenewOptOut: true }).where(eq(organizations.id, ctx.orgId));
});

// Reactivează taxarea automată — doar dacă mai există un token salvat (dacă a
// fost șters, ex. după prea multe eșecuri, singura cale înapoi e o plată nouă).
export const activeazaReinnoireAutomataAction = withOrgAdmin(async (ctx): Promise<{ ok: boolean }> => {
  const rows = await ctx.db
    .select({ token: organizations.netopiaCardTokenEnc })
    .from(organizations)
    .where(eq(organizations.id, ctx.orgId))
    .limit(1);
  if (!rows[0]?.token) return { ok: false };
  await ctx.db
    .update(organizations)
    .set({ netopiaAutoRenew: true, netopiaAutorenewOptOut: false, netopiaRenewalAttempts: 0, netopiaRenewalFailedAt: null })
    .where(eq(organizations.id, ctx.orgId));
  return { ok: true };
});

// Elimină definitiv cardul salvat — oprește și taxarea automată. Organizația
// va plăti manual (sau va salva alt card la următoarea plată reușită).
export const eliminaCardSalvatAction = withOrgAdmin(async (ctx): Promise<void> => {
  await ctx.db
    .update(organizations)
    .set({
      netopiaCardTokenEnc: null,
      netopiaCardMasked: null,
      netopiaCardExpireMonth: null,
      netopiaCardExpireYear: null,
      netopiaAutoRenew: false,
      netopiaRenewalAttempts: 0,
      netopiaRenewalFailedAt: null,
    })
    .where(eq(organizations.id, ctx.orgId));
});
