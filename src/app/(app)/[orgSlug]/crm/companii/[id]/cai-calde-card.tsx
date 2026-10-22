import { Flame, HandCoins, HeartHandshake, Users } from "lucide-react";
import Link from "next/link";

import type { CaleCalda, TipCale } from "@/lib/cai-calde";

import { Card, CardHeader } from "../../components/ui/card";

// „Căi calde” pe fișa firmei: persoanele de contact ale firmei care sunt deja legate de organizație (donator, voluntar sau contact la un sponsor).
// O cale caldă face abordarea mult mai ușoară. Potrivirea pe e-mail sau telefon e sigură; pe nume e doar posibilă și se verifică înainte.
const META: Record<TipCale, { icon: typeof Flame; eticheta: string }> = {
  donator: { icon: HandCoins, eticheta: "Donator" },
  sponsor: { icon: HeartHandshake, eticheta: "Sponsor" },
  voluntar: { icon: Users, eticheta: "Voluntar" },
};

export function CaiCaldeCard({ orgSlug, cai }: { orgSlug: string; cai: CaleCalda[] }) {
  if (cai.length === 0) {
    return (
      <div className="rounded-[var(--ci-radius-card)] border border-dashed border-[var(--ci-border)] bg-[var(--ci-surface)] px-4 py-3 text-[12.5px] text-[var(--ci-text-muted)]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--ci-text)]">
          <Flame className="h-3.5 w-3.5" aria-hidden /> Căi calde:
        </span>{" "}
        nicio persoană de contact a firmei nu apare (încă) printre donatori, voluntari sau contactele sponsorilor. Verificarea se face pe e-mail și telefon (sigur) și pe nume (posibil).
      </div>
    );
  }
  const sigure = cai.filter((c) => c.incredere === "sigur").length;
  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-[var(--ci-primary)]" aria-hidden /> Căi calde ({cai.length})
          </span>
        }
        subtitle={`${sigure} ${sigure === 1 ? "potrivire sigură" : "potriviri sigure"} (e-mail sau telefon), restul posibile (după nume): verifică înainte să te bazezi pe ele.`}
      />
      <ul className="space-y-2">
        {cai.map((c, i) => {
          const { icon: Icon, eticheta } = META[c.tip];
          return (
            <li key={i} className="flex flex-col gap-1 rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] p-2.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ci-surface-2)]">
                <Icon className="h-4 w-4 text-[var(--ci-primary)]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-[var(--ci-text)]">{c.contactNume}</span>
                  {c.contactRol && <span className="text-[12px] text-[var(--ci-text-muted)]">{c.contactRol}</span>}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${c.incredere === "sigur" ? "bg-[var(--ci-green-soft)] text-[var(--ci-green)]" : "bg-[var(--ci-amber-soft)] text-[var(--ci-amber)]"}`}
                  >
                    {c.incredere === "sigur" ? `potrivire sigură · ${c.prin === "email" ? "e-mail" : "telefon"}` : "posibil · după nume"}
                  </span>
                </span>
                <span className="block text-[12.5px] text-[var(--ci-text-muted)]">
                  <span className="font-medium text-[var(--ci-text)]">{eticheta}:</span>{" "}
                  {c.tip === "sponsor" && c.companyId ? (
                    <Link prefetch={false} href={`/${orgSlug}/crm/companii/${c.companyId}`} className="hover:underline">
                      {c.detaliu} ↗
                    </Link>
                  ) : (
                    c.detaliu
                  )}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {c.contactEmail && (
                  <a href={`mailto:${c.contactEmail}`} className="rounded-md border border-[var(--ci-border)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
                    E-mail
                  </a>
                )}
                {c.contactTelefon && (
                  <a href={`tel:${c.contactTelefon.replace(/\s+/g, "")}`} className="rounded-md border border-[var(--ci-border)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
                    Sună
                  </a>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
