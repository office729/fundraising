import Link from "next/link";

import { getLocale } from "@/lib/i18n/get-locale";
import { INSTRUMENTE_UI_DICT } from "@/lib/i18n/dictionaries/instrumente-ui";

import { Card, CardHeader } from "../../components/ui/card";
import { listeazaDocumenteAction, type TipDoc } from "./documente-actions";
import { MarcheazaTrimis } from "./marcheaza-trimis";

const TIPURI: { tip: TipDoc; cale: string }[] = [
  { tip: "scrisori", cale: "scrisori/generator" },
  { tip: "certificate", cale: "certificate/generator" },
  { tip: "rapoarte", cale: "raport-companii/impact" },
];

// Documentele pregătite pentru o firmă (scrisori, certificate, rapoarte), cu starea „trimis”: arată ce i-am dat și ce mai e de trimis.
export async function DocumenteFirma({ orgSlug, firmaId }: { orgSlug: string; firmaId: string }) {
  const locale = await getLocale();
  const d = INSTRUMENTE_UI_DICT[locale].comun;
  const dataFmt = (iso: string) => new Date(iso).toLocaleDateString(locale === "ro" ? "ro-RO" : "en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Bucharest" });
  const grupuri = await Promise.all(TIPURI.map(async (t) => ({ ...t, eticheta: d.documenteFirma.tipuri[t.tip], intrari: await listeazaDocumenteAction(orgSlug, t.tip, firmaId).catch(() => []) })));
  const toate = grupuri.flatMap((g) => g.intrari.map((i) => ({ ...i, g }))).sort((a, b) => b.la.localeCompare(a.la));
  if (toate.length === 0) return null;
  const deTrimis = toate.filter((i) => i.stare !== "trimis").length;
  return (
    <Card>
      <CardHeader title={d.documenteFirma.titlu} subtitle={d.documenteFirma.subtitlu(deTrimis)} />
      <ul className="divide-y divide-[var(--ci-border)]">
        {toate.slice(0, 10).map((i) => (
          <li key={`${i.g.tip}-${i.id}`} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-[var(--ci-text)]">
                <span className="mr-1.5 rounded-full bg-[var(--ci-surface-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ci-text-muted)]">{i.g.eticheta}</span>
                {i.titlu || d.document}
              </p>
              <p className="text-[11.5px] text-[var(--ci-text-muted)]">
                {dataFmt(i.la)}
                {i.autor ? ` · ${i.autor}` : ""}
                {i.numar ? ` · ${i.numar}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <MarcheazaTrimis orgSlug={orgSlug} tip={i.g.tip} id={i.id} trimis={i.stare === "trimis"} />
              <Link href={`/${orgSlug}/crm/instrumente/${i.g.cale}?doc=${i.id}&firma=${firmaId}`} prefetch={false} className="inline-flex min-h-9 items-center rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
                {d.redeschide}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
