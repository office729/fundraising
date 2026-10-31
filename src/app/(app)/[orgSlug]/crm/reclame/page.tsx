import { after } from "next/server";

import { requireOrgAccess } from "@/lib/auth/guard";
import { RECLAME_UI_DICT } from "@/lib/i18n/dictionaries/reclame-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { PRAG_VECHIME_MIN } from "@/lib/reclame/meta-api";
import { sincronizeazaDacaVeche } from "@/lib/reclame/meta-sync";

import { obtineDateReclame } from "./actions";
import { ReclameVedere } from "./vedere";

export const dynamic = "force-dynamic";
// Sincronizarea cu Meta (butonul sau reîmprospătarea din fundal) rulează în această rută.
export const maxDuration = 120;

// Performanța reclamelor: cheltuieli, donații confirmate atribuite reclamelor și eficiența lor. Doar owner/admin (conține cheltuieli și sume).
export default async function ReclamePage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<{ preset?: string; de?: string; pana?: string; fer?: string }> }) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const access = await requireOrgAccess(orgSlug);
  if (access.role !== "owner" && access.role !== "admin") {
    const dict = RECLAME_UI_DICT[await getLocale()].page;
    return (
      <div className="mx-auto max-w-[900px]">
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-2 text-[13px] text-[var(--ci-text-muted)]">{dict.doarAdmin}</p>
      </div>
    );
  }
  const date = await obtineDateReclame(orgSlug, { preset: sp.preset, de: sp.de, pana: sp.pana, fer: sp.fer });
  // Conexiune Meta activă și date mai vechi de o oră: se reîmprospătează ultimele 7 zile în fundal, după trimiterea paginii.
  const meta = date.conexiuni.find((c) => c.platforma === "meta" && c.stare === "activ");
  if (meta) after(() => sincronizeazaDacaVeche(access.orgId, meta.ultimaReusita, meta.ultimaSincronizare, PRAG_VECHIME_MIN));
  return <ReclameVedere orgSlug={orgSlug} date={date} />;
}
