import Link from "next/link";

import { getLocale } from "@/lib/i18n/get-locale";
import { INSTRUMENTE_UI_DICT } from "@/lib/i18n/dictionaries/instrumente-ui";

import { Card, CardHeader } from "../../components/ui/card";
import { multumiriRestanteAction } from "./documente-actions";

// Sponsorizările la care nu s-a trimis încă o mulțumire (scrisoare bifată ca „trimisă”). Țintă: mulțumirea pleacă în cel mult 7 zile.
export async function MultumiriRestante({ orgSlug }: { orgSlug: string }) {
  const locale = await getLocale();
  const fmt = locale === "ro" ? "ro-RO" : "en-GB";
  const d = INSTRUMENTE_UI_DICT[locale].comun.multumiri;
  const dataFmt = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(fmt, { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Bucharest" });
  const restante = await multumiriRestanteAction(orgSlug).catch(() => []);
  if (restante.length === 0) return null;
  return (
    <Card>
      <CardHeader title={d.titlu} subtitle={d.subtitlu(restante.length)} />
      <ul className="divide-y divide-[var(--ci-border)]">
        {restante.map((r) => (
          <li key={r.companyId} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-[var(--ci-text)]">{r.firma}</p>
              <p className="text-[11.5px] text-[var(--ci-text-muted)]">{d.rand(r.suma.toLocaleString(fmt), dataFmt(r.data), r.zile)}</p>
            </div>
            <Link href={`/${orgSlug}/crm/instrumente/scrisori/generator?firma=${r.companyId}`} prefetch={false} className="inline-flex min-h-9 shrink-0 items-center rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
              {d.scrie}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
