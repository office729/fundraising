import { requireOrgAccess } from "@/lib/auth/guard";
import { ANALIZE_AI_UI_DICT } from "@/lib/i18n/dictionaries/analize-ai-ui";
import { getLocale } from "@/lib/i18n/get-locale";

import { obtineAnalizeOng } from "./actions";
import { AnalizaOngVedere } from "./vedere";

export const dynamic = "force-dynamic";
// Analiza rulează în fundal (`after` din acțiunea de pornire) cu căutare web: durează câteva minute. Valoarea se aplică și acțiunilor apelate din această pagină.
export const maxDuration = 300;

// Analiza ONG-urilor: doar owner/admin (folosește contul Anthropic al organizației și consumă din el).
export default async function AnalizaOngPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  if (access.role !== "owner" && access.role !== "admin") {
    const d = ANALIZE_AI_UI_DICT[await getLocale()].ong;
    return (
      <div className="mx-auto max-w-[900px]">
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{d.titlu}</h1>
        <p className="mt-2 text-[13px] text-[var(--ci-text-muted)]">{d.doarAdmin}</p>
      </div>
    );
  }
  const date = await obtineAnalizeOng(orgSlug);
  return <AnalizaOngVedere orgSlug={orgSlug} analize={date.analize} aiConectat={date.aiConectat} />;
}
