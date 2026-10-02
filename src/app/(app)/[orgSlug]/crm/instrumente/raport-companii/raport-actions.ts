"use server";

import { and, eq, sql } from "drizzle-orm";

import { genereazaRaportActivitateAI, type DateFinanciareExtrase, type SectiuniRaportActivitate } from "@/lib/ai";
import { withOrgAdmin } from "@/lib/auth/guard";
import { autofillDesign } from "@/lib/canva";
import { canvaConnections, companies, companyActivityReports, companySponsorizari, financialDocuments } from "@/lib/db/schema";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";

export type CompanieRaportRand = {
  companyId: string;
  nume: string;
  sumaSponsorizata: number;
  proiecte: string[];
  raport: {
    id: string;
    status: "generat" | "trimis_canva" | "eroare_canva";
    canvaEditUrl: string | null;
    canvaViewUrl: string | null;
  } | null;
};

// Companiile cu cel puțin o sponsorizare reală în anul dat, cu suma totală
// (din company_sponsorizari, sursa de adevăr) și starea raportului existent,
// dacă a fost deja generat. Sortate descrescător după sumă.
export const listeazaRaportCompaniiAction = withOrgAdmin(async (ctx, an: number): Promise<CompanieRaportRand[]> => {
  const sponsorizari = await ctx.db
    .select({
      companyId: companySponsorizari.companyId,
      nume: companies.nume,
      suma: sql<number>`sum(${companySponsorizari.suma})::int`,
      proiecte: sql<
        string[]
      >`coalesce(array_agg(distinct ${companySponsorizari.proiect}) filter (where ${companySponsorizari.proiect} is not null and ${companySponsorizari.proiect} != ''), array[]::text[])`,
    })
    .from(companySponsorizari)
    .innerJoin(companies, eq(companies.id, companySponsorizari.companyId))
    .where(and(eq(companySponsorizari.orgId, ctx.orgId), sql`extract(year from ${companySponsorizari.data}) = ${an}`))
    .groupBy(companySponsorizari.companyId, companies.nume);

  const rapoarte = await ctx.db
    .select({
      id: companyActivityReports.id,
      companyId: companyActivityReports.companyId,
      status: companyActivityReports.status,
      canvaEditUrl: companyActivityReports.canvaEditUrl,
      canvaViewUrl: companyActivityReports.canvaViewUrl,
    })
    .from(companyActivityReports)
    .where(and(eq(companyActivityReports.orgId, ctx.orgId), eq(companyActivityReports.an, an)));
  const rapoarteByCompany = new Map(rapoarte.map((r) => [r.companyId, r]));

  return sponsorizari
    .map((s) => ({
      companyId: s.companyId,
      nume: s.nume,
      sumaSponsorizata: s.suma,
      proiecte: s.proiecte,
      raport: rapoarteByCompany.get(s.companyId) ?? null,
    }))
    .sort((a, b) => b.sumaSponsorizata - a.sumaSponsorizata);
});

export type DetaliuRaport = {
  companyNume: string;
  an: number;
  sumaSponsorizata: number;
  proiecte: string[];
  continut: SectiuniRaportActivitate | null;
  status: "generat" | "trimis_canva" | "eroare_canva" | null;
  sursaFinanciaraConfirmata: boolean;
  canvaEditUrl: string | null;
  canvaViewUrl: string | null;
  canvaEroare: string | null;
  canvaAreSablon: boolean;
};

// Datele necesare paginii de detaliu — compania, suma/proiectele sponsorizării
// din anul respectiv, raportul deja salvat (dacă există) și dacă există un
// document financiar CONFIRMAT pentru acel an (altfel „Generează" avertizează
// că raportul va fi general, fără cifre).
export const obtineDetaliuRaportAction = withOrgAdmin(async (ctx, companyId: string, an: number): Promise<DetaliuRaport> => {
  const [companie] = await ctx.db.select({ nume: companies.nume }).from(companies).where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId))).limit(1);
  if (!companie) throw new EroareUtilizator("Firma nu a fost găsită.");

  const [agregat] = await ctx.db
    .select({
      suma: sql<number>`coalesce(sum(${companySponsorizari.suma}), 0)::int`,
      proiecte: sql<
        string[]
      >`coalesce(array_agg(distinct ${companySponsorizari.proiect}) filter (where ${companySponsorizari.proiect} is not null and ${companySponsorizari.proiect} != ''), array[]::text[])`,
    })
    .from(companySponsorizari)
    .where(and(eq(companySponsorizari.companyId, companyId), eq(companySponsorizari.orgId, ctx.orgId), sql`extract(year from ${companySponsorizari.data}) = ${an}`));

  const [raport] = await ctx.db
    .select({
      continut: companyActivityReports.continut,
      status: companyActivityReports.status,
      canvaEditUrl: companyActivityReports.canvaEditUrl,
      canvaViewUrl: companyActivityReports.canvaViewUrl,
      canvaEroare: companyActivityReports.canvaEroare,
    })
    .from(companyActivityReports)
    .where(and(eq(companyActivityReports.companyId, companyId), eq(companyActivityReports.an, an)))
    .limit(1);

  const [docConfirmat] = await ctx.db
    .select({ id: financialDocuments.id })
    .from(financialDocuments)
    .where(and(eq(financialDocuments.orgId, ctx.orgId), eq(financialDocuments.an, an), sql`${financialDocuments.confirmatLa} is not null`))
    .limit(1);

  const [conexiuneCanva] = await ctx.db
    .select({ brandTemplateId: canvaConnections.brandTemplateId })
    .from(canvaConnections)
    .where(eq(canvaConnections.orgId, ctx.orgId))
    .limit(1);

  return {
    companyNume: companie.nume,
    an,
    sumaSponsorizata: agregat?.suma ?? 0,
    proiecte: agregat?.proiecte ?? [],
    continut: (raport?.continut as SectiuniRaportActivitate | null) ?? null,
    status: raport?.status ?? null,
    sursaFinanciaraConfirmata: Boolean(docConfirmat),
    canvaEditUrl: raport?.canvaEditUrl ?? null,
    canvaViewUrl: raport?.canvaViewUrl ?? null,
    canvaEroare: raport?.canvaEroare ?? null,
    canvaAreSablon: Boolean(conexiuneCanva?.brandTemplateId),
  };
});

// Generează (sau regenerează) raportul cu AI — preferă Bilanțul, cade pe
// Balanță dacă Bilanțul nu e disponibil/confirmat pentru anul respectiv.
// Scrie direct în company_activity_reports (upsert pe companyId+an) ca
// rezultatul să fie imediat editabil/salvabil, nu doar afișat efemer.
export const genereazaRaportAction = withOrgAdmin(async (ctx, companyId: string, an: number): Promise<SectiuniRaportActivitate> => {
  const [companie] = await ctx.db.select({ nume: companies.nume }).from(companies).where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId))).limit(1);
  if (!companie) throw new EroareUtilizator("Firma nu a fost găsită.");

  const [agregat] = await ctx.db
    .select({
      suma: sql<number>`coalesce(sum(${companySponsorizari.suma}), 0)::int`,
      proiecte: sql<
        string[]
      >`coalesce(array_agg(distinct ${companySponsorizari.proiect}) filter (where ${companySponsorizari.proiect} is not null and ${companySponsorizari.proiect} != ''), array[]::text[])`,
    })
    .from(companySponsorizari)
    .where(and(eq(companySponsorizari.companyId, companyId), eq(companySponsorizari.orgId, ctx.orgId), sql`extract(year from ${companySponsorizari.data}) = ${an}`));

  const docuri = await ctx.db
    .select({ id: financialDocuments.id, tip: financialDocuments.tip, dateExtrase: financialDocuments.dateExtrase })
    .from(financialDocuments)
    .where(and(eq(financialDocuments.orgId, ctx.orgId), eq(financialDocuments.an, an), sql`${financialDocuments.confirmatLa} is not null`));
  const docFolosit = docuri.find((d) => d.tip === "bilant") ?? docuri.find((d) => d.tip === "balanta") ?? null;

  const sectiuni = await genereazaRaportActivitateAI({
    orgName: ctx.orgName,
    an,
    companie: { nume: companie.nume, sumaSponsorizata: agregat?.suma ?? null, proiecte: agregat?.proiecte ?? [] },
    dateFinanciare: (docFolosit?.dateExtrase as DateFinanciareExtrase | null) ?? null,
  });
  if (!sectiuni) throw new EroareUtilizator("Generarea cu AI a eșuat (sau AI-ul nu e configurat) — completează raportul manual.");

  await ctx.db
    .insert(companyActivityReports)
    .values({
      orgId: ctx.orgId,
      companyId,
      an,
      sursaFinanciaraId: docFolosit?.id ?? null,
      continut: sectiuni,
      status: "generat",
      generatDe: ctx.userId,
    })
    .onConflictDoUpdate({
      target: [companyActivityReports.companyId, companyActivityReports.an],
      set: { sursaFinanciaraId: docFolosit?.id ?? null, continut: sectiuni, status: "generat", generatDe: ctx.userId, generatLa: new Date() },
    });

  return sectiuni;
});

// Salvează textul editat manual de admin (după generare sau complet manual,
// dacă AI-ul nu era disponibil) — upsert, ca la generare.
export const salveazaRaportAction = withOrgAdmin(async (ctx, companyId: string, an: number, continut: SectiuniRaportActivitate) => {
  await ctx.db
    .insert(companyActivityReports)
    .values({ orgId: ctx.orgId, companyId, an, continut, status: "generat", generatDe: ctx.userId })
    .onConflictDoUpdate({
      target: [companyActivityReports.companyId, companyActivityReports.an],
      set: { continut, generatDe: ctx.userId, generatLa: new Date() },
    });
});

// Trimite conținutul SALVAT (nu regenerează) pe Brand Template-ul ales de
// organizație — creează un design Canva NOU (Autofill), editabil direct de
// ONG în Canva. Cere: raportul deja generat/salvat + Canva conectat cu un
// șablon ales. Câmpurile din șablon trebuie să existe cu EXACT aceste nume.
export const trimiteInCanvaAction = withOrgAdmin(async (ctx, companyId: string, an: number) => {
  const [raport] = await ctx.db
    .select({ id: companyActivityReports.id, continut: companyActivityReports.continut })
    .from(companyActivityReports)
    .where(and(eq(companyActivityReports.companyId, companyId), eq(companyActivityReports.an, an)))
    .limit(1);
  if (!raport?.continut) throw new EroareUtilizator("Generează și salvează mai întâi raportul, înainte de a-l trimite în Canva.");

  const [conexiune] = await ctx.db
    .select({ brandTemplateId: canvaConnections.brandTemplateId })
    .from(canvaConnections)
    .where(eq(canvaConnections.orgId, ctx.orgId))
    .limit(1);
  if (!conexiune?.brandTemplateId) throw new EroareUtilizator("Conectează Canva și alege un șablon în Setări înainte de a trimite un raport.");

  const [companie] = await ctx.db.select({ nume: companies.nume }).from(companies).where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId))).limit(1);
  if (!companie) throw new EroareUtilizator("Firma nu a fost găsită.");

  const [agregat] = await ctx.db
    .select({ suma: sql<number>`coalesce(sum(${companySponsorizari.suma}), 0)::int` })
    .from(companySponsorizari)
    .where(and(eq(companySponsorizari.companyId, companyId), eq(companySponsorizari.orgId, ctx.orgId), sql`extract(year from ${companySponsorizari.data}) = ${an}`));

  const continut = raport.continut as SectiuniRaportActivitate;
  const camp = (text: string) => ({ type: "text" as const, text });
  const data = {
    titlu: camp(continut.titlu),
    introducere: camp(continut.introducere),
    rezumat_financiar: camp(continut.rezumatFinanciar),
    folosire_fonduri: camp(continut.folosireFonduri),
    impact: camp(continut.impact),
    multumire: camp(continut.multumire),
    nume_companie: camp(companie.nume),
    an: camp(String(an)),
    suma_sponsorizata: camp(`${(agregat?.suma ?? 0).toLocaleString("ro-RO")} lei`),
    nume_organizatie: camp(ctx.orgName),
  };

  try {
    const rezultat = await autofillDesign(ctx.db, ctx.orgId, conexiune.brandTemplateId, `${companie.nume} — ${an}`, data);
    await ctx.db
      .update(companyActivityReports)
      .set({ status: "trimis_canva", canvaDesignId: rezultat.designId, canvaEditUrl: rezultat.editUrl, canvaViewUrl: rezultat.viewUrl, canvaEroare: null, trimisCanvaLa: new Date() })
      .where(eq(companyActivityReports.id, raport.id));
    return rezultat;
  } catch (e) {
    const mesaj = mesajSigur(e, "Trimiterea către Canva a eșuat.", "canva-autofill");
    await ctx.db.update(companyActivityReports).set({ status: "eroare_canva", canvaEroare: mesaj }).where(eq(companyActivityReports.id, raport.id));
    throw new EroareUtilizator(mesaj);
  }
});
