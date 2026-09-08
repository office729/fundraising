import { Badge } from "../components/ui/badge";
import { Card, CardHeader } from "../components/ui/card";

export type LocalGroupRow = { id: string; nume: string; platforma: "facebook" | "whatsapp" | "altul"; link: string; localitate: string | null };

const PLATFORMA_LABEL: Record<LocalGroupRow["platforma"], string> = { facebook: "Facebook", whatsapp: "WhatsApp", altul: "Altul" };

export function GrupuriLocaleCard({ orgSlug, grupuri, publicateIds }: { orgSlug: string; grupuri: LocalGroupRow[]; publicateIds: string[] }) {
  return (
    <Card>
      <CardHeader title="Grupuri locale recomandate" subtitle="Vizibile beneficiarului, filtrate pe județul campaniei" />
      {grupuri.length ? (
        <div className="flex flex-col gap-2">
          {grupuri.map((g) => (
            <div key={g.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
              <div className="min-w-0">
                <a href={g.link} target="_blank" rel="noreferrer" className="truncate text-[13px] font-medium text-[var(--ci-text)] hover:underline">
                  {g.nume}
                </a>
                <p className="truncate text-[12px] text-[var(--ci-text-muted)]">
                  {PLATFORMA_LABEL[g.platforma]}
                  {g.localitate ? ` · ${g.localitate}` : ""}
                </p>
              </div>
              {publicateIds.includes(g.id) && (
                <Badge tone="green" icon={false}>
                  Beneficiarul a publicat
                </Badge>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--ci-border)] px-6 py-10 text-center">
          <p className="ci-display text-sm font-semibold text-[var(--ci-text)]">Niciun grup local pentru județul campaniei</p>
          <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">
            Adaugă grupuri din{" "}
            <a href={`/${orgSlug}/crm/presa-grupuri`} className="text-[var(--ci-primary)] hover:underline">
              Presă & grupuri locale
            </a>
            .
          </p>
        </div>
      )}
    </Card>
  );
}
