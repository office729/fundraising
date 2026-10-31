import Link from "next/link";

import { type NivelRisc } from "@/lib/analiza-donator";
import type { Locale } from "@/lib/i18n/config";
import { DONATORI_UI_DICT } from "@/lib/i18n/dictionaries/donatori-ui";

import { Badge, type StatusTone } from "../components/ui/badge";
import { Card, CardHeader } from "../components/ui/card";
import { formatariPf } from "./pf-format";
import type { ReactivareDonatori } from "./queries-risc";

const TON: Record<NivelRisc, StatusTone> = { scazut: "green", mediu: "amber", ridicat: "red", necunoscut: "neutral" };

// „Pe cine contactezi primul”: donatorii cu risc de pierdere, în ordinea în care merită contactați (riscul întâi, apoi valoarea anuală).
export function ReactivarePrioritara({ orgSlug, date, locale }: { orgSlug: string; date: ReactivareDonatori; locale: Locale }) {
  const ui = DONATORI_UI_DICT[locale];
  const t = ui.reactivare;
  const fmt = formatariPf(locale);
  const formatData = (iso: string) => new Intl.DateTimeFormat(fmt.tag, { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Bucharest" }).format(new Date(iso));
  return (
    <Card padded={false}>
      <div className="px-5 pt-5">
        <CardHeader
          title={t.titlu}
          subtitle={t.subtitlu}
        />
        <div className="grid grid-cols-2 gap-4 pb-4 sm:grid-cols-4">
          <Stat label={t.analizati} value={fmt.nr(date.total)} />
          <Stat label={t.riscRidicat} value={fmt.nr(date.laRisc)} />
          <Stat label={t.inIntarziere} value={fmt.nr(date.inIntarziere)} />
          <Stat label={t.valoarePeAnLaRisc} value={fmt.lei(date.valoareAnualaLaRisc)} />
        </div>
      </div>

      {date.top.length === 0 ? (
        <p className="border-t border-[var(--ci-border)] px-5 py-4 text-[13px] text-[var(--ci-text-muted)]">{t.niciunDonator}</p>
      ) : (
        <div className="overflow-x-auto border-t border-[var(--ci-border)]">
          <table className="w-full min-w-[640px] border-collapse text-[13px]">
            <thead>
              <tr className="text-left text-[11.5px] text-[var(--ci-text-muted)] uppercase">
                <th className="px-5 py-2 font-semibold">{t.donator}</th>
                <th className="px-3 py-2 font-semibold">{t.risc}</th>
                <th className="px-3 py-2 font-semibold">{t.ritm}</th>
                <th className="px-3 py-2 font-semibold">{t.eraAsteptata}</th>
                <th className="px-5 py-2 text-right font-semibold">{t.valoarePeAn}</th>
              </tr>
            </thead>
            <tbody>
              {date.top.map((r) => (
                <tr key={r.id} className="border-t border-[var(--ci-border)] hover:bg-[var(--ci-surface-2)]">
                  <td className="px-5 py-2.5">
                    <Link prefetch={false} href={`/${orgSlug}/crm/donatori/reali/${r.id}`} className="font-semibold text-[var(--ci-text)] hover:underline">
                      {r.nume}
                    </Link>
                    {r.telefon && <span className="ml-2 text-[12px] text-[var(--ci-text-muted)]">{r.telefon}</span>}
                    {r.dezabonat && <span className="ml-2 text-[11.5px] text-[var(--ci-text-faint)]">{t.dezabonat}</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={TON[r.analiza.risc]} icon={false}>
                      {r.analiza.eticheta}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-[var(--ci-text-muted)]">{ui.ritm(r.analiza.cadentaZile)}</td>
                  <td className="px-3 py-2.5 text-[var(--ci-text-muted)]">{r.analiza.urmatoareaAt ? formatData(r.analiza.urmatoareaAt) : "—"}</td>
                  <td className="ci-tabular px-5 py-2.5 text-right font-medium text-[var(--ci-text)]">{r.analiza.valoareAnuala != null ? fmt.lei(r.analiza.valoareAnuala) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] text-[var(--ci-text-muted)]">{label}</p>
      <p className="ci-tabular mt-0.5 text-[15px] font-semibold text-[var(--ci-text)]">{value}</p>
    </div>
  );
}
