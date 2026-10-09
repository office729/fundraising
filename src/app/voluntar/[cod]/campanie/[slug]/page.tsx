import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { volunteerMissions, volunteerShares } from "@/lib/db/schema";
import { esteCanal, ziuaRo, type CanalId } from "@/lib/voluntari-panou";
import { campaniiVizibile, cuOrg, linkCampanie, progresCampanie, rezolvaCod, vizitatorDinCookie } from "@/lib/voluntari-panou-server";

import { Bara, PanouShell } from "../../shell";

import { CampanieClient } from "./campanie-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ cod: string }> }): Promise<Metadata> {
  const link = await rezolvaCod((await params).cod);
  return { title: link ? `Distribuie · ${link.org.nume}` : "Panou voluntari" };
}

// Stabilește de la ce frază începe mesajul: diferit între voluntari, între campanii și de la o zi la alta.
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  return h;
}

export default async function PaginaCampanie({ params, searchParams }: { params: Promise<{ cod: string; slug: string }>; searchParams: Promise<{ canal?: string }> }) {
  const { cod, slug } = await params;
  const { canal } = await searchParams;
  const link = await rezolvaCod(cod);
  if (!link) notFound();
  const { org } = link;

  const date = await cuOrg(org.id, async (tx) => {
    const v = await vizitatorDinCookie(tx, org.id);
    if (!v) return "fara-sesiune" as const;
    const campanie = (await campaniiVizibile(tx, org.id)).find((c) => c.slug === slug);
    if (!campanie) return null;
    const ziua = ziuaRo();
    const [bifate, misiune] = await Promise.all([
      tx
        .select({ canal: volunteerShares.canal })
        .from(volunteerShares)
        .where(and(eq(volunteerShares.visitorId, v.id), eq(volunteerShares.campaignPageId, campanie.id), eq(volunteerShares.ziua, ziua), eq(volunteerShares.orgId, org.id))),
      tx
        .select({ canal: volunteerMissions.canal })
        .from(volunteerMissions)
        .where(and(eq(volunteerMissions.visitorId, v.id), eq(volunteerMissions.campaignPageId, campanie.id), eq(volunteerMissions.ziua, ziua), eq(volunteerMissions.orgId, org.id))),
    ]);
    return { v, campanie, bifate: bifate.map((b) => b.canal as CanalId), misiune: misiune.map((m) => m.canal as CanalId) };
  });

  if (date === "fara-sesiune") redirect(`/voluntar/${cod}`);
  if (!date) notFound();

  const { v, campanie, bifate, misiune } = date;
  const progres = progresCampanie(campanie);
  const mesajPropriu = campanie.mesaj?.trim() || link.mesajImplicit?.trim() || null;

  return (
    <PanouShell org={org}>
      <Link href={`/voluntar/${cod}`} className="-mb-2 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--vp-brand)] hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Înapoi la campanii
      </Link>

      <article className="overflow-hidden rounded-2xl border border-[var(--vp-line)] bg-white">
        {campanie.imagineUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- imagine din Supabase Storage, domeniu dinamic
          <img src={campanie.imagineUrl} alt="" className="h-52 w-full object-cover" />
        )}
        <div className="p-4">
          <h1 className="font-display text-[22px] leading-snug font-bold">{campanie.titlu}</h1>
          {campanie.judet && <p className="mt-0.5 text-[13px] text-[var(--vp-muted)]">{campanie.judet}</p>}
          {progres !== null && (
            <div className="mt-3">
              <Bara valoare={progres} />
              <p className="mt-1 text-[12.5px] text-[var(--vp-muted)] tabular-nums">
                {campanie.sumaStransa.toLocaleString("ro-RO")} din {campanie.sumaTinta!.toLocaleString("ro-RO")} lei · {Math.round(progres * 100)}%
              </p>
            </div>
          )}
        </div>
      </article>

      <CampanieClient
        cod={cod}
        campaignId={campanie.id}
        titlu={campanie.titlu}
        poveste={campanie.poveste}
        linkBaza={linkCampanie(org.slug, campanie.slug)}
        mesajPropriu={mesajPropriu}
        variantaInitiala={hash(`${v.id}|${campanie.id}|${ziuaRo()}`) % 6}
        bifateInitial={bifate}
        inMisiune={misiune}
        canalInitial={esteCanal(canal) ? canal : null}
      />
    </PanouShell>
  );
}
