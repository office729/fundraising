"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { adaugaDonatorNou, getOptiuniDonatorNou, type OptiuniDonatorNou } from "../donatori/reali/adauga-actions";
import { COMPONENTE_UI_DICT } from "@/lib/i18n/dictionaries/componente-ui";
import { JUDETE } from "@/lib/judete";
import { useLocale } from "../lib/locale-context";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Input, Label, Select } from "./ui/input";

const GOL = { nume: "", email: "", telefon: "", localitate: "", judet: "", responsabil: "", suma: "", moneda: "RON" as "RON" | "EUR", pageId: "" };

// Donator REAL (salvat pe server, apare în „Persoane fizice”). Dacă completezi suma, se înregistrează și donația, pe campania aleasă.
export function AddDonorDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string | null) => void }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const t = COMPONENTE_UI_DICT[useLocale()];
  const a = t.addDonor;
  const [v, setV] = useState(GOL);
  const [optiuni, setOptiuni] = useState<OptiuniDonatorNou | null>(null);
  const [pending, setPending] = useState(false);
  const [eroare, setEroare] = useState("");
  const set = (k: keyof typeof GOL, val: string) => setV((p) => ({ ...p, [k]: val }));

  useEffect(() => {
    if (!open || optiuni) return;
    // Amânat după randare: o acțiune de server apelată direct din efectul de la montare dă eroarea React #441.
    const timer = setTimeout(() => {
      getOptiuniDonatorNou(orgSlug)
        .then(setOptiuni)
        .catch(() => setOptiuni({ campanii: [], responsabili: [] }));
    }, 0);
    return () => clearTimeout(timer);
  }, [open, optiuni, orgSlug]);

  function inchide() {
    setV(GOL);
    setEroare("");
    onClose();
  }

  async function salveaza() {
    setPending(true);
    setEroare("");
    const sumaNr = v.suma.trim() ? Number(v.suma.replace(",", ".")) : null;
    const r = await adaugaDonatorNou(orgSlug, {
      nume: v.nume,
      email: v.email,
      telefon: v.telefon,
      localitate: v.localitate,
      judet: v.judet,
      responsabil: v.responsabil,
      suma: sumaNr,
      moneda: v.moneda,
      pageId: v.pageId || null,
    });
    setPending(false);
    if (r.error) {
      setEroare(r.error);
      return;
    }
    setV(GOL);
    onClose();
    onCreated(r.id ?? null);
  }

  const aSuma = v.suma.trim() !== "";
  return (
    <Dialog open={open} onClose={inchide} title={a.titlu} width="max-w-md">
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>{a.nume}</Label>
            <Input autoFocus value={v.nume} onChange={(e) => set("nume", e.target.value)} placeholder={a.numePh} />
          </div>
          <div className="sm:col-span-2">
            <Label>{a.email}</Label>
            <Input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} placeholder={a.emailPh} />
          </div>
          <div>
            <Label>{a.telefon}</Label>
            <Input value={v.telefon} onChange={(e) => set("telefon", e.target.value)} placeholder={a.telefonPh} />
          </div>
          <div>
            <Label>{a.localitate}</Label>
            <Input value={v.localitate} onChange={(e) => set("localitate", e.target.value)} placeholder={a.localitatePh} />
          </div>
          <div>
            <Label>{a.judet}</Label>
            <Select value={v.judet} onChange={(e) => set("judet", e.target.value)}>
              <option value="">—</option>
              {JUDETE.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{a.responsabil}</Label>
            <Select value={v.responsabil} onChange={(e) => set("responsabil", e.target.value)}>
              <option value="">—</option>
              {(optiuni?.responsabili ?? []).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3">
          <p className="mb-2 text-[12px] font-bold tracking-wide text-[var(--ci-text-muted)] uppercase">{a.donatie}</p>
          <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
            <div>
              <Label>{a.suma}</Label>
              <Input type="number" min="1" step="any" inputMode="decimal" value={v.suma} onChange={(e) => set("suma", e.target.value)} placeholder={a.sumaPh} />
            </div>
            <div>
              <Label>{a.moneda}</Label>
              <Select value={v.moneda} onChange={(e) => set("moneda", e.target.value)}>
                <option value="RON">RON</option>
                <option value="EUR">EUR</option>
              </Select>
            </div>
          </div>
          <div className="mt-3">
            <Label>{a.campania}</Label>
            <Select value={v.pageId} onChange={(e) => set("pageId", e.target.value)}>
              <option value="">{aSuma ? a.alegeCampania : a.faraDonatie}</option>
              {(optiuni?.campanii ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titlu}
                </option>
              ))}
            </Select>
          </div>
          {v.moneda === "EUR" && aSuma && <p className="mt-2 text-[11.5px] text-[var(--ci-text-faint)]">{a.conversieEur}</p>}
        </div>

        {eroare && <p className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={inchide}>
            {t.comun.anuleaza}
          </Button>
          <Button variant="primary" onClick={salveaza} disabled={pending || !v.nume.trim() || !v.email.trim() || (aSuma && !v.pageId)}>
            {pending ? t.comun.seSalveaza : t.comun.salveaza}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}