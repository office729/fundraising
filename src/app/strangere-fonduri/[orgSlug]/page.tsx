import { and, desc, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { db } from "@/lib/db";
import { fundraisingPages, organizations } from "@/lib/db/schema";

import { ProgressRing } from "./[pageSlug]/progress-ring";

// Pagina-hub, publică, a organizației: toate campaniile ei într-un singur
// link de distribuit — echivalentul unui microsite Galantom/GoFundMe pentru
// organizația respectivă. Campaniile individuale (/[pageSlug]) există deja și
// rămân neschimbate; asta le adună într-un singur loc, ca un donator care nu
// știe de un caz anume să găsească oricum toate cauzele active ale ONG-ului.
const getOrgSiPaginile = cache(async (orgSlug: string) => {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const [org] = await tx
      .select({ id: organizations.id, name: organizations.name, logoUrl: organizations.logoUrl, slogan: organizations.slogan })
      .from(organizations)
      .where(eq(organizations.slug, orgSlug))
      .limit(1);
    if (!org) return null;

    const active = await tx
      .select()
      .from(fundraisingPages)
      .where(and(eq(fundraisingPages.orgId, org.id), eq(fundraisingPages.status, "activa")))
      .orderBy(desc(fundraisingPages.sumaStransa));

    const incheiate = await tx
      .select()
      .from(fundraisingPages)
      .where(and(eq(fundraisingPages.orgId, org.id), eq(fundraisingPages.status, "inchisa")))
      .orderBy(desc(fundraisingPages.sumaStransa))
      .limit(12);

    return { org, active, incheiate };
  });
});

export async function generateMetadata({ params }: { params: Promise<{ orgSlug: string }> }): Promise<Metadata> {
  const { orgSlug } = await params;
  const data = await getOrgSiPaginile(orgSlug);
  if (!data) return {};
  return {
    title: `Campanii — ${data.org.name}`,
    description: `Toate campaniile de strângere de fonduri ale ${data.org.name}.`,
    openGraph: { title: `Campanii — ${data.org.name}`, type: "website" },
  };
}

export default async function PaginaOrgHub({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const data = await getOrgSiPaginile(orgSlug);
  if (!data) notFound();
  const { org, active, incheiate } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-blue-soft/70 via-panel-2 to-panel-2">
      <main className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <div className="flex flex-col items-center text-center">
          {org.logoUrl && (
            <Image src={org.logoUrl} alt={org.name} width={72} height={72} unoptimized className="h-[72px] w-[72px] rounded-2xl border border-line bg-panel object-contain p-2" />
          )}
          <h1 className="font-display mt-4 text-[28px] leading-tight font-bold text-ink sm:text-[32px]">{org.name}</h1>
          {org.slogan && <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-2">{org.slogan}</p>}
          <p className="mt-1 text-[13px] text-muted-2">
            {active.length === 0 ? "Nicio campanie activă momentan" : `${active.length} ${active.length === 1 ? "campanie activă" : "campanii active"}`}
          </p>
          <Link
            href={`/strangere-fonduri/${orgSlug}/creeaza`}
            className="mt-5 inline-block rounded-md bg-brand-green px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-green-hover"
          >
            Creează propria ta pagină de strângere de fonduri →
          </Link>
        </div>

        {active.length === 0 ? (
          <p className="mt-10 text-center text-[14px] text-muted-2">
            Revino curând — {org.name} nu are nicio campanie activă în acest moment.
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {active.map((p) => (
              <CampanieCard key={p.id} orgSlug={orgSlug} pagina={p} />
            ))}
          </div>
        )}

        {incheiate.length > 0 && (
          <details className="mt-10 rounded-2xl border border-line bg-panel p-5 sm:p-6">
            <summary className="cursor-pointer font-display text-sm font-bold text-ink">
              Campanii încheiate ({incheiate.length})
            </summary>
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {incheiate.map((p) => (
                <CampanieCard key={p.id} orgSlug={orgSlug} pagina={p} incheiata />
              ))}
            </div>
          </details>
        )}
      </main>
    </div>
  );
}

function CampanieCard({
  orgSlug,
  pagina,
  incheiata,
}: {
  orgSlug: string;
  pagina: typeof fundraisingPages.$inferSelect;
  incheiata?: boolean;
}) {
  const procent = pagina.sumaTinta ? Math.min(100, Math.round((pagina.sumaStransa / pagina.sumaTinta) * 100)) : null;
  return (
    <Link
      href={`/strangere-fonduri/${orgSlug}/${pagina.slug}`}
      data-domeniu={pagina.template}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-panel shadow-sm transition hover:shadow-[0_14px_36px_-18px_rgba(21,74,133,0.35)]"
    >
      <div className="aspect-[16/9] w-full shrink-0 overflow-hidden bg-gradient-to-br from-brand-blue to-brand-green">
        {pagina.imagineUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- domeniu Supabase Storage dinamic
          <img src={pagina.imagineUrl} alt={pagina.titlu} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        )}
      </div>
      <div className="flex flex-1 items-center gap-4 p-5">
        {procent != null && <ProgressRing procent={procent} />}
        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-[15px] font-bold text-ink">{pagina.titlu}</p>
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-2">{pagina.poveste}</p>
          <p className="mt-2 text-[13px] font-semibold text-brand-blue">
            {pagina.sumaStransa.toLocaleString("ro-RO")} lei
            {pagina.sumaTinta && <span className="font-normal text-muted-2"> din {pagina.sumaTinta.toLocaleString("ro-RO")} lei</span>}
          </p>
        </div>
      </div>
      {incheiata && (
        <p className="border-t border-line bg-panel-2 px-5 py-2 text-center text-[11px] font-semibold tracking-wide text-muted-2 uppercase">Încheiată</p>
      )}
    </Link>
  );
}
