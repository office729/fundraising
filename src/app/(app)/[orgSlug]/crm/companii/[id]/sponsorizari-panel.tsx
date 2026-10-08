"use client";

import { Plus, PlusCircle, Split, Trash2, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { Input, Label, Select, Textarea } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/states";
import { formatData } from "../../lib/format";
import { useLocale } from "../../lib/locale-context";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import type { AlocareSponsorizare } from "@/lib/alocari-sponsorizare";
import { adaugaSponsorizare, seteazaAlocariSponsorizare, stergeSponsorizare } from "../actions";

type Sponsorizare = { id: string; suma: number; data: string; proiect: string | null; nota: string | null; alocari: AlocareSponsorizare[] | null };
export type CampanieOptiune = { id: string; titlu: string };

const lei = (n: number) => `${n.toLocaleString("ro-RO")} RON`;

// Rândurile de defalcare: cui a fost redirecționată suma (o campanie din platformă sau un destinatar liber) și cât.
function AlocariEditor({ suma, valoare, onChange, campanii }: { suma: number; valoare: AlocareSponsorizare[]; onChange: (v: AlocareSponsorizare[]) => void; campanii: CampanieOptiune[] }) {
  const alocat = valoare.reduce((s, a) => s + (Number(a.suma) || 0), 0);
  const ramas = suma - alocat;
  const schimba = (i: number, patch: Partial<AlocareSponsorizare>) => onChange(valoare.map((a, k) => (k === i ? { ...a, ...patch } : a)));

  return (
    <div className="space-y-2">
      {valoare.map((a, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_96px_32px] items-center gap-2">
          <div className="min-w-0 space-y-1">
            <Select
              value={a.tip === "campanie" && a.pageId ? a.pageId : "__altul"}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__altul") schimba(i, { tip: "altul", pageId: null, nume: a.tip === "campanie" ? "" : a.nume });
                else schimba(i, { tip: "campanie", pageId: v, nume: campanii.find((c) => c.id === v)?.titlu ?? "" });
              }}
              className="h-9 w-full text-[13px]"
            >
              <option value="__altul">Alt destinatar (scriu numele)</option>
              {campanii.map((c) => (
                <option key={c.id} value={c.id}>
                  Campanie: {c.titlu}
                </option>
              ))}
            </Select>
            {a.tip !== "campanie" && <Input value={a.nume} onChange={(e) => schimba(i, { nume: e.target.value })} placeholder="Cui ai redirecționat (nume caz / persoană / proiect)" className="h-9" />}
          </div>
          <Input type="number" min={1} value={a.suma || ""} onChange={(e) => schimba(i, { suma: Math.round(Number(e.target.value)) || 0 })} placeholder="RON" className="h-9" aria-label="Suma alocată" />
          <button type="button" onClick={() => onChange(valoare.filter((_, k) => k !== i))} title="Scoate rândul" className="flex h-9 w-8 items-center justify-center text-[var(--ci-text-faint)] hover:text-[var(--ci-red)]">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onChange([...valoare, { tip: "altul", pageId: null, nume: "", suma: ramas > 0 && valoare.length === 0 ? ramas : 0 }])}
          className="inline-flex min-h-8 items-center gap-1 text-[13px] font-medium text-[var(--ci-primary)] hover:underline"
        >
          <Plus className="h-3.5 w-3.5" /> Adaugă destinatar
        </button>
        <p className={`ci-tabular text-[12px] ${ramas < 0 ? "font-semibold text-[var(--ci-red)]" : "text-[var(--ci-text-muted)]"}`}>
          Alocat {lei(alocat)} din {lei(suma)} · {ramas < 0 ? `cu ${lei(-ramas)} peste` : `nealocat ${lei(ramas)}`}
        </p>
      </div>
    </div>
  );
}

export function SponsorizariPanel({ companyId, sponsorizari, campanii }: { companyId: string; sponsorizari: Sponsorizare[]; campanii: CampanieOptiune[] }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].detail.sponsorizari;
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [eroare, setEroare] = useState("");
  const [sterge, setSterge] = useState<string | null>(null);
  const [sumaNoua, setSumaNoua] = useState("");
  const [alocariNoi, setAlocariNoi] = useState<AlocareSponsorizare[]>([]);
  const [deFalcat, setDeFalcat] = useState<Sponsorizare | null>(null);
  const [alocariEdit, setAlocariEdit] = useState<AlocareSponsorizare[]>([]);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setEroare("");
    formData.set("alocari", JSON.stringify(alocariNoi));
    const r = await adaugaSponsorizare(orgSlug, { error: null }, formData);
    setPending(false);
    if (r.error) {
      setEroare(r.error);
      return;
    }
    setOpen(false);
    setSumaNoua("");
    setAlocariNoi([]);
    router.refresh();
  }

  async function onSalveazaDefalcare() {
    if (!deFalcat) return;
    setPending(true);
    setEroare("");
    const r = await seteazaAlocariSponsorizare(orgSlug, deFalcat.id, alocariEdit);
    setPending(false);
    if (r.error) {
      setEroare(r.error);
      return;
    }
    setDeFalcat(null);
    router.refresh();
  }

  async function onSterge(id: string) {
    if (!window.confirm(dict.confirmaStergere)) return;
    setSterge(id);
    await stergeSponsorizare(orgSlug, id, companyId);
    setSterge(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setOpen(true)}>
          <PlusCircle className="h-3.5 w-3.5" /> {dict.sponsorizareNoua}
        </Button>
      </div>

      {sponsorizari.length === 0 ? (
        <EmptyState title={dict.niciunaInca.title} description={dict.niciunaInca.description} />
      ) : (
        <div className="space-y-2">
          {sponsorizari.map((s) => {
            const alocat = (s.alocari ?? []).reduce((t, a) => t + a.suma, 0);
            return (
              <div key={s.id} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-3.5 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[var(--ci-text)]">
                      {formatData(s.data)} {s.proiect && <span className="font-normal text-[var(--ci-text-muted)]">· {s.proiect}</span>}
                    </p>
                    {s.nota && <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">{s.nota}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="ci-tabular text-[14px] font-semibold text-[var(--ci-text)]">{lei(s.suma)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEroare("");
                        setAlocariEdit(s.alocari ?? []);
                        setDeFalcat(s);
                      }}
                      title="Defalcă suma — cui a fost redirecționată"
                      className="flex min-h-8 items-center gap-1 text-[12px] font-medium text-[var(--ci-primary)] hover:underline"
                    >
                      <Split className="h-3.5 w-3.5" /> Defalcă
                    </button>
                    <button
                      type="button"
                      onClick={() => onSterge(s.id)}
                      disabled={sterge === s.id}
                      title={dict.stergeTitle}
                      className="text-[var(--ci-text-faint)] hover:text-[var(--ci-red)] disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {s.alocari && s.alocari.length > 0 && (
                  <ul className="mt-2 space-y-0.5 border-t border-[var(--ci-border)] pt-2">
                    {s.alocari.map((a, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 text-[12px] text-[var(--ci-text-muted)]">
                        <span className="min-w-0 truncate">→ {a.tip === "campanie" ? `Campanie: ${a.nume}` : a.nume}</span>
                        <span className="ci-tabular shrink-0 font-medium text-[var(--ci-text)]">{lei(a.suma)}</span>
                      </li>
                    ))}
                    {s.suma - alocat > 0 && (
                      <li className="flex items-center justify-between gap-3 text-[12px] text-[var(--ci-text-faint)]">
                        <span>Nealocat</span>
                        <span className="ci-tabular">{lei(s.suma - alocat)}</span>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={dict.sponsorizareNoua} width="max-w-lg">
        <form action={onSubmit} className="space-y-3">
          <input type="hidden" name="companyId" value={companyId} />
          <div>
            <Label>{dict.suma}</Label>
            <Input type="number" name="suma" min={1} step={1} required autoFocus value={sumaNoua} onChange={(e) => setSumaNoua(e.target.value)} />
          </div>
          <div>
            <Label>{dict.data}</Label>
            <Input type="date" name="data" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div>
            <Label>{dict.proiect}</Label>
            <Input name="proiect" placeholder={dict.proiectPlaceholder} />
          </div>
          <div>
            <Label>Cui ai redirecționat suma? (opțional — toată sau parțial)</Label>
            <AlocariEditor suma={Math.round(Number(sumaNoua)) || 0} valoare={alocariNoi} onChange={setAlocariNoi} campanii={campanii} />
          </div>
          <div>
            <Label>{dict.nota}</Label>
            <Textarea name="nota" rows={2} />
          </div>
          {eroare && <p className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}
          <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {dict.anuleaza}
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? dict.seSalveaza : dict.adauga}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={deFalcat !== null} onClose={() => setDeFalcat(null)} title="Defalcă suma sponsorizării" width="max-w-lg">
        {deFalcat && (
          <div className="space-y-3">
            <p className="text-[13px] text-[var(--ci-text-muted)]">
              {formatData(deFalcat.data)} · {lei(deFalcat.suma)} — adaugă cui ai redirecționat suma, toată sau doar o parte.
            </p>
            <AlocariEditor suma={deFalcat.suma} valoare={alocariEdit} onChange={setAlocariEdit} campanii={campanii} />
            {eroare && <p className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}
            <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
              <Button type="button" variant="secondary" onClick={() => setDeFalcat(null)}>
                {dict.anuleaza}
              </Button>
              <Button type="button" variant="primary" onClick={onSalveazaDefalcare} disabled={pending}>
                {pending ? dict.seSalveaza : "Salvează defalcarea"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
