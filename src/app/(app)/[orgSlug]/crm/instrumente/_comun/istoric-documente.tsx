import Link from "next/link";

import { Card, CardHeader } from "../../components/ui/card";
import { listeazaDocumenteAction, type TipDoc } from "./documente-actions";
import { MarcheazaTrimis } from "./marcheaza-trimis";

const dataRo = (iso: string) => new Date(iso).toLocaleString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" });

// Ultimele documente exportate de organizație (sau ale unei firme): se pot redeschide, iar echipa bifează ce a plecat deja.
export async function IstoricDocumente({ orgSlug, tip, hrefGenerator, firmaId, titlu = "Documente recente", gol = true }: { orgSlug: string; tip: TipDoc; hrefGenerator: string; firmaId?: string; titlu?: string; gol?: boolean }) {
  const intrari = await listeazaDocumenteAction(orgSlug, tip, firmaId ?? null).catch(() => []);
  if (intrari.length === 0) {
    if (!gol) return null;
    return (
      <Card>
        <CardHeader title={titlu} subtitle="Documentele exportate apar aici, ca să le poți redeschide și să bifezi ce ai trimis. Niciun document încă." />
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader title={titlu} subtitle="Ultimele documente exportate de echipă. Le poți redeschide și modifica; bifează-le când au plecat." />
      <ul className="divide-y divide-[var(--ci-border)]">
        {intrari.slice(0, 8).map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-[var(--ci-text)]">{i.titlu || "Document"}</p>
              <p className="text-[11.5px] text-[var(--ci-text-muted)]">
                {dataRo(i.la)}
                {i.autor ? ` · ${i.autor}` : ""}
                {i.numar ? ` · ${i.numar}` : ""}
                {i.trimisLa ? ` · trimis ${dataRo(i.trimisLa)}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <MarcheazaTrimis orgSlug={orgSlug} tip={tip} id={i.id} trimis={i.stare === "trimis"} />
              <Link href={`${hrefGenerator}?doc=${i.id}${i.firmaId ? `&firma=${i.firmaId}` : ""}`} prefetch={false} className="inline-flex min-h-9 items-center rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
                Redeschide
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
