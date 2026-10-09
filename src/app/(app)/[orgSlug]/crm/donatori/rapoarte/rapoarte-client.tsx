"use client";

import { BookmarkX, Download, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ETICHETE_CAMP_DATA, numarFiltreActive, parseFiltruPf, SEGMENTE_META } from "@/lib/donatori-pf-filtre";

import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/states";
import { stergeRaportPf, type RaportPf } from "../pf-actions";
import { dataRo } from "../pf-format";

// Descrierea pe înțelesul omului a unui raport: segmentele și numărul de filtre.
function rezumat(qs: string): string {
  const f = parseFiltruPf(new URLSearchParams(qs));
  const parti: string[] = [];
  if (f.seg.length) parti.push(f.seg.map((k) => SEGMENTE_META.find((s) => s.key === k)?.label ?? k).join(" + "));
  if (f.proiect) parti.push(`proiect: ${f.proiect}`);
  if (f.an) parti.push(`cohorta ${f.an}`);
  if (f.judet) parti.push(`județ: ${f.judet}`);
  if (f.dataDe || f.dataPana) parti.push(`${ETICHETE_CAMP_DATA[f.campData].toLowerCase()} ${f.dataDe || "…"} – ${f.dataPana || "…"}`);
  const alte = numarFiltreActive(f) - [f.proiect, f.an, f.judet, f.dataDe, f.dataPana].filter(Boolean).length;
  if (alte > 0) parti.push(`+ ${alte} filtre`);
  if (f.q) parti.push(`căutare: „${f.q}”`);
  return parti.join(" · ") || "Toți donatorii";
}

export function RapoarteClient({ orgSlug, rapoarte }: { orgSlug: string; rapoarte: RaportPf[] }) {
  const router = useRouter();
  const [eroare, setEroare] = useState("");

  async function sterge(r: RaportPf) {
    if (!window.confirm(`Ștergi raportul „${r.nume}”?`)) return;
    const rez = await stergeRaportPf(orgSlug, r.id);
    if (!rez.ok) setEroare(rez.eroare);
    else router.refresh();
  }

  const exporta = (qs: string) => {
    const a = document.createElement("a");
    a.href = `/api/${orgSlug}/donatori-export?${qs}${qs ? "&" : ""}canal=toate`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (rapoarte.length === 0) {
    return (
      <EmptyState
        icon={BookmarkX}
        title="Niciun raport salvat"
        description="În lista de donatori alege segmente și filtre, apoi apasă „Salvează raport”."
        action={
          <Link href={`/${orgSlug}/crm/donatori`} prefetch={false} className="text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
            Mergi la lista de donatori
          </Link>
        }
      />
    );
  }
  return (
    <div className="space-y-3">
      {eroare && (
        <p role="alert" className="rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
          {eroare}
        </p>
      )}
      {rapoarte.map((r) => (
        <Card key={r.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[14.5px] font-semibold text-[var(--ci-text)]">{r.nume}</p>
              <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">{rezumat(r.qs)}</p>
              <p className="mt-0.5 text-[11.5px] text-[var(--ci-text-faint)]">Salvat pe {dataRo(r.creat)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/${orgSlug}/crm/donatori${r.qs ? `?${r.qs}` : ""}`}
                prefetch={false}
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-3 text-[13px] font-medium text-white hover:bg-[var(--ci-primary-hover)]"
              >
                <ExternalLink className="size-4" aria-hidden /> Deschide
              </Link>
              <Button size="sm" onClick={() => exporta(r.qs)}>
                <Download className="size-4" aria-hidden /> Excel
              </Button>
              <Button size="sm" variant="ghost" aria-label={`Șterge raportul ${r.nume}`} onClick={() => sterge(r)}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
