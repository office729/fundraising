import Link from "next/link";

import { ritmInCuvinte, type NivelRisc } from "@/lib/analiza-donator";

import { Badge, type StatusTone } from "../components/ui/badge";
import { Card, CardHeader } from "../components/ui/card";
import { formatData, formatSuma } from "../lib/format";
import type { ReactivareDonatori } from "./queries-risc";

const TON: Record<NivelRisc, StatusTone> = { scazut: "green", mediu: "amber", ridicat: "red", necunoscut: "neutral" };

// „Pe cine contactezi primul”: donatorii cu risc de pierdere, în ordinea în care merită contactați (riscul întâi, apoi valoarea anuală).
export function ReactivarePrioritara({ orgSlug, date }: { orgSlug: string; date: ReactivareDonatori }) {
  return (
    <Card padded={false}>
      <div className="px-5 pt-5">
        <CardHeader
          title="Pe cine contactezi primul"
          subtitle="Analiză calculată în platformă din istoricul donațiilor, fără servicii externe: ritmul fiecărui donator, cât de mult a întârziat față de el și cât valorează pe an."
        />
        <div className="grid grid-cols-2 gap-4 pb-4 sm:grid-cols-4">
          <Stat label="Donatori analizați" value={date.total.toLocaleString("ro-RO")} />
          <Stat label="Risc ridicat" value={date.laRisc.toLocaleString("ro-RO")} />
          <Stat label="În întârziere" value={date.inIntarziere.toLocaleString("ro-RO")} />
          <Stat label="Valoare pe an la risc" value={formatSuma(date.valoareAnualaLaRisc, "lei")} />
        </div>
      </div>

      {date.top.length === 0 ? (
        <p className="border-t border-[var(--ci-border)] px-5 py-4 text-[13px] text-[var(--ci-text-muted)]">Niciun donator cu risc de pierdere acum. Lista se actualizează singură pe măsură ce intră donații.</p>
      ) : (
        <div className="overflow-x-auto border-t border-[var(--ci-border)]">
          <table className="w-full min-w-[640px] border-collapse text-[13px]">
            <thead>
              <tr className="text-left text-[11.5px] text-[var(--ci-text-muted)] uppercase">
                <th className="px-5 py-2 font-semibold">Donator</th>
                <th className="px-3 py-2 font-semibold">Risc</th>
                <th className="px-3 py-2 font-semibold">Ritm</th>
                <th className="px-3 py-2 font-semibold">Era așteptată</th>
                <th className="px-5 py-2 text-right font-semibold">Valoare pe an</th>
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
                    {r.dezabonat && <span className="ml-2 text-[11.5px] text-[var(--ci-text-faint)]">dezabonat de la e-mail</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={TON[r.analiza.risc]} icon={false}>
                      {r.analiza.eticheta}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-[var(--ci-text-muted)]">{ritmInCuvinte(r.analiza.cadentaZile)}</td>
                  <td className="px-3 py-2.5 text-[var(--ci-text-muted)]">{r.analiza.urmatoareaAt ? formatData(r.analiza.urmatoareaAt) : "—"}</td>
                  <td className="ci-tabular px-5 py-2.5 text-right font-medium text-[var(--ci-text)]">{r.analiza.valoareAnuala != null ? formatSuma(r.analiza.valoareAnuala, "lei") : "—"}</td>
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
