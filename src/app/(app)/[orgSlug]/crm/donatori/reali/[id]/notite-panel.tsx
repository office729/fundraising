"use client";

import { Check, Pencil, Trash2, X as XIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { ETICHETE_REZULTAT_APEL, ETICHETE_TIP_NOTA, REZULTATE_APEL, TIPURI_NOTA, esteTipNota, type RezultatApel, type TipNota } from "@/lib/cronologie-donator";

import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Select, Textarea } from "../../../components/ui/input";
import { EmptyState } from "../../../components/ui/states";
import { formatDataOra } from "../../../lib/format";
import { useLocale } from "../../../lib/locale-context";
import { DONATORI_REALI_DICT } from "@/lib/i18n/dictionaries/donatori-reali";
import { adaugaNotitaDonator, editeazaNotitaDonator, stergeNotitaDonator } from "../actions";

type Notita = { id: string; text: string; tip: string; rezultat: string | null; createdAt: Date; editatLa: Date | null; autorNume: string | null };

export function NotitePanelDonatorReal({ donatorId, notite }: { donatorId: string; notite: Notita[] }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const locale = useLocale();
  const dict = DONATORI_REALI_DICT[locale].detail.notite;
  const [text, setText] = useState("");
  const [tip, setTip] = useState<TipNota>("nota");
  const [rezultat, setRezultat] = useState<RezultatApel | "">("");
  const [pending, setPending] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);

  async function adauga() {
    if (!text.trim()) return;
    setPending(true);
    setEroare(null);
    const r = await adaugaNotitaDonator(orgSlug, donatorId, text, tip, tip === "apel" && rezultat ? rezultat : null);
    setPending(false);
    if (r.error) {
      setEroare(r.error);
      return;
    }
    setText("");
    setRezultat("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-[12px] font-semibold text-[var(--ci-text-muted)]">
            Ce adaugi
            <Select value={tip} onChange={(e) => setTip(esteTipNota(e.target.value) ? e.target.value : "nota")} className="mt-1 min-w-44">
              {TIPURI_NOTA.map((t) => (
                <option key={t} value={t}>
                  {ETICHETE_TIP_NOTA[t]}
                </option>
              ))}
            </Select>
          </label>
          {tip === "apel" && (
            <label className="block text-[12px] font-semibold text-[var(--ci-text-muted)]">
              Cum a decurs
              <Select value={rezultat} onChange={(e) => setRezultat(e.target.value as RezultatApel | "")} className="mt-1 min-w-44">
                <option value="">— alege —</option>
                {REZULTATE_APEL.map((r) => (
                  <option key={r} value={r}>
                    {ETICHETE_REZULTAT_APEL[r]}
                  </option>
                ))}
              </Select>
            </label>
          )}
        </div>
        <div className="flex gap-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={tip === "apel" ? "Ce ați discutat, ce urmează…" : dict.placeholder} rows={2} className="flex-1" aria-label={ETICHETE_TIP_NOTA[tip]} />
          <Button variant="primary" onClick={adauga} disabled={!text.trim() || pending}>
            {pending ? dict.seSalveaza : dict.adauga}
          </Button>
        </div>
        {eroare && (
          <p role="alert" className="text-[12.5px] text-[#9b1c1c]">
            {eroare}
          </p>
        )}
      </div>
      {notite.length === 0 ? (
        <EmptyState title={dict.niciunaInca} />
      ) : (
        <div className="space-y-2.5">
          {notite.map((n) => (
            <NotaCard key={n.id} orgSlug={orgSlug} nota={n} />
          ))}
        </div>
      )}
    </div>
  );
}

function NotaCard({ orgSlug, nota }: { orgSlug: string; nota: Notita }) {
  const router = useRouter();
  const locale = useLocale();
  const dict = DONATORI_REALI_DICT[locale].detail.notite;
  const [editare, setEditare] = useState(false);
  const [text, setText] = useState(nota.text);
  const [pending, setPending] = useState(false);
  const [sterge, setSterge] = useState(false);

  async function salveaza() {
    if (!text.trim()) return;
    setPending(true);
    const r = await editeazaNotitaDonator(orgSlug, nota.id, text);
    setPending(false);
    if (!r.error) {
      setEditare(false);
      router.refresh();
    }
  }

  async function sterge2() {
    if (!window.confirm(dict.confirmaStergere)) return;
    setSterge(true);
    await stergeNotitaDonator(orgSlug, nota.id);
    router.refresh();
  }

  return (
    <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3.5 shadow-[var(--ci-card-shadow)]">
      {editare ? (
        <div className="space-y-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} autoFocus />
          <div className="flex justify-end gap-1.5">
            <button
              onClick={() => {
                setText(nota.text);
                setEditare(false);
              }}
              aria-label={dict.anuleazaEditarea}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--ci-radius-btn)] text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={salveaza}
              disabled={pending}
              aria-label={dict.salveazaNotita}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--ci-radius-btn)] bg-[var(--ci-green-soft)] text-[var(--ci-green)] hover:opacity-80 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div>
            {(nota.tip !== "nota" || nota.rezultat) && (
              <p className="mb-1 flex flex-wrap items-center gap-1.5">
                <Badge tone="blue" icon={false}>
                  {esteTipNota(nota.tip) ? ETICHETE_TIP_NOTA[nota.tip] : "Notiță"}
                </Badge>
                {nota.rezultat && (
                  <Badge tone={nota.rezultat === "refuz" ? "red" : "neutral"} icon={false}>
                    {ETICHETE_REZULTAT_APEL[nota.rezultat as RezultatApel] ?? nota.rezultat}
                  </Badge>
                )}
              </p>
            )}
            <p className="text-[13px] whitespace-pre-wrap text-[var(--ci-text)]">{nota.text}</p>
            <p className="mt-1 text-[12px] text-[var(--ci-text-faint)]">
              {nota.autorNume || "—"} · {formatDataOra(nota.createdAt.toISOString())}
              {nota.editatLa && dict.editata}
            </p>
          </div>
          <div className="flex shrink-0 gap-0.5">
            <button onClick={() => setEditare(true)} aria-label={dict.editeazaNotita} className="rounded-[var(--ci-radius-btn)] p-1.5 text-[var(--ci-text-faint)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={sterge2} disabled={sterge} aria-label={dict.stergeNotita} className="rounded-[var(--ci-radius-btn)] p-1.5 text-[var(--ci-text-faint)] hover:bg-[var(--ci-red-soft)] hover:text-[var(--ci-red)] disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
