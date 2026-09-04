"use client";

import { AlertTriangle, Building2, Download, ArrowRight, Trash2, Upload, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { ImportDialog } from "../components/import-dialog";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { downloadCsv, toCsv } from "../lib/export-csv";
import {
  clearAllLocalData,
  clearImportedCompanii,
  clearImportedDonatori,
  getImportedCompanii,
  getImportedDonatori,
  useLocalStoreValue,
} from "../lib/local-store";
import { useCompanii, useDonatori } from "../lib/use-data";
import { useLocale } from "../lib/locale-context";
import { INSTRUMENTE_DICT } from "@/lib/i18n/dictionaries/instrumente";

type CategorieKey = "rapoarte" | "organizare" | "campanii" | "generatoare";
type InstrumentDef = { key: string; href: string };

// Instrumentele reale din Control Tower-ul salveazaoinima.org.ro, reconstruite aici
// cu funcționalitate proprie pe datele demonstrative ale acestui produs (nu link
// extern, nu se conectează la datele reale) — la fel de utilizabile, izolate.
const CATEGORII: { key: CategorieKey; culoare: string; instrumente: InstrumentDef[] }[] = [
  {
    key: "rapoarte",
    culoare: "var(--ci-blue)",
    instrumente: [
      { key: "raportCompanii", href: "raport-companii" },
      { key: "onePager", href: "one-pager" },
      { key: "raportCaz", href: "raport-caz" },
    ],
  },
  {
    key: "organizare",
    culoare: "var(--ci-amber)",
    instrumente: [
      { key: "programLucru", href: "program-lucru" },
      { key: "planificatorIt", href: "planificator-it" },
    ],
  },
  {
    key: "campanii",
    culoare: "var(--ci-purple)",
    instrumente: [
      { key: "grupuriFacebook", href: "grupuri-facebook" },
      { key: "newsletterPf", href: "newsletter?aud=pf" },
      { key: "newsletterPj", href: "newsletter?aud=pj" },
      { key: "statisticiNewsletter", href: "statistici-newsletter" },
      { key: "comunicate", href: "comunicate" },
      { key: "radarDonatori", href: "radar-donatori" },
    ],
  },
  {
    key: "generatoare",
    culoare: "var(--ci-red)",
    instrumente: [
      { key: "carduriCaz", href: "carduri-caz" },
      { key: "carduriCazEn", href: "carduri-caz?lang=en" },
      { key: "bannereSms", href: "bannere-sms" },
    ],
  },
];

const EMPTY: unknown[] = [];

export default function InstrumentePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [importTip, setImportTip] = useState<"donatori" | "companii" | null>(null);
  const donatori = useDonatori();
  const companii = useCompanii();
  const importateDonatori = useLocalStoreValue(getImportedDonatori<unknown>, EMPTY);
  const importateCompanii = useLocalStoreValue(getImportedCompanii<unknown>, EMPTY);
  const locale = useLocale();
  const dict = INSTRUMENTE_DICT[locale].index;

  function golesteDonatoriImportati() {
    if (!importateDonatori.length) return;
    if (!window.confirm(dict.confirmStergerePF(importateDonatori.length))) return;
    clearImportedDonatori();
  }

  function golesteCompaniiImportate() {
    if (!importateCompanii.length) return;
    if (!window.confirm(dict.confirmStergerePJ(importateCompanii.length))) return;
    clearImportedCompanii();
  }

  function reseteazaTot() {
    if (!window.confirm(dict.confirmReset)) return;
    clearAllLocalData();
  }

  function exportaDonatori() {
    const csv = toCsv(donatori, [
      { key: "nume", header: dict.csv.nume },
      { key: "email", header: dict.csv.email },
      { key: "telefon", header: dict.csv.telefon },
      { key: "localitate", header: dict.csv.localitate },
      { key: "segment", header: dict.csv.segment },
      { key: "totalDonat", header: dict.csv.totalDonat },
      { key: "moneda", header: dict.csv.moneda },
      { key: "ultimaDonatieLa", header: dict.csv.ultimaDonatie },
      { key: "responsabil", header: dict.csv.responsabil },
    ]);
    downloadCsv(`persoane-fizice-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  function exportaCompanii() {
    const csv = toCsv(companii, [
      { key: "nume", header: dict.csv.companie },
      { key: "cui", header: dict.csv.cui },
      { key: "industrie", header: dict.csv.industrie },
      { key: "judet", header: dict.csv.judet },
      { key: "status", header: dict.csv.status },
      { key: "sumaSponsorizata", header: dict.csv.sponsorizat },
      { key: "responsabil", header: dict.csv.responsabil },
    ]);
    downloadCsv(`companii-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-8">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
      </div>

      {CATEGORII.map((cat) => {
        const catDict = dict.categorii[cat.key];
        return (
          <div key={cat.key}>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-[var(--ci-text)]">{catDict.nume}</h2>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--ci-surface-2)] px-1.5 text-[11px] font-semibold text-[var(--ci-text-muted)]">
                {cat.instrumente.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cat.instrumente.map((inst) => {
                const instDict = (catDict.instrumente as Record<string, { titlu: string; descriere: string }>)[inst.key];
                return (
                  <div key={inst.key} className="rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4 shadow-[var(--ci-shadow-sm)]">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: cat.culoare }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: cat.culoare }} /> {catDict.nume.split(" ")[0]}
                      </span>
                      <span className="rounded-full bg-[var(--ci-green-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ci-green)]">{dict.disponibil}</span>
                    </div>
                    <p className="text-[14px] font-semibold text-[var(--ci-text)]">{instDict.titlu}</p>
                    <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{instDict.descriere}</p>
                    <Link
                      href={`/${orgSlug}/crm/instrumente/${inst.href}`}
                      className="mt-3 flex items-center gap-1 text-[13px] font-medium text-[var(--ci-primary)] hover:underline"
                    >
                      {dict.deschide} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-[15px] font-bold text-[var(--ci-text)]">{dict.importExport}</h2>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--ci-surface-2)] px-1.5 text-[11px] font-semibold text-[var(--ci-text-muted)]">3</span>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title={dict.import.title} subtitle={dict.import.subtitle} />
            <div className="grid gap-3 sm:grid-cols-2">
              <ToolButton icon={Users} label={dict.import.importaPF} sub={dict.import.donatori} onClick={() => setImportTip("donatori")} />
              <ToolButton icon={Building2} label={dict.import.importaPJ} sub={dict.import.companii} onClick={() => setImportTip("companii")} />
            </div>
          </Card>

          <Card>
            <CardHeader title={dict.export.title} subtitle={dict.export.subtitle} />
            <div className="grid gap-3 sm:grid-cols-2">
              <ToolButton icon={Download} label={dict.export.exportaPF} sub={dict.export.randuri(donatori.length)} onClick={exportaDonatori} />
              <ToolButton icon={Download} label={dict.export.exportaPJ} sub={dict.export.randuri(companii.length)} onClick={exportaCompanii} />
            </div>
          </Card>

          <Card>
            <CardHeader title={dict.dateImportate.title} subtitle={dict.dateImportate.subtitle} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="secondary" onClick={golesteDonatoriImportati} disabled={!importateDonatori.length}>
                <Trash2 className="h-3.5 w-3.5" /> {dict.dateImportate.stergePF(importateDonatori.length)}
              </Button>
              <Button variant="secondary" onClick={golesteCompaniiImportate} disabled={!importateCompanii.length}>
                <Trash2 className="h-3.5 w-3.5" /> {dict.dateImportate.stergePJ(importateCompanii.length)}
              </Button>
            </div>
            <div className="mt-4 border-t border-[var(--ci-border)] pt-4">
              <div className="flex items-start gap-2 rounded-lg bg-[var(--ci-red-soft)] px-3.5 py-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ci-red)]" />
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-[var(--ci-red)]">{dict.dateImportate.resetareCompleta}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">{dict.dateImportate.resetareDesc}</p>
                  <Button variant="danger" size="sm" onClick={reseteazaTot} className="mt-2">
                    {dict.dateImportate.stergeTot}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {importTip && <ImportDialog open={!!importTip} onClose={() => setImportTip(null)} tip={importTip} />}
    </div>
  );
}

function ToolButton({
  icon: Icon,
  label,
  sub,
  onClick,
}: {
  icon: typeof Upload;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg border border-[var(--ci-border)] px-3.5 py-3 text-left transition-colors hover:border-[var(--ci-primary)] hover:bg-[var(--ci-primary-soft)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]">
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-[13px] font-medium text-[var(--ci-text)]">{label}</span>
        <span className="block text-[12px] text-[var(--ci-text-muted)]">{sub}</span>
      </span>
    </button>
  );
}
