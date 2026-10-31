import Link from "next/link";

import { getLocale } from "@/lib/i18n/get-locale";
import { INSTRUMENTE_UI_DICT } from "@/lib/i18n/dictionaries/instrumente-ui";

import { Card, CardHeader } from "../../components/ui/card";
import { listeazaDocumenteAction, type TipDoc } from "./documente-actions";
import { MarcheazaTrimis } from "./marcheaza-trimis";

// Ultimele documente exportate de organizație (sau ale unei firme): se pot redeschide, iar echipa bifează ce a plecat deja.
export async function IstoricDocumente({ orgSlug, tip, hrefGenerator, firmaId, titlu, gol = true }: { orgSlug: string; tip: TipDoc; hrefGenerator: string; firmaId?: string; titlu?: string; gol?: boolean }) {
  const locale = await getLocale();
  const d = INSTRUMENTE_UI_DICT[locale].comun;
  const dataFmt = (iso: string) => new Date(iso).toLocaleString(locale === "ro" ? "ro-RO" : "en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" });
  const titluAles = titlu ?? d.istoric.titlu;
  const intrari = await listeazaDocumenteAction(orgSlug, tip, firmaId ?? null).catch(() => []);
  if (intrari.length === 0) {
    if (!gol) return null;
    return (
      <Card>
        <CardHeader title={titluAles} subtitle={d.istoric.gol} />
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader title={titluAles} subtitle={d.istoric.subtitlu} />
      <ul className="divide-y divide-[var(--ci-border)]">
        {intrari.slice(0, 8).map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-[var(--ci-text)]">{i.titlu || d.document}</p>
              <p className="text-[11.5px] text-[var(--ci-text-muted)]">
                {dataFmt(i.la)}
                {i.autor ? ` · ${i.autor}` : ""}
                {i.numar ? ` · ${i.numar}` : ""}
                {i.trimisLa ? d.istoric.trimis(dataFmt(i.trimisLa)) : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <MarcheazaTrimis orgSlug={orgSlug} tip={tip} id={i.id} trimis={i.stare === "trimis"} />
              <Link href={`${hrefGenerator}?doc=${i.id}${i.firmaId ? `&firma=${i.firmaId}` : ""}`} prefetch={false} className="inline-flex min-h-9 items-center rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
                {d.redeschide}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
