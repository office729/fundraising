import Link from "next/link";

import { Card, CardHeader } from "../../components/ui/card";
import { listeazaDocumenteAction, type TipDoc } from "./documente-actions";

const dataRo = (iso: string) => new Date(iso).toLocaleString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" });

// Ultimele documente exportate de organizație; „Redeschide” încarcă datele lor în generator.
export async function IstoricDocumente({ orgSlug, tip, hrefGenerator }: { orgSlug: string; tip: TipDoc; hrefGenerator: string }) {
  const intrari = await listeazaDocumenteAction(orgSlug, tip).catch(() => []);
  if (intrari.length === 0) return null;
  return (
    <Card>
      <CardHeader title="Documente recente" subtitle="Ultimele documente exportate de echipă. Le poți redeschide și modifica." />
      <ul className="divide-y divide-[var(--ci-border)]">
        {intrari.slice(0, 8).map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-[var(--ci-text)]">{i.titlu || "Document"}</p>
              <p className="text-[11.5px] text-[var(--ci-text-muted)]">
                {dataRo(i.la)}
                {i.autor ? ` · ${i.autor}` : ""}
                {i.numar ? ` · ${i.numar}` : ""}
              </p>
            </div>
            <Link href={`${hrefGenerator}?doc=${i.id}`} prefetch={false} className="shrink-0 rounded-[var(--ci-radius-btn,8px)] border border-[var(--ci-border)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-alt,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
              Redeschide
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
