import { and, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { fundraisingPages, organizations } from "@/lib/db/schema";
import { genereazaCalendarZilnic, genereazaComunicatPresa, genereazaEtape, genereazaMesajeGrupuri } from "@/lib/promovare/generator";

import { PromovareTabs } from "./promovare-tabs";

async function getPaginaPentruPromovare(orgSlug: string, pageSlug: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const org = await tx.select({ id: organizations.id, name: organizations.name }).from(organizations).where(eq(organizations.slug, orgSlug)).limit(1);
    if (!org[0]) return null;

    const pagina = await tx
      .select()
      .from(fundraisingPages)
      .where(and(eq(fundraisingPages.orgId, org[0].id), eq(fundraisingPages.slug, pageSlug)))
      .limit(1);
    if (!pagina[0]) return null;

    return { org: org[0], pagina: pagina[0] };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string; pageSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug, pageSlug } = await params;
  const data = await getPaginaPentruPromovare(orgSlug, pageSlug);
  if (!data) return {};
  return { title: `Instrumente de promovare — ${data.pagina.titlu}` };
}

export default async function PromovarePage({
  params,
}: {
  params: Promise<{ orgSlug: string; pageSlug: string }>;
}) {
  const { orgSlug, pageSlug } = await params;
  const data = await getPaginaPentruPromovare(orgSlug, pageSlug);
  if (!data) notFound();

  const { org, pagina } = data;
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const url = `${proto}://${hdrs.get("host")}/strangere-fonduri/${orgSlug}/${pageSlug}`;

  const dateCampanie = {
    titlu: pagina.titlu,
    poveste: pagina.poveste,
    orgName: org.name,
    url,
    sumaStransa: pagina.sumaStransa,
    sumaTinta: pagina.sumaTinta,
  };

  const calendar = genereazaCalendarZilnic(dateCampanie);
  const mesajeGrupuri = genereazaMesajeGrupuri(dateCampanie);
  const comunicatPresa = genereazaComunicatPresa(dateCampanie);
  const etape = genereazaEtape(dateCampanie);

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-blue-soft/70 via-panel-2 to-panel-2">
      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <Link href={`/strangere-fonduri/${orgSlug}/${pageSlug}`} className="text-[13px] text-muted-2 hover:text-brand-blue">
          ← Înapoi la pagina campaniei
        </Link>

        <div className="mt-4 overflow-hidden rounded-3xl border border-line bg-panel shadow-[0_20px_50px_-25px_rgba(21,74,133,0.35)]">
          <div className="px-6 py-7 sm:px-10 sm:py-9">
            <p className="text-xs font-bold tracking-wide text-brand-green uppercase">Instrumente de promovare</p>
            <h1 className="font-display mt-1.5 text-[26px] leading-tight font-bold text-ink">{pagina.titlu}</h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
              Texte gata de folosit ca să ajuți la distribuirea campaniei — pe grupuri, în conversații sau către presa
              locală. Copiezi și trimiți, fără cont, fără înregistrare.
            </p>

            <PromovareTabs calendar={calendar} mesajeGrupuri={mesajeGrupuri} comunicatPresa={comunicatPresa} etape={etape} />
          </div>
        </div>
      </main>
    </div>
  );
}
