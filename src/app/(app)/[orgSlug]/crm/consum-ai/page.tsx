import Link from "next/link";

import { requireOrgAccess } from "@/lib/auth/guard";
import { ETICHETE_INSTRUMENT, eInstrumentAi, formatLei, formatUsd } from "@/lib/ai-org/consum";
import { AI_ORG_UI_DICT } from "@/lib/i18n/dictionaries/ai-org-ui";
import { getLocale } from "@/lib/i18n/get-locale";

import { Card, CardHeader } from "../components/ui/card";
import { obtineConsumAi } from "./actions";

export const dynamic = "force-dynamic";

// Consum AI: cât a costat AI-ul din contul Anthropic al organizației, pe instrument, pe zile și pe luni. Doar owner/admin.
export default async function ConsumAiPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const locale = await getLocale();
  const d = AI_ORG_UI_DICT[locale].pagina;
  if (access.role !== "owner" && access.role !== "admin") {
    return (
      <div className="mx-auto max-w-[900px]">
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{d.titlu}</h1>
        <p className="mt-2 text-[13px] text-[var(--ci-text-muted)]">{d.doarAdmin}</p>
      </div>
    );
  }
  const date = await obtineConsumAi(orgSlug);
  const usd = (v: number) => formatUsd(v, locale);
  const lei = (v: number) => formatLei(v, date.cursUsdRon, locale);
  const maxZi = Math.max(...date.zile.map((z) => z.costUsd), 0.000001);
  const nf = new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-GB");
  const fmtZi = (zi: string) => new Date(`${zi}T12:00:00Z`).toLocaleDateString(locale === "ro" ? "ro-RO" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const fmtLuna = (l: string) => new Date(`${l}-15T12:00:00Z`).toLocaleDateString(locale === "ro" ? "ro-RO" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="mx-auto max-w-[960px] space-y-6">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{d.titlu}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{d.subtitlu}</p>
      </div>

      {!date.conectat && (
        <div className="rounded-[var(--ci-radius-card)] bg-[var(--ci-amber-soft)] px-4 py-3 text-[13px] text-[var(--ci-text)]">
          <p>{d.faraCont}</p>
          <Link href={`/${orgSlug}/crm/setari#ai`} className="mt-1 inline-block font-medium underline">
            {d.deschideSetari}
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat eticheta={d.lunaCurenta} valoare={usd(date.luna.costUsd)} sub={lei(date.luna.costUsd)} />
        <Stat eticheta={d.estimareLuna} valoare={usd(date.estimareUsd)} sub={lei(date.estimareUsd)} />
        <Stat eticheta={d.apeluri} valoare={nf.format(date.luna.apeluri)} sub={date.luna.cautariWeb > 0 ? `${nf.format(date.luna.cautariWeb)} ${d.cautariWeb.toLowerCase()}` : null} />
        <Stat eticheta={d.costMediu} valoare={usd(date.costMediuUsd)} sub={lei(date.costMediuUsd)} />
      </div>

      <Card>
        <CardHeader title={d.buget} />
        {date.bugetUsd != null && date.procent != null ? (
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px] text-[var(--ci-text)]">
              <span>
                {usd(date.luna.costUsd)} / {usd(date.bugetUsd)} {lei(date.bugetUsd) ? <span className="text-[var(--ci-text-muted)]">({lei(date.bugetUsd)})</span> : null}
              </span>
              <strong>{d.consumat(date.procent)}</strong>
            </div>
            <div
              role="progressbar"
              aria-valuenow={Math.min(date.procent, 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={d.buget}
              className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--ci-surface-2)]"
            >
              <div className={`h-full rounded-full ${date.procent >= 100 ? "bg-red-600" : date.procent >= 80 ? "bg-amber-500" : "bg-[var(--ci-primary)]"}`} style={{ width: `${Math.min(date.procent, 100)}%` }} />
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-[var(--ci-text-muted)]">
            {d.faraBuget}.{" "}
            <Link href={`/${orgSlug}/crm/setari#ai`} className="font-medium underline">
              {d.setazaBuget}
            </Link>
          </p>
        )}
        <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">{d.notaBuget}</p>
      </Card>

      <Card>
        <CardHeader title={d.peInstrument} />
        {date.peInstrument.length === 0 ? (
          <p className="text-[13px] text-[var(--ci-text-muted)]">{d.faraConsum}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-[13px] text-[var(--ci-text)]">
              <thead className="text-[12px] text-[var(--ci-text-muted)]">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">{d.instrument}</th>
                  <th className="px-3 py-1.5 text-right font-medium">{d.costul}</th>
                  <th className="px-3 py-1.5 text-right font-medium">{d.generari}</th>
                  <th className="py-1.5 pl-3 text-right font-medium">{d.cautariWeb}</th>
                </tr>
              </thead>
              <tbody>
                {date.peInstrument.map((r) => (
                  <tr key={r.instrument} className="border-t border-[var(--ci-border)]">
                    <td className="py-2 pr-3">{eInstrumentAi(r.instrument) ? ETICHETE_INSTRUMENT[r.instrument][locale] : r.instrument}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{usd(r.costUsd)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{nf.format(r.apeluri)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums">{nf.format(r.cautariWeb)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title={d.ultimele31} />
        <div className="flex h-32 items-end gap-[3px]" role="img" aria-label={d.ultimele31}>
          {date.zile.map((z) => (
            <div key={z.zi} title={d.graficZi(fmtZi(z.zi), usd(z.costUsd), z.apeluri)} className="flex h-full min-w-0 flex-1 items-end">
              <div className={`w-full rounded-t-sm ${z.zi === date.azi ? "bg-[var(--ci-primary)]" : "bg-[var(--ci-primary)]/55"}`} style={{ height: `${z.costUsd > 0 ? Math.max(4, (z.costUsd / maxZi) * 100) : 1}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-[var(--ci-text-muted)]">
          <span>{fmtZi(date.zile[0].zi)}</span>
          <span>{fmtZi(date.zile[date.zile.length - 1].zi)}</span>
        </div>
      </Card>

      {date.luni.length > 0 && (
        <Card>
          <CardHeader title={d.pePeLuni} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-[13px] text-[var(--ci-text)]">
              <thead className="text-[12px] text-[var(--ci-text-muted)]">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">{d.luna}</th>
                  <th className="px-3 py-1.5 text-right font-medium">{d.costul}</th>
                  <th className="px-3 py-1.5 text-right font-medium">{d.generari}</th>
                  <th className="py-1.5 pl-3 text-right font-medium">{d.tokeni}</th>
                </tr>
              </thead>
              <tbody>
                {date.luni.map((l) => (
                  <tr key={l.luna} className="border-t border-[var(--ci-border)]">
                    <td className="py-2 pr-3 capitalize">{fmtLuna(l.luna)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{usd(l.costUsd)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{nf.format(l.apeluri)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums">
                      {nf.format(l.tokeniIn)} / {nf.format(l.tokeniOut)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ eticheta, valoare, sub }: { eticheta: string; valoare: string; sub: string | null }) {
  return (
    <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-4 py-3">
      <p className="text-[12px] text-[var(--ci-text-muted)]">{eticheta}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--ci-text)]">{valoare}</p>
      {sub && <p className="text-[12px] text-[var(--ci-text-muted)]">{sub}</p>}
    </div>
  );
}
