"use client";

import { ExternalLink, FileText, HeartHandshake, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Badge } from "../../components/ui/badge";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { formatSuma } from "../../lib/format";
import { useLocale } from "../../lib/locale-context";
import { INSTRUMENTE_DICT } from "@/lib/i18n/dictionaries/instrumente";
import { GalerieModele } from "./galerie-modele";
import { listeazaRaportCompaniiAction, type CompanieRaportRand } from "./raport-actions";

const ANUL_CURENT = new Date().getFullYear();
const ANI = Array.from({ length: 5 }, (_, i) => ANUL_CURENT - i);

const STATUS_TONE = { generat: "amber", trimis_canva: "green", eroare_canva: "red" } as const;

export function RaportCompaniiClient({
  orgSlug,
  initialAn,
  initial,
  galerie,
}: {
  orgSlug: string;
  initialAn: number;
  initial: CompanieRaportRand[];
  galerie: { organizatie: string; logoOng: string; culoare: string | null; azi: string };
}) {
  const router = useRouter();
  const locale = useLocale();
  const ro = locale !== "en";
  const dictRoot = INSTRUMENTE_DICT[locale];
  const dict = dictRoot.raportCompanii;
  const [an, setAn] = useState(initialAn);
  const [rows, setRows] = useState(initial);
  const [pending, start] = useTransition();

  const totalSponsorizat = useMemo(() => rows.reduce((s, r) => s + r.sumaSponsorizata, 0), [rows]);
  const rapoarteGenerate = rows.filter((r) => r.raport).length;

  const onSchimbaAn = (nou: number) => {
    setAn(nou);
    start(async () => setRows(await listeazaRaportCompaniiAction(orgSlug, nou)));
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div className="print:hidden">
        <Breadcrumb items={[{ label: dictRoot.breadcrumb, href: `/${orgSlug}/crm/instrumente` }, { label: dict.title }]} />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{ro ? "Raport de activitate companii" : "Company activity report"}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{ro ? `Rapoarte anuale pentru companiile sponsor — ${an}` : `Annual reports for sponsor companies — ${an}`}</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <select
            value={an}
            onChange={(e) => onSchimbaAn(Number(e.target.value))}
            className="h-9 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 text-sm text-[var(--ci-text)]"
          >
            {ANI.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <Button variant="primary" onClick={() => router.push(`/${orgSlug}/crm/instrumente/raport-companii/impact`)}>
            <HeartHandshake className="h-3.5 w-3.5" /> {ro ? "Raport de impact" : "Impact report"}
          </Button>
          <Button variant="secondary" onClick={() => router.push(`/${orgSlug}/crm/instrumente/raport-companii/documente-financiare`)}>
            <FileText className="h-3.5 w-3.5" /> {ro ? "Documente financiare" : "Financial documents"}
          </Button>
        </div>
      </div>

      <GalerieModele orgSlug={orgSlug} organizatie={galerie.organizatie} logoOng={galerie.logoOng} culoare={galerie.culoare} azi={galerie.azi} />

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-[12px] text-[var(--ci-text-muted)]">{ro ? "Sponsorizări totale" : "Total sponsorships"}</p>
          <p className="ci-tabular mt-1 text-lg font-bold text-[var(--ci-text)]">{formatSuma(totalSponsorizat)}</p>
        </Card>
        <Card>
          <p className="text-[12px] text-[var(--ci-text-muted)]">{ro ? "Rapoarte generate" : "Reports generated"}</p>
          <p className="ci-tabular mt-1 text-lg font-bold text-[var(--ci-text)]">
            {rapoarteGenerate} / {rows.length}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={ro ? "Companii sponsor" : "Sponsor companies"}
          subtitle={ro ? `${rows.length} companii cu sponsorizare în ${an}` : `${rows.length} companies with sponsorship in ${an}`}
        />
        {pending ? (
          <p className="text-[13px] text-[var(--ci-text-muted)]">{ro ? "Se încarcă…" : "Loading…"}</p>
        ) : rows.length === 0 ? (
          <p className="text-[13px] text-[var(--ci-text-muted)]">{ro ? "Nicio sponsorizare înregistrată în acest an." : "No sponsorship recorded this year."}</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.companyId} className="flex items-center justify-between gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-3.5 py-2.5">
                <div>
                  <p className="text-[13px] font-medium text-[var(--ci-text)]">{r.nume}</p>
                  {r.proiecte.length > 0 && <p className="text-[12px] text-[var(--ci-text-muted)]">{r.proiecte.join(", ")}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="ci-tabular text-[13px] font-semibold text-[var(--ci-text)]">{formatSuma(r.sumaSponsorizata)}</span>
                  {r.raport ? (
                    <>
                      <Badge tone={STATUS_TONE[r.raport.status]}>
                        {r.raport.status === "generat" ? (ro ? "Generat" : "Generated") : r.raport.status === "trimis_canva" ? "Canva" : ro ? "Eroare Canva" : "Canva error"}
                      </Badge>
                      {r.raport.canvaEditUrl && (
                        <a href={r.raport.canvaEditUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--ci-blue)]" title="Canva">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/${orgSlug}/crm/instrumente/raport-companii/impact?firma=${r.companyId}`)}>
                    <HeartHandshake className="h-3.5 w-3.5" /> {ro ? "Impact" : "Impact"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push(`/${orgSlug}/crm/instrumente/raport-companii/${r.companyId}/${an}`)}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> {r.raport ? (ro ? "Vezi raport" : "View report") : ro ? "Generează raport" : "Generate report"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
