"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { formateazaValoare, type DefinitieCamp, type EntitateCamp, type ValoriCamp } from "@/lib/campuri-personalizate";

import { salveazaCampuriFisa } from "../../setari/campuri-actions";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input, Label, Select, Textarea } from "./ui/input";

// Câmpurile personalizate ale organizației, în fișa unui donator sau a unei firme: se vad ca listă și se editează cu un clic. Se salvează doar câmpurile active.
export function CampuriPersonalizateCard({ entitate, idEntitate, defs, valori }: { entitate: EntitateCamp; idEntitate: string; defs: DefinitieCamp[]; valori: ValoriCamp }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const [editare, setEditare] = useState(false);
  const [ciorna, setCiorna] = useState<Record<string, string>>({});
  const [erori, setErori] = useState<Record<string, string>>({});
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (defs.length === 0) return null;

  const deschide = () => {
    setCiorna(Object.fromEntries(defs.map((d) => [d.cheie, valori[d.cheie] === undefined ? "" : d.tip === "da_nu" ? (valori[d.cheie] === true ? "da" : "nu") : String(valori[d.cheie])])));
    setErori({});
    setMesaj(null);
    setEditare(true);
  };

  async function salveaza() {
    setPending(true);
    setMesaj(null);
    const r = await salveazaCampuriFisa(orgSlug, entitate, idEntitate, ciorna);
    setPending(false);
    if (!r.ok) {
      setErori(r.erori);
      setMesaj(r.mesaj);
      return;
    }
    setEditare(false);
    router.refresh();
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="ci-display text-[15px] font-semibold text-[var(--ci-text)]">Câmpuri personalizate</h2>
        {!editare && (
          <Button className="min-h-10" onClick={deschide}>
            Editează
          </Button>
        )}
      </div>
      {!editare ? (
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {defs.map((d) => {
            const text = formateazaValoare(d, valori[d.cheie]);
            return (
              <div key={d.cheie}>
                <dt className="text-[12px] text-[var(--ci-text-muted)]">{d.eticheta}</dt>
                <dd className="mt-0.5 text-[14px] break-words whitespace-pre-wrap text-[var(--ci-text)]">{text || <span className="text-[var(--ci-text-faint)]">—</span>}</dd>
              </div>
            );
          })}
        </dl>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {defs.map((d) => {
              const id = `camp-${d.cheie}`;
              const eroare = erori[d.cheie];
              return (
                <div key={d.cheie} className={d.tip === "text" ? "sm:col-span-2" : ""}>
                  <Label htmlFor={id}>{d.eticheta}</Label>
                  {d.tip === "text" ? (
                    <Textarea id={id} rows={2} value={ciorna[d.cheie] ?? ""} maxLength={500} aria-invalid={Boolean(eroare)} onChange={(e) => setCiorna((c) => ({ ...c, [d.cheie]: e.target.value }))} />
                  ) : d.tip === "alegere" || d.tip === "da_nu" ? (
                    <Select id={id} value={ciorna[d.cheie] ?? ""} aria-invalid={Boolean(eroare)} onChange={(e) => setCiorna((c) => ({ ...c, [d.cheie]: e.target.value }))}>
                      <option value="">—</option>
                      {d.tip === "da_nu" ? (
                        <>
                          <option value="da">Da</option>
                          <option value="nu">Nu</option>
                        </>
                      ) : (
                        d.optiuni.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))
                      )}
                    </Select>
                  ) : (
                    <Input id={id} type={d.tip === "data" ? "date" : "text"} inputMode={d.tip === "numar" ? "decimal" : undefined} value={ciorna[d.cheie] ?? ""} aria-invalid={Boolean(eroare)} onChange={(e) => setCiorna((c) => ({ ...c, [d.cheie]: e.target.value }))} />
                  )}
                  {eroare && (
                    <p role="alert" className="mt-1 text-[12.5px] text-[#9b1c1c]">
                      {eroare}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {mesaj && !Object.keys(erori).length && (
            <p role="alert" className="text-[12.5px] text-[#9b1c1c]">
              {mesaj}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" className="min-h-11" loading={pending} onClick={salveaza}>
              Salvează
            </Button>
            <Button className="min-h-11" disabled={pending} onClick={() => setEditare(false)}>
              Renunță
            </Button>
          </div>
          <p className="text-[12px] text-[var(--ci-text-muted)]">Un câmp lăsat gol se șterge. Definești câmpurile în Setări → Câmpuri personalizate.</p>
        </div>
      )}
    </Card>
  );
}
