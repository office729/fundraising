import "server-only";

import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

import { areModul, MODULE_PACHET, type ModulPachet } from "@/lib/billing/packages";
import { pachetEfectiv } from "@/lib/billing/trial";
import { db } from "@/lib/db";
import {
  appUsers,
  canvaConnections,
  companies,
  companySponsorizari,
  contacts,
  donatiiImportate,
  donatoriReali,
  eroriAplicatie,
  formular230Submissions,
  fundraisingAuditLog,
  fundraisingDonations,
  fundraisingPages,
  granturi,
  memberships,
  organizations,
  reclameConexiuni,
  suportAcces,
  volunteerActivities,
} from "@/lib/db/schema";
import { mascheazaEmail } from "./date-personale";

// „Diagnoza contului” pentru echipa platformei: configurare, module, numărători și erori recente. NICIODATĂ conținut CRM
// (nume, e-mailuri, sume, notițe): numărătorile sunt agregate, iar e-mailurile membrilor apar mascate. Rulează numai
// cât timp organizația are un acces de suport activ; fiecare deschidere se scrie în jurnalul de audit al organizației.

export type DiagnozaRand = { eticheta: string; valoare: number };

export type Diagnoza =
  | { tip: "organizatie_inexistenta" }
  | { tip: "fara_acces"; orgNume: string }
  | {
      tip: "ok";
      orgNume: string;
      orgSlug: string;
      acces: { acordatLa: Date; expiraLa: Date };
      configurare: {
        pachetAles: string;
        pachetEfectiv: string;
        statusAbonament: string;
        accesPlatitPana: Date | null;
        creat: Date;
        dpaAcceptat: boolean;
        logo: boolean;
        sloganSetat: boolean;
        domeniuPropriu: string | null;
        domeniiWidget: number;
        stripeDonatii: boolean;
        cardSalvat: boolean;
        reinnoireAutomata: boolean;
        reinnoiriEsuate: number;
        utilizatoriExtra: number;
      };
      module: { cheie: string; nume: string; activ: boolean }[];
      numaratori: DiagnozaRand[];
      membri: { rol: string; email: string; ultimaAutentificare: Date | null }[];
      erori: { id: string; zona: string; cod: string | null; mesaj: string; la: Date }[];
      eroriPeZona: { zona: string; nr: number }[];
    };

type Tabel = { eticheta: string; tabel: PgTable; filtru?: SQL };

export async function citesteDiagnoza(orgSlug: string, actorEmail: string): Promise<Diagnoza> {
  return db.transaction(async (tx) => {
    // `app.platform_admin` deschide politicile pentru echipa platformei (acces de suport, erori); `app.public_lookup` lasă să găsim organizația după slug.
    await tx.execute(sql`select set_config('app.platform_admin', 'true', true)`);
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);

    const [org] = await tx.select().from(organizations).where(eq(organizations.slug, orgSlug)).limit(1);
    if (!org) return { tip: "organizatie_inexistenta" };

    const [acces] = await tx
      .select({ acordatLa: suportAcces.acordatLa, expiraLa: suportAcces.expiraLa })
      .from(suportAcces)
      .where(and(eq(suportAcces.orgId, org.id), sql`${suportAcces.retrasLa} is null`, sql`${suportAcces.expiraLa} > now()`))
      .orderBy(desc(suportAcces.expiraLa))
      .limit(1);
    if (!acces) return { tip: "fara_acces", orgNume: org.name };

    // De aici, contextul organizației: numărătorile pe tabelele de tenant trec prin politicile RLS ale organizației. Acces permis de verificarea de mai sus.
    await tx.execute(sql`select set_config('app.current_org_id', ${org.id}, true)`);

    const TABELE: Tabel[] = [
      { eticheta: "Companii", tabel: companies, filtru: sql`${companies.deletedAt} is null` },
      { eticheta: "Contacte ale companiilor", tabel: contacts },
      { eticheta: "Sponsorizări înregistrate", tabel: companySponsorizari },
      { eticheta: "Donatori (CRM persoane fizice)", tabel: donatoriReali },
      { eticheta: "Pagini de campanie", tabel: fundraisingPages },
      { eticheta: "Donații online", tabel: fundraisingDonations },
      { eticheta: "Donații importate", tabel: donatiiImportate },
      { eticheta: "Formulare 230 primite", tabel: formular230Submissions },
      { eticheta: "Granturi", tabel: granturi },
      { eticheta: "Activități de voluntariat", tabel: volunteerActivities },
      { eticheta: "Conexiuni de reclame", tabel: reclameConexiuni },
      { eticheta: "Conexiuni Canva", tabel: canvaConnections },
    ];
    const numaratori: DiagnozaRand[] = [];
    for (const t of TABELE) {
      // Doar o numărătoare agregată (nicio coloană din rânduri); tabelele și filtrele vin dintr-o listă fixă, nu din date externe.
      const rez = await tx.execute(sql`select count(*)::int as n from ${t.tabel}${t.filtru ? sql` where ${t.filtru}` : sql``}`);
      numaratori.push({ eticheta: t.eticheta, valoare: Number((rez as unknown as { n: number }[])[0]?.n ?? 0) });
    }

    const membriRows = await tx
      .select({ rol: memberships.role, email: appUsers.email, ultima: appUsers.lastLoginAt })
      .from(memberships)
      .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
      .where(eq(memberships.orgId, org.id));

    const erori = await tx.select().from(eroriAplicatie).where(eq(eroriAplicatie.orgId, org.id)).orderBy(desc(eroriAplicatie.createdAt)).limit(50);
    const eroriPeZona = await tx
      .select({ zona: eroriAplicatie.zona, nr: sql<number>`count(*)::int` })
      .from(eroriAplicatie)
      .where(and(eq(eroriAplicatie.orgId, org.id), sql`${eroriAplicatie.createdAt} > now() - interval '7 days'`))
      .groupBy(eroriAplicatie.zona)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Jurnalul de audit al organizației (îl citesc owner/admin): fiecare deschidere a diagnozei rămâne vizibilă pentru ONG.
    const [actor] = await tx.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.email, actorEmail)).limit(1);
    await tx.insert(fundraisingAuditLog).values({
      orgId: org.id,
      actorAppUserId: actor?.id ?? null,
      actiune: "suport_diagnoza_vizualizata",
      entitate: "organizatie",
      entitateId: org.id,
      detalii: { de: actorEmail },
    });

    const pachet = pachetEfectiv({ package: org.package, createdAt: org.createdAt, subscriptionStatus: org.subscriptionStatus, currentPeriodEnd: org.currentPeriodEnd });
    const domeniiWidget = ((org as { widgetDomenii?: string | null }).widgetDomenii ?? "").split(/[\s,;]+/).filter(Boolean).length;
    return {
      tip: "ok",
      orgNume: org.name,
      orgSlug: org.slug,
      acces,
      configurare: {
        pachetAles: org.package,
        pachetEfectiv: pachet,
        statusAbonament: org.subscriptionStatus,
        accesPlatitPana: org.currentPeriodEnd,
        creat: org.createdAt,
        dpaAcceptat: Boolean(org.dpaAcceptedAt),
        logo: Boolean(org.logoUrl),
        sloganSetat: Boolean(org.slogan),
        domeniuPropriu: org.customDomain,
        domeniiWidget,
        stripeDonatii: Boolean(org.donationStripeSecretEnc),
        cardSalvat: Boolean(org.netopiaCardTokenEnc),
        reinnoireAutomata: org.netopiaAutoRenew,
        reinnoiriEsuate: org.netopiaRenewalAttempts,
        utilizatoriExtra: org.extraUsers,
      },
      module: (Object.keys(MODULE_PACHET) as ModulPachet[]).map((cheie) => ({ cheie, nume: MODULE_PACHET[cheie].nume, activ: areModul(pachet, cheie) })),
      numaratori,
      membri: membriRows.map((m) => ({ rol: m.rol, email: mascheazaEmail(m.email), ultimaAutentificare: m.ultima })),
      erori: erori.map((e) => ({ id: e.id, zona: e.zona, cod: e.cod, mesaj: e.mesaj, la: e.createdAt })),
      eroriPeZona,
    };
  });
}

// Pentru lista de organizații din panoul platformei: ce organizații au acum un acces de suport activ (id → expiră la).
export async function accesuriSuportActive(): Promise<Map<string, Date>> {
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.platform_admin', 'true', true)`);
      const rows = await tx
        .select({ orgId: suportAcces.orgId, expiraLa: sql<Date>`max(${suportAcces.expiraLa})` })
        .from(suportAcces)
        .where(and(sql`${suportAcces.retrasLa} is null`, sql`${suportAcces.expiraLa} > now()`))
        .groupBy(suportAcces.orgId);
      return new Map(rows.map((r) => [r.orgId, new Date(r.expiraLa)]));
    });
  } catch {
    // Lista organizațiilor trebuie să meargă și dacă tabelul de acces de suport nu a fost încă creat în baza de date.
    return new Map();
  }
}
