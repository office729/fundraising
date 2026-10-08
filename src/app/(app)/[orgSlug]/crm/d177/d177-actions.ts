"use server";

import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import { type OrgContext, withOrgSession } from "@/lib/auth/guard";
import { appUsers, companies, companySponsorizari } from "@/lib/db/schema";
import { etichetaStadiuD177 } from "@/lib/stadii-d177";

// Firmele marcate „D177” în CRM Companii (bifa din fișa firmei / din listă) apar AUTOMAT aici — pagina citește marcajul, nu
// are o listă proprie. Datele specifice D177 (sumă redirecționată, an fiscal, depunere, bani intrați de la ANAF) se păstrează
// în companies.extra.d177Date, fără migrare.
export type DateD177 = {
  suma: number | null; // suma pe care firma o redirecționează (lei)
  an: number | null; // anul fiscal al declarației
  depusLa: string | null; // „YYYY-MM-DD” — data depunerii D177 de către firmă
  incasat: boolean; // au intrat banii de la ANAF
  incasatSuma: number | null;
  incasatLa: string | null;
  sponsorizareId: string | null; // sponsorizarea creată automat la bifarea „au intrat banii”
};

export type RandD177 = {
  id: string;
  nume: string;
  judet: string | null;
  cui: string | null;
  responsabil: string | null;
  stadiu: string;
  stadiuEticheta: string;
  impozit: number | null; // impozit pe profit (din fișa firmei), pentru plafonul de 20%
  date: DateD177;
};

const GOL: DateD177 = { suma: null, an: null, depusLa: null, incasat: false, incasatSuma: null, incasatLa: null, sponsorizareId: null };

export const listeazaFirmeD177 = withOrgSession(async (ctx): Promise<RandD177[]> => {
  const rows = await ctx.db
    .select({
      id: companies.id,
      nume: companies.nume,
      judet: companies.judet,
      cui: companies.cui,
      impozit: companies.impozit,
      incasatBifa: companies.d177Incasat,
      extra: companies.extra,
      responsabil: appUsers.name,
    })
    .from(companies)
    .leftJoin(appUsers, eq(appUsers.id, companies.ownerId))
    .where(and(eq(companies.orgId, ctx.orgId), eq(companies.d177, true), sql`${companies.deletedAt} is null`))
    .orderBy(companies.nume)
    .limit(2000);

  return rows.map((r) => {
    const extra = (r.extra ?? {}) as { d177Stadiu?: string; d177Date?: Partial<DateD177> };
    const stadiu = extra.d177Stadiu ?? "nou";
    return {
      id: r.id,
      nume: r.nume,
      judet: r.judet,
      cui: r.cui,
      responsabil: r.responsabil,
      stadiu,
      stadiuEticheta: etichetaStadiuD177(stadiu),
      impozit: r.impozit,
      // Bifa „bani încasați” din lista Companii (coloana d177_incasat) rămâne sursa de adevăr pentru starea „intrat”.
      date: { ...GOL, ...extra.d177Date, incasat: r.incasatBifa },
    };
  });
});

export type DateD177Input = {
  suma: number | null;
  an: number | null;
  depusLa: string | null;
  incasat: boolean;
  incasatSuma: number | null;
  incasatLa: string | null;
};

async function recalculeaza(db: OrgContext["db"], companyId: string) {
  const [{ suma }] = await db
    .select({ suma: sql<number>`coalesce(sum(${companySponsorizari.suma}), 0)::int` })
    .from(companySponsorizari)
    .where(eq(companySponsorizari.companyId, companyId));
  await db.update(companies).set({ sumaSponsorizata: suma }).where(eq(companies.id, companyId));
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;

// Salvează datele D177 ale unei firme. La bifarea „au intrat banii de la ANAF” cu o sumă, suma se înregistrează automat ca
// sponsorizare („D177 — ANAF”) — apare în tabul Sponsorizări și în totaluri; la debifare, sponsorizarea creată automat se șterge.
export const salveazaDateD177 = withOrgSession(async (ctx, companyId: string, input: DateD177Input): Promise<{ error: string | null }> => {
  const intreg = (v: number | null, nume: string, min = 0) => {
    if (v === null) return null;
    if (!Number.isFinite(v) || v < min) throw new Error(`${nume} nu e valid(ă).`);
    return Math.round(v);
  };
  let suma: number | null;
  let an: number | null;
  let incasatSuma: number | null;
  try {
    suma = intreg(input.suma, "Suma D177");
    an = intreg(input.an, "Anul fiscal", 2000);
    incasatSuma = intreg(input.incasatSuma, "Suma intrată");
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (input.depusLa && !DATA.test(input.depusLa)) return { error: "Data depunerii nu e validă." };
  if (input.incasatLa && !DATA.test(input.incasatLa)) return { error: "Data intrării banilor nu e validă." };
  if (input.incasat && (incasatSuma === null || incasatSuma <= 0)) return { error: "Pentru „au intrat banii” completează suma intrată de la ANAF." };

  const [firma] = await ctx.db.select({ extra: companies.extra }).from(companies).where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId), eq(companies.d177, true))).limit(1);
  if (!firma) return { error: "Firma nu e marcată D177 sau nu a fost găsită." };
  const veche = ((firma.extra ?? {}) as { d177Date?: Partial<DateD177> }).d177Date ?? {};

  let sponsorizareId = veche.sponsorizareId ?? null;
  const azi = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
  if (input.incasat && incasatSuma) {
    const data = input.incasatLa || azi;
    if (sponsorizareId) {
      await ctx.db
        .update(companySponsorizari)
        .set({ suma: incasatSuma, data })
        .where(and(eq(companySponsorizari.id, sponsorizareId), eq(companySponsorizari.orgId, ctx.orgId)));
    } else {
      sponsorizareId = randomUUID();
      await ctx.db.insert(companySponsorizari).values({ id: sponsorizareId, orgId: ctx.orgId, companyId, suma: incasatSuma, data, proiect: "D177 — ANAF", createdBy: ctx.userId });
    }
    await recalculeaza(ctx.db, companyId);
  } else if (!input.incasat && sponsorizareId) {
    await ctx.db.delete(companySponsorizari).where(and(eq(companySponsorizari.id, sponsorizareId), eq(companySponsorizari.orgId, ctx.orgId)));
    sponsorizareId = null;
    await recalculeaza(ctx.db, companyId);
  }

  const date: Omit<DateD177, "incasat"> = { suma, an, depusLa: input.depusLa || null, incasatSuma: input.incasat ? incasatSuma : null, incasatLa: input.incasat ? input.incasatLa || azi : null, sponsorizareId };
  await ctx.db
    .update(companies)
    .set({
      d177Incasat: input.incasat,
      updatedBy: ctx.userId,
      extra: sql`coalesce(${companies.extra}, '{}'::jsonb) || ${JSON.stringify({ d177Date: date })}::text::jsonb`,
    })
    .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)));
  return { error: null };
});