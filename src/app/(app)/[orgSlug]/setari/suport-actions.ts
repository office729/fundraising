"use server";

import { and, desc, eq, like, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { inregistreazaAudit } from "@/lib/audit";
import { withOrgAdmin } from "@/lib/auth/guard";
import { getTr } from "@/lib/i18n/tr-server";
import { appUsers, fundraisingAuditLog, suportAcces } from "@/lib/db/schema";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { esteDurataSuportValida } from "@/lib/suport/date-personale";

// Accesul de suport: owner/admin acordă echipei platformei, pentru 1, 3 sau 7 zile, acces la „Diagnoza contului”
// (configurare, module, numărători, erori fără date personale — niciodată conținutul CRM). Expiră singur, se poate retrage oricând,
// iar fiecare deschidere a diagnozei se scrie în jurnalul organizației (afișat mai jos în secțiune).

export type StareSuport = {
  activ: { acordatLa: string; expiraLa: string } | null;
  jurnal: { actiune: string; la: string; de: string | null }[];
};

const citeste = withOrgAdmin(
  async (ctx): Promise<StareSuport> => {
    const [activ] = await ctx.db
      .select({ acordatLa: suportAcces.acordatLa, expiraLa: suportAcces.expiraLa })
      .from(suportAcces)
      .where(and(eq(suportAcces.orgId, ctx.orgId), sql`${suportAcces.retrasLa} is null`, sql`${suportAcces.expiraLa} > now()`))
      .orderBy(desc(suportAcces.expiraLa))
      .limit(1);
    const jurnal = await ctx.db
      .select({ actiune: fundraisingAuditLog.actiune, la: fundraisingAuditLog.createdAt, detalii: fundraisingAuditLog.detalii, actor: appUsers.email })
      .from(fundraisingAuditLog)
      .leftJoin(appUsers, eq(appUsers.id, fundraisingAuditLog.actorAppUserId))
      .where(and(eq(fundraisingAuditLog.orgId, ctx.orgId), like(fundraisingAuditLog.actiune, "suport\\_%")))
      .orderBy(desc(fundraisingAuditLog.createdAt))
      .limit(15);
    return {
      activ: activ ? { acordatLa: activ.acordatLa.toISOString(), expiraLa: activ.expiraLa.toISOString() } : null,
      jurnal: jurnal.map((j) => ({
        actiune: j.actiune,
        la: j.la.toISOString(),
        // Cine a făcut-o: pentru deschiderile de diagnoză, adresa echipei platformei; pentru acordare/retragere, utilizatorul organizației.
        de: (j.detalii && typeof j.detalii === "object" && "de" in j.detalii ? String((j.detalii as { de: unknown }).de) : j.actor) ?? null,
      })),
    };
  },
  { permiteAccesBlocat: true },
);

const acorda = withOrgAdmin(
  async (ctx, zile: number): Promise<void> => {
    if (!esteDurataSuportValida(zile)) throw new EroareUtilizator((await getTr())("Alege 1, 3 sau 7 zile.", "Choose 1, 3 or 7 days."));
    const acum = new Date();
    // Un singur acces activ la un moment dat: cel anterior se retrage și se înlocuiește.
    await ctx.db
      .update(suportAcces)
      .set({ retrasLa: acum, retrasDe: ctx.userId })
      .where(and(eq(suportAcces.orgId, ctx.orgId), sql`${suportAcces.retrasLa} is null`, sql`${suportAcces.expiraLa} > now()`));
    const expiraLa = new Date(acum.getTime() + zile * 86_400_000);
    await ctx.db.insert(suportAcces).values({ orgId: ctx.orgId, acordatDe: ctx.userId, acordatLa: acum, expiraLa });
    await inregistreazaAudit(ctx.db, {
      orgId: ctx.orgId,
      actorAppUserId: ctx.userId,
      actiune: "suport_acces_acordat",
      entitate: "organizatie",
      entitateId: ctx.orgId,
      detalii: { zile, expiraLa: expiraLa.toISOString() },
    });
  },
  { permiteAccesBlocat: true },
);

const retrage = withOrgAdmin(
  async (ctx): Promise<void> => {
    const retrase = await ctx.db
      .update(suportAcces)
      .set({ retrasLa: new Date(), retrasDe: ctx.userId })
      .where(and(eq(suportAcces.orgId, ctx.orgId), sql`${suportAcces.retrasLa} is null`, sql`${suportAcces.expiraLa} > now()`))
      .returning({ id: suportAcces.id });
    if (retrase.length === 0) return;
    await inregistreazaAudit(ctx.db, {
      orgId: ctx.orgId,
      actorAppUserId: ctx.userId,
      actiune: "suport_acces_retras",
      entitate: "organizatie",
      entitateId: ctx.orgId,
    });
  },
  { permiteAccesBlocat: true },
);

export async function obtineStareSuport(orgSlug: string): Promise<StareSuport> {
  try {
    return await citeste(orgSlug);
  } catch {
    // Secțiunea nu are voie să strice pagina de setări (ex. tabelul nu există încă, rol fără drepturi).
    return { activ: null, jurnal: [] };
  }
}

export async function acordaSuportAction(orgSlug: string, zile: number): Promise<{ error: string | null }> {
  try {
    await acorda(orgSlug, zile);
    revalidatePath(`/${orgSlug}/crm/setari`);
    return { error: null };
  } catch (e) {
    return { error: mesajSigur(e, (await getTr())("Nu am putut acorda accesul. Încearcă din nou.", "We could not grant the access. Please try again."), "suport-acces-acordare") };
  }
}

export async function retrageSuportAction(orgSlug: string): Promise<{ error: string | null }> {
  try {
    await retrage(orgSlug);
    revalidatePath(`/${orgSlug}/crm/setari`);
    return { error: null };
  } catch (e) {
    return { error: mesajSigur(e, (await getTr())("Nu am putut retrage accesul. Încearcă din nou.", "We could not withdraw the access. Please try again."), "suport-acces-retragere") };
  }
}
