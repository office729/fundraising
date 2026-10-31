"use server";

import { and, desc, eq } from "drizzle-orm";

import { withOrgAdmin } from "@/lib/auth/guard";
import { dateFacturareComplete, MESAJ_DATE_FACTURARE_LIPSA } from "@/lib/billing/date-facturare";
import { factureazaPlata } from "@/lib/billing/netopia-confirm";
import { NUME_PACHET_FIX } from "@/lib/billing/packages";
import { trialDaysRemaining } from "@/lib/billing/trial";
import { appUsers, memberships, organizations, platformPayments } from "@/lib/db/schema";
import { facturareFiscalaPermisa, MARCAJ_NEFACTURAT_SANDBOX, oblioConfigurata } from "@/lib/oblio";
import { cardAfisat } from "@/lib/billing/card-afisat";
import { getTr } from "@/lib/i18n/tr-server";

// Pagina „Facturare” a organizației: planul, metoda de plată, datele de facturare și facturile emise de Alexandrit prin Oblio.
// Doar owner/admin; datele de facturare se editează cu acțiunea existentă (salveazaDateFacturareAction din billing-actions).

export type FacturaPlata = {
  id: string;
  data: string;
  pachet: string;
  sumaLei: number;
  // Luni de acces acoperite de plată: 1 = lunar, 12 = anual.
  luni: number;
  numar: string | null;
  link: string | null;
  stare: "emisa" | "se-emite" | "nefacturat";
};

export type DateFacturare = {
  plan: { pachet: string; eticheta: string; status: string; expiraLa: string | null; probaZileRamase: number | null };
  metodaPlata: { tip: "card-automat" | "card" | "factura"; masca: string | null; expira: string | null };
  // Controlul abonamentului: card salvat pentru reînnoire, reînnoire activă, abonament anulat (accesul rămâne până la sfârșitul perioadei plătite).
  // `platit`: are un abonament plătit (o plată reușită sau o perioadă activă) — doar atunci are sens să-l anulezi, chiar și fără card salvat.
  abonament: { cardSalvat: boolean; reinnoireActiva: boolean; anulat: boolean; platit: boolean };
  firma: { nume: string; cif: string | null; adresa: string | null; judet: string | null; emailFacturi: string | null; completa: boolean };
  facturi: FacturaPlata[];
  facturareActiva: boolean;
};

// Numele planurilor (START, CREȘTERE, IMPACT) sunt denumiri de produs și rămân la fel în ambele limbi; „Probă” și „Personalizat” se traduc.
const etichete = (t: (ro: string, en: string) => string): Record<string, string> => ({ trial: t("Probă", "Trial"), start: "START", crestere: "CREȘTERE", impact: "IMPACT", custom: t("Personalizat", "Custom") });
const numePachet = (t: (ro: string, en: string) => string): Record<string, string> => ({ start: t("Pachet START", "START plan"), crestere: t("Pachet CREȘTERE", "CREȘTERE plan"), impact: t("Pachet IMPACT", "IMPACT plan") });

export const obtineDateFacturare = withOrgAdmin(async (ctx): Promise<DateFacturare> => {
  const t = await getTr();
  const ETICHETE = etichete(t);
  const NUME_PACHET = numePachet(t);
  const [org] = await ctx.db
    .select({
      masca: organizations.netopiaCardMasked,
      luna: organizations.netopiaCardExpireMonth,
      an: organizations.netopiaCardExpireYear,
      autoRenew: organizations.netopiaAutoRenew,
      token: organizations.netopiaCardTokenEnc,
      anulat: organizations.netopiaAutorenewOptOut,
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
      luni: platformPayments.luni,
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
      masca: cardAfisat(org?.masca),
      expira: org?.luna && org?.an ? `${String(org.luna).padStart(2, "0")}/${org.an}` : null,
    },
    abonament: {
      cardSalvat,
      reinnoireActiva: cardSalvat && !!org?.autoRenew,
      anulat: !!org?.anulat,
      platit: plati.length > 0 || (ctx.orgSubscriptionStatus === "active" && !!ctx.orgCurrentPeriodEnd && ctx.orgCurrentPeriodEnd.getTime() > Date.now()),
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
      pachet: NUME_PACHET[p.pachet] ?? (NUME_PACHET_FIX as Record<string, string>)[p.pachet] ?? ETICHETE[p.pachet] ?? p.pachet,
      sumaLei: p.sumaLei,
      luni: p.luni,
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
  const t = await getTr();
  if (!/^[0-9a-f-]{36}$/i.test(String(plataId))) return { ok: false, eroare: t("Cerere invalidă.", "Invalid request.") };
  const [plata] = await ctx.db
    .select({ orderId: platformPayments.orderId, numar: platformPayments.oblioNumber })
    .from(platformPayments)
    .where(and(eq(platformPayments.id, plataId), eq(platformPayments.orgId, ctx.orgId), eq(platformPayments.status, "reusita")))
    .limit(1);
  if (!plata) return { ok: false, eroare: t("Plata nu a fost găsită.", "Payment not found.") };
  if (plata.numar) return { ok: true };
  if (!dateFacturareComplete({ cif: ctx.orgCif, adresaSediu: ctx.orgAdresaSediu, judet: ctx.orgJudet })) return { ok: false, eroare: t(MESAJ_DATE_FACTURARE_LIPSA, "Fill in your organization's CUI (tax ID), registered office address and county before paying.") };
  if (!oblioConfigurata() || !facturareFiscalaPermisa()) return { ok: false, eroare: t("Emiterea facturilor nu e activă pe acest server. Factura se va emite singură când e activată.", "Invoice issuing is not active on this server. The invoice will be issued automatically once it is enabled.") };
  try {
    await factureazaPlata(plata.orderId);
  } catch {
    return { ok: false, eroare: t("Nu am putut emite factura acum. Încearcă din nou peste câteva minute.", "We could not issue the invoice right now. Please try again in a few minutes.") };
  }
  const [dupa] = await ctx.db.select({ link: platformPayments.oblioLink }).from(platformPayments).where(and(eq(platformPayments.id, plataId), eq(platformPayments.orgId, ctx.orgId))).limit(1);
  return dupa?.link ? { ok: true } : { ok: false, eroare: t("Factura nu s-a putut emite încă. Încearcă din nou peste câteva minute.", "The invoice could not be issued yet. Please try again in a few minutes.") };
});
