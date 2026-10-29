import Link from "next/link";
import { notFound } from "next/navigation";

import { requireOrgAccess, withOrgSession } from "@/lib/auth/guard";
import { esteUuid, ETICHETE_CANAL, ETICHETE_METODA, ETICHETE_TIP, etichetaSursa } from "@/lib/atribuire/clasificare";
import { incarcaIstoricVizitator } from "@/lib/atribuire/rapoarte";

import { Badge } from "../../../components/ui/badge";
import { Breadcrumb } from "../../../components/ui/breadcrumb";
import { Card, CardHeader } from "../../../components/ui/card";
import { formatSuma } from "../../../lib/format";

export const dynamic = "force-dynamic";

const incarca = withOrgSession(async (ctx, id: string) => incarcaIstoricVizitator(ctx.db, ctx.orgId, id));
const dataOra = (iso: string) => new Date(iso).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const TIP_EVENIMENT: Record<string, string> = { vizita: "Vizită", click_doneaza: "Clic pe „Donează”", start_donatie: "A început donația", start_formular: "A început formularul", lead: "Lead", inscriere_pornita: "A început înscrierea" };
const STARE: Record<string, string> = { reusita: "Confirmată", in_asteptare: "În așteptare", esuata: "Eșuată", rambursata: "Rambursată", trimis: "Formular trimis" };

// Istoricul observat al unui vizitator pseudonim: sesiunile, acțiunile și conversiile cu atribuirea lor. Doar proprietar/administrator.
// Nu conține nume sau date de contact: persoana apare ca ID pseudonim; legătura spre donatorul din CRM există doar când donația are o adresă de email asociată.
export default async function VizitatorPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params;
  const access = await requireOrgAccess(orgSlug);
  if (access.role !== "owner" && access.role !== "admin") {
    return (
      <div className="mx-auto max-w-[900px]">
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Istoric vizitator</h1>
        <p className="mt-2 text-[13px] text-[var(--ci-text-muted)]">Doar proprietarul sau administratorii organizației văd istoricul vizitatorilor identificabili.</p>
      </div>
    );
  }
  if (!esteUuid(id)) notFound();
  const h = await incarca(orgSlug, id);
  if (!h) notFound();

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <Breadcrumb items={[{ label: "Statistici și surse", href: `/${orgSlug}/crm/surse` }, { label: `Vizitator ${id.slice(0, 8)}…` }]} />
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Vizitator pseudonim <span className="font-mono text-[15px]">{id.slice(0, 8)}…</span></h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
          Persoană încă neidentificată, urmărită doar cu acordul pentru statistici. Nu se leagă de persoane după IP și nu se recunoaște între dispozitive: un alt telefon sau browser apare ca alt vizitator.
        </p>
      </div>

      <Card padded={false}>
        <div className="p-5 pb-3">
          <CardHeader title="Sesiuni" subtitle="Prima vizită și vizitele ulterioare, cu sursa fiecăreia." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead className="border-y border-[var(--ci-border)] bg-[var(--ci-surface-2)] text-left text-[12px] text-[var(--ci-text-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Început</th>
                <th className="px-3 py-2 font-medium">Sursă</th>
                <th className="px-3 py-2 font-medium">Canal</th>
                <th className="px-3 py-2 font-medium">Tip</th>
                <th className="px-3 py-2 font-medium">Campanie de marketing</th>
                <th className="px-3 py-2 font-medium">Conținut</th>
                <th className="px-3 py-2 font-medium">Cum am aflat</th>
              </tr>
            </thead>
            <tbody>
              {h.sesiuni.map((s, i) => (
                <tr key={s.sesiuneId} className="border-b border-[var(--ci-border)] last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap text-[var(--ci-text-muted)]">
                    {dataOra(s.la)} {i === 0 && <Badge tone="blue" icon={false}>Prima vizită</Badge>}
                  </td>
                  <td className="px-3 py-2 font-medium text-[var(--ci-text)]">{etichetaSursa(s.sursa)}{s.referrer ? <span className="font-normal text-[var(--ci-text-faint)]"> · {s.referrer}</span> : null}</td>
                  <td className="px-3 py-2">{ETICHETE_CANAL[s.canal].replace(" (organic sau plătit nedeterminat)", "")}</td>
                  <td className="px-3 py-2">{ETICHETE_TIP[s.tip]}</td>
                  <td className="px-3 py-2 text-[var(--ci-text-muted)]">{s.campanie || "—"}</td>
                  <td className="px-3 py-2 text-[var(--ci-text-muted)]">{s.continut || "—"}</td>
                  <td className="px-3 py-2 text-[var(--ci-text-muted)]">{ETICHETE_METODA[s.metoda as keyof typeof ETICHETE_METODA] ?? s.metoda}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card padded={false}>
        <div className="p-5 pb-3">
          <CardHeader title="Conversii și atribuirea lor" subtitle="Instantaneul salvat în clipa conversiei: prima sursă, sursa sesiunii și ultima sursă nedirectă." />
        </div>
        {h.conversii.length === 0 ? (
          <p className="px-5 pb-5 text-[13px] text-[var(--ci-text-muted)]">Acest vizitator nu a făcut încă o donație sau un formular.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead className="border-y border-[var(--ci-border)] bg-[var(--ci-surface-2)] text-left text-[12px] text-[var(--ci-text-muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Ce</th>
                  <th className="px-3 py-2 font-medium">Stare</th>
                  <th className="px-3 py-2 text-right font-medium">Sumă</th>
                  <th className="px-3 py-2 font-medium">Prima sursă</th>
                  <th className="px-3 py-2 font-medium">Sursa sesiunii</th>
                  <th className="px-3 py-2 font-medium">Ultima sursă nedirectă</th>
                </tr>
              </thead>
              <tbody>
                {h.conversii.map((c, i) => (
                  <tr key={i} className="border-b border-[var(--ci-border)] last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap text-[var(--ci-text-muted)]">{dataOra(c.la)}</td>
                    <td className="px-3 py-2">
                      {c.tip === "f230" ? "Formular 230" : "Donație"}
                      {c.donatorId && (
                        <Link prefetch={false} href={`/${orgSlug}/crm/donatori/reali/${c.donatorId}`} className="ml-2 text-[12px] text-[var(--ci-primary)] hover:underline">
                          fișa donatorului
                        </Link>
                      )}
                    </td>
                    <td className="px-3 py-2">{STARE[c.stare] ?? c.stare}</td>
                    <td className="px-3 py-2 text-right ci-tabular">{c.suma !== null ? formatSuma(c.suma) : "—"}</td>
                    <td className="px-3 py-2">{c.prima}</td>
                    <td className="px-3 py-2">{c.sesiune}</td>
                    <td className="px-3 py-2">{c.ultima}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card padded={false}>
        <div className="p-5 pb-3">
          <CardHeader title="Acțiuni observate" subtitle={`Ultimele ${h.evenimente.length} evenimente, în ordine cronologică.`} />
        </div>
        <ul className="divide-y divide-[var(--ci-border)] text-[13px]">
          {h.evenimente.map((e, i) => (
            <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-2">
              <span>
                <span className="font-medium text-[var(--ci-text)]">{TIP_EVENIMENT[e.tip] ?? e.tip}</span>
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
