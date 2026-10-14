import { and, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { fundraisingPages, organizations } from "@/lib/db/schema";
import { DONATION_DICT } from "@/lib/i18n/dictionaries/donation";
import { getLocale } from "@/lib/i18n/get-locale";
import { caleCampanie } from "@/lib/link-campanie";

import { DoneazaForm } from "../doneaza-form";
import { UrmarireVizite } from "../urmarire-vizite";
import { InaltimeAutomata } from "./inaltime-automata";

// Widgetul de donație încorporat pe site-ul organizației (iframe creat de public/embed.js): doar formularul campaniei, fără restul paginii.
// Metodele rapide (Apple/Google Pay, Revolut, PayPal) rămân pe pagina campaniei; aici plata se face pe pagina Stripe, deschisă de pagina părinte.
export const metadata: Metadata = { robots: { index: false, follow: false } };

async function citestePagina(orgSlug: string, pageSlug: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const [org] = await tx.select({ id: organizations.id, name: organizations.name, cif: organizations.cif }).from(organizations).where(eq(organizations.slug, orgSlug)).limit(1);
    if (!org) return null;
    const [pagina] = await tx
      .select({ titlu: fundraisingPages.titlu, status: fundraisingPages.status, sumaTinta: fundraisingPages.sumaTinta, sumaStransa: fundraisingPages.sumaStransa })
      .from(fundraisingPages)
      .where(and(eq(fundraisingPages.orgId, org.id), eq(fundraisingPages.slug, pageSlug)))
      .limit(1);
    return pagina ? { org, pagina } : null;
  });
}

export default async function EmbedDonatiePage({ params }: { params: Promise<{ orgSlug: string; pageSlug: string }> }) {
  const { orgSlug, pageSlug } = await params;
  const [data, locale] = await Promise.all([citestePagina(orgSlug, pageSlug), getLocale()]);
  if (!data) notFound();
  const { org, pagina } = data;
  const t = DONATION_DICT[locale];
  const c = t.campaignPage;
  const activa = pagina.status === "activa";
  const procent = pagina.sumaTinta ? Math.min(100, Math.round((pagina.sumaStransa / pagina.sumaTinta) * 100)) : null;

  return (
    <InaltimeAutomata>
      <div className="mx-auto max-w-md bg-canvas p-4">
        <UrmarireVizite orgSlug={orgSlug} pageSlug={pageSlug} />
        <h1 className="font-display text-lg font-bold text-ink">{pagina.titlu}</h1>
        <p className="mt-0.5 text-[13px] text-muted">{org.name}</p>

        {procent !== null && (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={procent} aria-valuemin={0} aria-valuemax={100} aria-label={c.procentDinTinta(procent)}>
              <div className="h-full rounded-full bg-brand-green" style={{ width: `${procent}%` }} />
            </div>
            <p className="mt-1 text-[12.5px] text-muted">
              {pagina.sumaStransa.toLocaleString(t.numeLocale)} lei {c.stransPanaAcum}
              {pagina.sumaTinta ? ` · ${c.dinTintaScurt(pagina.sumaTinta.toLocaleString(t.numeLocale))}` : ""}
            </p>
          </div>
        )}

        {activa ? (
          <DoneazaForm orgSlug={orgSlug} pageSlug={pageSlug} titlu={pagina.titlu} locale={locale} orgName={org.name} orgCif={org.cif} publishableKey={null} embed />
        ) : (
          <p className="mt-4 rounded-lg border border-line bg-panel p-3 text-sm text-body">{c.campanieInchisa}</p>
        )}

        <p className="mt-3 text-center text-[13px]">
          <a href={caleCampanie(orgSlug, pageSlug)} target="_blank" rel="noopener noreferrer" className="font-medium text-body underline">
            {locale === "ro" ? "Vezi toată campania" : "See the full campaign"}
          </a>
        </p>
      </div>
    </InaltimeAutomata>
  );
}
