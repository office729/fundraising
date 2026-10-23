import Link from "next/link";
import { notFound } from "next/navigation";

import { cerePlatformAdminPagina } from "@/lib/auth/platform-admin";
import { citesteOrgPentruPersonalizare } from "@/lib/suport/personalizare-admin";
import { citesteTimp } from "@/lib/suport/timp-admin";

import { TimpClient, type DateTimpClient } from "./timp-client";

export const metadata = { title: "Timp alocat", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Registrul de timp al unei organizații, doar pentru echipa platformei: timer, intrări manuale, tarife și totaluri (inclusiv suma de facturat). Clientul vede doar
// timpul, fără tarife, și doar dacă pagina „Timp alocat” e activată pentru el din editorul de aspect.
export default async function TimpPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const actor = await cerePlatformAdminPagina();
  const { orgSlug } = await params;
  const org = await citesteOrgPentruPersonalizare(orgSlug);
  if (!org) notFound();

  let date: DateTimpClient | null = null;
  try {
    const d = await citesteTimp(org.id, actor);
    date = {
      actorId: d.actorId,
      tarife: d.tarife,
      intrari: d.intrari.map((i) => ({ ...i, pornitLa: i.pornitLa ? i.pornitLa.toISOString() : null, opritLa: i.opritLa ? i.opritLa.toISOString() : null })),
    };
  } catch {
    date = null; // tabelele de timp încă nu există
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Link href="/platform-admin" className="text-xs font-medium text-brand-blue hover:underline">
        ← Panou platformă
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-ink">Timp alocat · {org.nume}</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Cât timp a alocat echipa pentru această organizație (modificări custom, integrări, suport), cu timer sau intrări manuale, inclusiv
        munca făcută cu asistență AI (e tot timp al echipei). Aici vezi și suma de facturat; clientul vede timpul și banca de ore, nu și tariful.{" "}
        <Link href={`/platform-admin/personalizare/${org.slug}`} className="font-medium text-brand-blue hover:underline">
          Activează pagina „Timp alocat” pentru client din editorul de aspect →
        </Link>
      </p>
      {date ? (
        <TimpClient org={{ id: org.id, slug: org.slug, nume: org.nume }} date={date} arataClientului={org.config?.arataTimp === true} orePachet={org.config?.orePachet ?? null} pachetLunar={org.config?.pachetLunar === true} />
      ) : (
        <p role="alert" className="mt-6 rounded-xl border border-line bg-panel p-4 text-sm text-red-700">
          Nu am putut citi registrul de timp. Verifică dacă tabelele <code>org_timp</code> și <code>org_timp_tarife</code> au fost create în baza de date (vezi
          documentation/personalizare-organizatie.sql).
        </p>
      )}
    </main>
  );
}
