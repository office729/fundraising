"use client";

import { CheckCircle2, Clock, Info, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { faraDiacritice } from "@/lib/cautare";
import { segmentFirma } from "@/lib/id-scurt";
import { FAZE_D177, STADII_D177 } from "@/lib/stadii-d177";

import { AddCompanyFormDialog } from "../companii/add-company-form-dialog";
import { Badge } from "../components/ui/badge";
import { Breadcrumb } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { salveazaDateD177, type RandD177 } from "./d177-actions";

const lei = (n: number | null) => (n == null ? "—" : `${n.toLocaleString("ro-RO")} lei`);
const dataRo = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
const ETICHETE_STADII: { k: string; eticheta: string }[] = FAZE_D177.flatMap((f) => f.etape.map((e) => ({ k: e.k as string, eticheta: e.eticheta as string })));

type Form = { suma: string; an: string; depusLa: string; incasat: boolean; incasatSuma: string; incasatLa: string };

// Companii D177: firmele care redirecționează o parte din impozitul pe profit către organizație (Declarația 177). Lista se
// alimentează SINGURĂ din bifa „D177” din CRM Companii; aici se urmărește ce e specific D177 — suma redirecționată, anul fiscal,
// depunerea declarației, stadiul contractului și banii intrați de la ANAF.
export function D177Client({ orgSlug, randuri }: { orgSlug: string; randuri: RandD177[] }) {
  const router = useRouter();
  const [cauta, setCauta] = useState("");
  const [stadiu, setStadiu] = useState("toate");
  const [bani, setBani] = useState<"toate" | "asteptati" | "intrati">("toate");
  const [an, setAn] = useState("toti");
  const [editat, setEditat] = useState<RandD177 | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [eroare, setEroare] = useState("");
  const [pending, start] = useTransition();
  const [adauga, setAdauga] = useState(false);

  const ani = useMemo(() => [...new Set(randuri.map((r) => r.date.an).filter((a): a is number => a != null))].sort((a, b) => b - a), [randuri]);
  const q = faraDiacritice(cauta.trim());
  const filtrate = useMemo(
    () =>
      randuri.filter((r) => {
        if (q && !faraDiacritice(r.nume).includes(q) && !(r.cui ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, "") || "§")) return false;
        if (stadiu !== "toate" && r.stadiu !== stadiu) return false;
        if (bani === "intrati" && !r.date.incasat) return false;
        if (bani === "asteptati" && r.date.incasat) return false;
        if (an !== "toti" && String(r.date.an ?? "") !== an) return false;
        return true;
      }),
    [randuri, q, stadiu, bani, an],
  );

  const deAsteptat = randuri.filter((r) => !r.date.incasat).reduce((s, r) => s + (r.date.suma ?? 0), 0);
  const intrat = randuri.filter((r) => r.date.incasat).reduce((s, r) => s + (r.date.incasatSuma ?? 0), 0);
  const semnate = randuri.filter((r) => r.stadiu === "semnat").length;

  function deschide(r: RandD177) {
    setEroare("");
    setEditat(r);
    setForm({
      suma: r.date.suma != null ? String(r.date.suma) : "",
      an: r.date.an != null ? String(r.date.an) : String(new Date().getFullYear()),
      depusLa: r.date.depusLa ?? "",
      incasat: r.date.incasat,
      incasatSuma: r.date.incasatSuma != null ? String(r.date.incasatSuma) : "",
      incasatLa: r.date.incasatLa ?? "",
    });
  }

  function salveaza() {
    if (!editat || !form) return;
    setEroare("");
    const nr = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
    start(async () => {
      const r = await salveazaDateD177(orgSlug, editat.id, {
        suma: nr(form.suma),
        an: nr(form.an),
        depusLa: form.depusLa || null,
        incasat: form.incasat,
        incasatSuma: nr(form.incasatSuma),
        incasatLa: form.incasatLa || null,
      });
      if (r.error) {
        setEroare(r.error);
        return;
      }
      setEditat(null);
      router.refresh();
    });
  }

  const plafon = editat?.impozit != null ? Math.round(editat.impozit * 0.2) : null;
  const sumaForm = form && form.suma.trim() ? Number(form.suma) : null;
  const pesteplafon = plafon != null && sumaForm != null && sumaForm > plafon;

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <Breadcrumb items={[{ label: "Companii D177" }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Companii D177</h1>
          <p className="mt-0.5 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">
            Firme care redirecționează o parte din impozitul pe profit către organizația ta (Declarația 177). Se adaugă singure aici când bifezi „D177” în CRM Companii.
          </p>
        </div>
        <Button variant="primary" onClick={() => setAdauga(true)}>
          <Plus className="h-3.5 w-3.5" /> Adaugă firmă D177
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <p className="text-[12px] text-[var(--ci-text-muted)]">Firme D177</p>
          <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{randuri.length}</p>
        </Card>
        <Card>
          <p className="text-[12px] text-[var(--ci-text-muted)]">De primit de la ANAF</p>
          <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-amber)]">{lei(deAsteptat)}</p>
        </Card>
        <Card>
          <p className="text-[12px] text-[var(--ci-text-muted)]">Intrat de la ANAF</p>
          <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-green)]">{lei(intrat)}</p>
        </Card>
        <Card>
          <p className="text-[12px] text-[var(--ci-text-muted)]">Contracte semnate</p>
          <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{semnate}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3">
        <Input value={cauta} onChange={(e) => setCauta(e.target.value)} placeholder="Caută firmă sau CUI…" className="h-9 w-full sm:w-64" />
        <Select value={stadiu} onChange={(e) => setStadiu(e.target.value)} className="h-9 w-full text-[13px] sm:w-52">
          <option value="toate">Toate stadiile</option>
          {STADII_D177.map((k) => (
            <option key={k} value={k}>
              {ETICHETE_STADII.find((e) => e.k === k)?.eticheta}
            </option>
          ))}
        </Select>
        <Select value={bani} onChange={(e) => setBani(e.target.value as typeof bani)} className="h-9 w-full text-[13px] sm:w-52">
          <option value="toate">Bani: toți</option>
          <option value="asteptati">Bani în așteptare</option>
          <option value="intrati">Bani intrați de la ANAF</option>
        </Select>
        <Select value={an} onChange={(e) => setAn(e.target.value)} className="h-9 w-full text-[13px] sm:w-36">
          <option value="toti">Toți anii</option>
          {ani.map((a) => (
            <option key={a} value={String(a)}>
              {a}
            </option>
          ))}
        </Select>
      </div>

      <Card padded={false}>
        {filtrate.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title={randuri.length === 0 ? "Nicio firmă D177 încă" : "Nicio firmă nu se potrivește filtrelor"}
              description={randuri.length === 0 ? "Bifează „D177” pe fișa unei firme în CRM Companii și apare aici automat." : "Încearcă alte filtre."}
            />
          </div>
        ) : (
          <div className="divide-y divide-[var(--ci-border)]">
            {filtrate.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0">
                  <Link prefetch={false} href={`/${orgSlug}/crm/companii/${segmentFirma(r.nume, r.id)}?tab=contract`} className="block truncate text-[13px] font-semibold text-[var(--ci-text)] hover:underline">
                    {r.nume}
                  </Link>
                  <p className="mt-0.5 truncate text-[12px] text-[var(--ci-text-muted)]">
                    {[r.cui && `CUI ${r.cui}`, r.judet, r.responsabil].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <Badge tone={r.stadiu === "semnat" ? "green" : r.stadiu === "nou" ? "neutral" : "blue"} icon={false}>
                    {r.stadiuEticheta}
                  </Badge>
                  <div className="text-right text-[12px]">
                    <p className="ci-tabular font-semibold text-[var(--ci-text)]">{lei(r.date.suma)}</p>
                    <p className="text-[var(--ci-text-faint)]">{r.date.an ? `an fiscal ${r.date.an}` : "an necompletat"}</p>
                  </div>
                  {r.date.incasat ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ci-green-soft)] px-2.5 py-1 text-[12px] font-semibold text-[var(--ci-green)]">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Intrat {lei(r.date.incasatSuma)} · {dataRo(r.date.incasatLa)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ci-amber-soft)] px-2.5 py-1 text-[12px] font-semibold text-[var(--ci-amber)]">
                      <Clock className="h-3.5 w-3.5" /> {r.date.depusLa ? `Depus ${dataRo(r.date.depusLa)} — așteptăm banii` : "În așteptare"}
                    </span>
                  )}
                  <button type="button" onClick={() => deschide(r)} className="flex min-h-9 items-center gap-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-[12px] font-semibold text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
                    <Pencil className="h-3.5 w-3.5" /> Date D177
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={editat !== null} onClose={() => setEditat(null)} title={editat ? `D177 — ${editat.nume}` : "D177"} width="max-w-md">
        {editat && form && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Suma redirecționată (lei)</Label>
                <Input type="number" min="0" inputMode="numeric" value={form.suma} onChange={(e) => setForm({ ...form, suma: e.target.value })} />
              </div>
              <div>
                <Label>An fiscal</Label>
                <Input type="number" min="2000" inputMode="numeric" value={form.an} onChange={(e) => setForm({ ...form, an: e.target.value })} />
              </div>
            </div>
            <div className="rounded-lg bg-[var(--ci-surface-2)] px-3 py-2 text-[12px] text-[var(--ci-text-muted)]">
              <p className="flex items-start gap-1.5">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {plafon != null ? (
                  <span>
                    Impozit pe profit din fișa firmei: <strong>{lei(editat.impozit)}</strong> · plafon de 20%: <strong>{lei(plafon)}</strong>.
                  </span>
                ) : (
                  <span>Completează „Impozit” în fișa firmei (tab Financiar) ca să vezi plafonul de 20% din impozitul pe profit.</span>
                )}
              </p>
              {pesteplafon && <p className="mt-1 font-semibold text-[var(--ci-red)]">Suma depășește 20% din impozitul pe profit al firmei — verifică.</p>}
            </div>
            <div>
              <Label>Data depunerii D177 (de către firmă)</Label>
              <Input type="date" value={form.depusLa} onChange={(e) => setForm({ ...form, depusLa: e.target.value })} />
            </div>

            <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3">
              <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-[var(--ci-text)]">
                <input type="checkbox" checked={form.incasat} onChange={(e) => setForm({ ...form, incasat: e.target.checked, incasatSuma: e.target.checked && !form.incasatSuma ? form.suma : form.incasatSuma })} className="h-4 w-4 accent-[var(--ci-green)]" />
                Au intrat banii de la ANAF
              </label>
              {form.incasat && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <Label>Suma intrată (lei)</Label>
                    <Input type="number" min="0" inputMode="numeric" value={form.incasatSuma} onChange={(e) => setForm({ ...form, incasatSuma: e.target.value })} />
                  </div>
                  <div>
                    <Label>Data intrării</Label>
                    <Input type="date" value={form.incasatLa} onChange={(e) => setForm({ ...form, incasatLa: e.target.value })} />
                  </div>
                  <p className="col-span-2 text-[11.5px] text-[var(--ci-text-faint)]">Suma se înregistrează automat în tabul Sponsorizări al firmei („D177 — ANAF”) și în totaluri.</p>
                </div>
              )}
            </div>

            {eroare && <p className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}
            <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
              <Button variant="secondary" onClick={() => setEditat(null)}>
                Anulează
              </Button>
              <Button variant="primary" onClick={salveaza} disabled={pending}>
                {pending ? "Se salvează…" : "Salvează"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <AddCompanyFormDialog open={adauga} onClose={() => setAdauga(false)} marcaje={["d177"]} onCreated={() => { setAdauga(false); router.refresh(); }} />
    </div>
  );
}