import Link from "next/link";
import { notFound } from "next/navigation";

import { requireOrgAccess, withOrgSession } from "@/lib/auth/guard";
import { esteUuid, etichetaSursa } from "@/lib/atribuire/clasificare";
import { incarcaIstoricVizitator } from "@/lib/atribuire/rapoarte";
import { etichetaSursaTr, SURSE_UI_DICT, traduEtichetaAtribuire } from "@/lib/i18n/dictionaries/surse-ui";
import { getLocale } from "@/lib/i18n/get-locale";

import { Badge } from "../../../components/ui/badge";
import { Breadcrumb } from "../../../components/ui/breadcrumb";
import { Card, CardHeader } from "../../../components/ui/card";
import { formatSuma } from "../../../lib/format";

export const dynamic = "force-dynamic";

const incarca = withOrgSession(async (ctx, id: string) => incarcaIstoricVizitator(ctx.db, ctx.orgId, id));

// Istoricul observat al unui vizitator pseudonim: sesiunile, acțiunile și conversiile cu atribuirea lor. Doar proprietar/administrator.
// Nu conține nume sau date de contact: persoana apare ca ID pseudonim; legătura spre donatorul din CRM există doar când donația are o adresă de email asociată.
export default async function VizitatorPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params;
  const locale = await getLocale();
  const d = SURSE_UI_DICT[locale];
  const v = d.vizitator;
  const dataOra = (iso: string) => new Date(iso).toLocaleString(d.numere, { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const access = await requireOrgAccess(orgSlug);
  if (access.role !== "owner" && access.role !== "admin") {
    return (
      <div className="mx-auto max-w-[900px]">
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{v.titluAcces}</h1>
        <p className="mt-2 text-[13px] text-[var(--ci-text-muted)]">{v.doarAdmin}</p>
      </div>
    );
  }
  if (!esteUuid(id)) notFound();
  const h = await incarca(orgSlug, id);
  if (!h) notFound();

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <Breadcrumb items={[{ label: d.titlu, href: `/${orgSlug}/crm/surse` }, { label: v.breadcrumb(id.slice(0, 8)) }]} />
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{v.h1} <span className="font-mono text-[15px]">{id.slice(0, 8)}…</span></h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
          {v.intro}
        </p>
      </div>

      <Card padded={false}>
        <div className="p-5 pb-3">
          <CardHeader title={v.sesiuni} subtitle={v.sesiuniSub} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead className="border-y border-[var(--ci-border)] bg-[var(--ci-surface-2)] text-left text-[12px] text-[var(--ci-text-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">{v.inceput}</th>
                <th className="px-3 py-2 font-medium">{v.sursa}</th>
                <th className="px-3 py-2 font-medium">{v.canal}</th>
                <th className="px-3 py-2 font-medium">{v.tip}</th>
                <th className="px-3 py-2 font-medium">{v.campMarketing}</th>
                <th className="px-3 py-2 font-medium">{v.continut}</th>
                <th className="px-3 py-2 font-medium">{v.cumAmAflat}</th>
              </tr>
            </thead>
            <tbody>
              {h.sesiuni.map((s, i) => (
                <tr key={s.sesiuneId} className="border-b border-[var(--ci-border)] last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap text-[var(--ci-text-muted)]">
                    {dataOra(s.la)} {i === 0 && <Badge tone="blue" icon={false}>{v.primaVizita}</Badge>}
                  </td>
                  <td className="px-3 py-2 font-medium text-[var(--ci-text)]">{etichetaSursaTr(locale, s.sursa, etichetaSursa)}{s.referrer ? <span className="font-normal text-[var(--ci-text-faint)]"> · {s.referrer}</span> : null}</td>
                  <td className="px-3 py-2">{d.canalScurt[s.canal]}</td>
                  <td className="px-3 py-2">{d.tip[s.tip]}</td>
                  <td className="px-3 py-2 text-[var(--ci-text-muted)]">{s.campanie || "—"}</td>
                  <td className="px-3 py-2 text-[var(--ci-text-muted)]">{s.continut || "—"}</td>
                  <td className="px-3 py-2 text-[var(--ci-text-muted)]">{d.metoda[s.metoda] ?? s.metoda}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card padded={false}>
        <div className="p-5 pb-3">
          <CardHeader title={v.conversiiTitlu} subtitle={v.conversiiSub} />
        </div>
        {h.conversii.length === 0 ? (
          <p className="px-5 pb-5 text-[13px] text-[var(--ci-text-muted)]">{v.nicioConversie}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead className="border-y border-[var(--ci-border)] bg-[var(--ci-surface-2)] text-left text-[12px] text-[var(--ci-text-muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium">{v.data}</th>
                  <th className="px-3 py-2 font-medium">{v.ce}</th>
                  <th className="px-3 py-2 font-medium">{v.stare}</th>
                  <th className="px-3 py-2 text-right font-medium">{v.suma}</th>
                  <th className="px-3 py-2 font-medium">{v.primaSursa}</th>
                  <th className="px-3 py-2 font-medium">{v.sursaSesiunii}</th>
                  <th className="px-3 py-2 font-medium">{v.ultimaSursa}</th>
                </tr>
              </thead>
              <tbody>
                {h.conversii.map((c, i) => (
                  <tr key={i} className="border-b border-[var(--ci-border)] last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap text-[var(--ci-text-muted)]">{dataOra(c.la)}</td>
                    <td className="px-3 py-2">
                      {c.tip === "f230" ? v.formular230 : v.donatie}
                      {c.donatorId && (
                        <Link prefetch={false} href={`/${orgSlug}/crm/donatori/reali/${c.donatorId}`} className="ml-2 text-[12px] text-[var(--ci-primary)] hover:underline">
                          {v.fisa}
                        </Link>
                      )}
                    </td>
                    <td className="px-3 py-2">{v.stari[c.stare] ?? c.stare}</td>
                    <td className="px-3 py-2 text-right ci-tabular">{c.suma !== null ? formatSuma(c.suma, undefined, locale) : "—"}</td>
                    <td className="px-3 py-2">{traduEtichetaAtribuire(locale, c.prima)}</td>
                    <td className="px-3 py-2">{traduEtichetaAtribuire(locale, c.sesiune)}</td>
                    <td className="px-3 py-2">{traduEtichetaAtribuire(locale, c.ultima)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card padded={false}>
        <div className="p-5 pb-3">
          <CardHeader title={v.actiuni} subtitle={v.actiuniSub(h.evenimente.length)} />
        </div>
        <ul className="divide-y divide-[var(--ci-border)] text-[13px]">
          {h.evenimente.map((e, i) => (
            <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-2">
              <span>
                <span className="font-medium text-[var(--ci-text)]">{v.evenimente[e.tip] ?? e.tip}</span>
                {e.pagina ? <span className="text-[var(--ci-text-muted)]"> · {e.pagina}</span> : e.cale ? <span className="text-[var(--ci-text-faint)]"> · {e.cale}</span> : null}
              </span>
              <span className="text-[12px] text-[var(--ci-text-faint)]">{dataOra(e.la)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
