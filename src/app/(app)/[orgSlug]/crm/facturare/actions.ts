"use server";

import { and, desc, eq } from "drizzle-orm";

import { withOrgAdmin } from "@/lib/auth/guard";
import { dateFacturareComplete, MESAJ_DATE_FACTURARE_LIPSA } from "@/lib/billing/date-facturare";
import { factureazaPlata } from "@/lib/billing/netopia-confirm";
import { NUME_PACHET_FIX } from "@/lib/billing/packages";
import { trialDaysRemaining } from "@/lib/billing/trial";
import { appUsers, memberships, organizations, platformPayments } from "@/lib/db/schema";
import { facturareFiscalaPermisa, MARCAJ_NEFACTURAT_SANDBOX, oblioConfigurata } from "@/lib/oblio";

// Pagina „Facturare” a organizației: planul, metoda de plată, datele de facturare și facturile emise de Alexandrit prin Oblio.
// Doar owner/admin; datele de facturare se editează cu acțiunea existentă (salveazaDateFacturareAction din billing-actions).

export type FacturaPlata = {
  id: string;
  data: string;
  pachet: string;
  sumaLei: number;
  numar: string | null;
  link: string | null;
  stare: "emisa" | "se-emite" | "nefacturat";
};

export type DateFacturare = {
  plan: { pachet: string; eticheta: string; status: string; expiraLa: string | null; probaZileRamase: number | null };
  metodaPlata: { tip: "card-automat" | "card" | "factura"; masca: string | null; expira: string | null };
  firma: { nume: string; cif: string | null; adresa: string | null; judet: string | null; emailFacturi: string | null; completa: boolean };
  facturi: FacturaPlata[];
  facturareActiva: boolean;
};

const ETICHETE: Record<string, string> = { trial: "Probă", start: "START", crestere: "CREȘTERE", impact: "IMPACT", custom: "Personalizat" };

export const obtineDateFacturare = withOrgAdmin(async (ctx): Promise<DateFacturare> => {
  const [org] = await ctx.db
    .select({
      masca: organizations.netopiaCardMasked,
      luna: organizations.netopiaCardExpireMonth,
      an: organizations.netopiaCardExpireYear,
      autoRenew: organizations.netopiaAutoRenew,
      token: organizations.netopiaCardTokenEnc,
    })
    .from(organizations)
    .where(eq(organizations.id, ctx.orgId))
    .limit(1);

  const [proprietar] = await ctx.db
    .select({ email: appUsers.email })
    .from(memberships)
    .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
    .where(and(eq(memberships.orgId, ctx.orgId), eq(memberships.role, "owner")))
    .limit(1);

  const plati = await ctx.db
    .select({
      id: platformPayments.id,
      createdAt: platformPayments.createdAt,
      pachet: platformPayments.package,
      sumaLei: platformPayments.sumaLei,
      numar: platformPayments.oblioNumber,
      link: platformPayments.oblioLink,
    })
    .from(platformPayments)
    .where(and(eq(platformPayments.orgId, ctx.orgId), eq(platformPayments.status, "reusita")))
    .orderBy(desc(platformPayments.createdAt))
    .limit(60);

  const proba = ctx.orgPackage === "trial";
  const cardSalvat = !!org?.token;
  const tip: DateFacturare["metodaPlata"]["tip"] = cardSalvat && org?.autoRenew ? "card-automat" : plati.length > 0 ? "card" : "factura";
  return {
    plan: {
      pachet: ctx.orgPackage,
      eticheta: ETICHETE[ctx.orgPackage] ?? ctx.orgPackage,
      status: ctx.orgSubscriptionStatus,
      expiraLa: ctx.orgCurrentPeriodEnd ? ctx.orgCurrentPeriodEnd.toISOString() : null,
      probaZileRamase: proba ? Math.max(0, trialDaysRemaining(ctx.orgCreatedAt)) : null,
    },
    metodaPlata: {
      tip,
      masca: org?.masca ?? null,
      expira: org?.luna && org?.an ? `${String(org.luna).padStart(2, "0")}/${org.an}` : null,
    },
    firma: {
      nume: ctx.orgName,
      cif: ctx.orgCif,
      adresa: ctx.orgAdresaSediu,
      judet: ctx.orgJudet,
      emailFacturi: proprietar?.email ?? null,
      completa: dateFacturareComplete({ cif: ctx.orgCif, adresaSediu: ctx.orgAdresaSediu, judet: ctx.orgJudet }),
    },
    facturi: plati.map((p) => ({
      id: p.id,
      data: p.createdAt.toISOString(),
      pachet: (NUME_PACHET_FIX as Record<string, string>)[p.pachet] ?? ETICHETE[p.pachet] ?? p.pachet,
      sumaLei: p.sumaLei,
      numar: p.numar,
      link: p.link,
      stare: p.link ? "emisa" : p.numar?.startsWith(MARCAJ_NEFACTURAT_SANDBOX) ? "nefacturat" : "se-emite",
    })),
    facturareActiva: oblioConfigurata() && facturareFiscalaPermisa(),
  };
});

// Emite acum o factură rămasă neemisă (Oblio a fost indisponibil etc.). Doar pentru o plată reușită a ACESTEI organizații, și doar dacă
// datele de facturare sunt complete. Emiterea e idempotentă (aceeași comandă nu creează două facturi).
export const genereazaFacturaAction = withOrgAdmin(async (ctx, plataId: string): Promise<{ ok: true } | { ok: false; eroare: string }> => {
  if (!/^[0-9a-f-]{36}$/i.test(String(plataId))) return { ok: false, eroare: "Cerere invalidă." };
  const [plata] = await ctx.db
    .select({ orderId: platformPayments.orderId, numar: platformPayments.oblioNumber })
    .from(platformPayments)
    .where(and(eq(platformPayments.id, plataId), eq(platformPayments.orgId, ctx.orgId), eq(platformPayments.status, "reusita")))
    .limit(1);
  if (!plata) return { ok: false, eroare: "Plata nu a fost găsită." };
  if (plata.numar) return { ok: true };
  if (!dateFacturareComplete({ cif: ctx.orgCif, adresaSediu: ctx.orgAdresaSediu, judet: ctx.orgJudet })) return { ok: false, eroare: MESAJ_DATE_FACTURARE_LIPSA };
  if (!oblioConfigurata() || !facturareFiscalaPermisa()) return { ok: false, eroare: "Emiterea facturilor nu e activă pe acest server. Factura se va emite singură când e activată." };
  try {
    await factureazaPlata(plata.orderId);
  } catch {
    return { ok: false, eroare: "Nu am putut emite factura acum. Încearcă din nou peste câteva minute." };
  }
  const [dupa] = await ctx.db.select({ link: platformPayments.oblioLink }).from(platformPayments).where(and(eq(platformPayments.id, plataId), eq(platformPayments.orgId, ctx.orgId))).limit(1);
  return dupa?.link ? { ok: true } : { ok: false, eroare: "Factura nu s-a putut emite încă. Încearcă din nou peste câteva minute." };
});
