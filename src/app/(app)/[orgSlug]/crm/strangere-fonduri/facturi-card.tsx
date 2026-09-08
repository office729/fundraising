"use client";

import { useActionState, useEffect, useRef } from "react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { actualizeazaStatusFacturaAction, incarcaFacturaAction, stergeFacturaAction, type IncarcaFacturaState } from "./invoice-actions";

export type InvoiceRow = {
  id: string;
  denumire: string;
  suma: number;
  categorie: "factura" | "plata" | "chitanta" | "proforma";
  status: "achitata" | "in_asteptare";
  fisierUrl: string | null;
  createdAt: string;
};

const CATEGORIE_LABEL: Record<InvoiceRow["categorie"], string> = {
  factura: "Factură",
  plata: "Plată",
  chitanta: "Chitanță",
  proforma: "Proformă",
};

const INITIAL: IncarcaFacturaState = { error: null, ok: false };

export function FacturiCard({ orgSlug, pageId, facturi }: { orgSlug: string; pageId: string; facturi: InvoiceRow[] }) {
  const [state, formAction, pending] = useActionState(incarcaFacturaAction.bind(null, orgSlug, pageId), INITIAL);
  const submitted = useRef(false);
  useEffect(() => {
    if (submitted.current && !pending && !state.error) window.location.reload();
    if (pending) submitted.current = true;
  }, [pending, state]);

  const totalAchitat = facturi.filter((f) => f.status === "achitata").reduce((s, f) => s + f.suma, 0);

  async function comutaStatus(id: string, status: InvoiceRow["status"]) {
    await actualizeazaStatusFacturaAction(orgSlug, id, status === "achitata" ? "in_asteptare" : "achitata");
    window.location.reload();
  }

  async function sterge(id: string) {
    if (!window.confirm("Ștergi acest document financiar? Suma se va scădea din facturile achitate.")) return;
    await stergeFacturaAction(orgSlug, id);
    window.location.reload();
  }

  return (
    <Card>
      <CardHeader
        title="Situație financiară"
        subtitle={`Facturi/plăți achitate: ${totalAchitat.toLocaleString("ro-RO")} lei — sursa reală pentru soldul net al beneficiarului`}
      />
      <p className="text-[11.5px] text-[var(--ci-text-faint)]">Doar imagini (jpg, png, webp) — fotografiază documentul dacă e pe hârtie sau PDF.</p>
      <form action={formAction} className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--ci-border)] p-3 sm:grid-cols-3" encType="multipart/form-data">
        <input name="denumire" required placeholder="Denumire document" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm" />
        <input name="suma" type="number" min={1} step={1} required placeholder="Sumă (lei)" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm" />
        <select name="categorie" defaultValue="factura" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm">
          {Object.entries(CATEGORIE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select name="status" defaultValue="achitata" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm">
          <option value="achitata">Achitată</option>
          <option value="in_asteptare">În așteptare</option>
        </select>
        <input name="fisier" type="file" required accept=".jpg,.jpeg,.png,.webp" className="col-span-2 text-[12px] text-[var(--ci-text-muted)] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--ci-surface-2)] file:px-2.5 file:py-1.5 file:text-[12px] file:font-medium file:text-[var(--ci-text)] sm:col-span-1" />
        <Button type="submit" disabled={pending} className="justify-self-start">
          {pending ? "Se încarcă..." : "Încarcă document"}
        </Button>
      </form>
      {state.error && <p className="mt-2 text-[13px] text-red-600">{state.error}</p>}

      <div className="mt-4">
        {facturi.length ? (
          <div className="flex flex-col gap-2">
            {facturi.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-[var(--ci-text)]">{f.denumire}</span>
                    <Badge tone="neutral" icon={false}>
                      {CATEGORIE_LABEL[f.categorie]}
                    </Badge>
                  </div>
                  <p className="text-[12px] text-[var(--ci-text-muted)]">{f.suma.toLocaleString("ro-RO")} lei</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {f.fisierUrl && (
                    <a href={f.fisierUrl} target="_blank" rel="noreferrer" className="text-[12px] font-medium text-[var(--ci-primary)] hover:underline">
                      Vezi
                    </a>
                  )}
                  <button onClick={() => comutaStatus(f.id, f.status)} className="text-[12px]">
                    <Badge tone={f.status === "achitata" ? "green" : "amber"} icon={false}>
                      {f.status === "achitata" ? "Achitată" : "În așteptare"}
                    </Badge>
                  </button>
                  <button onClick={() => sterge(f.id)} className="text-[12px] text-red-600 hover:underline">
                    Șterge
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Niciun document financiar" description="Încarcă facturi, ordine de plată, chitanțe sau proforme pentru această campanie." />
        )}
      </div>
    </Card>
  );
}
