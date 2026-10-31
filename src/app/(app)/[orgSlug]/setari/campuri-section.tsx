"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { LIMITE_CAMP, TIPURI_CAMP, esteTipCamp, type DefinitieCamp, type EntitateCamp, type TipCamp } from "@/lib/campuri-personalizate";
import { SETARI_API_UI_DICT } from "@/lib/i18n/dictionaries/setari-api-ui";

import { Badge } from "../crm/components/ui/badge";
import { Button } from "../crm/components/ui/button";
import { Card } from "../crm/components/ui/card";
import { Input, Label, Select, Textarea } from "../crm/components/ui/input";
import { useLocale } from "../crm/lib/locale-context";

import { actualizeazaCamp, adaugaCamp, seteazaActivCamp, type CampuriOrganizatie } from "./campuri-actions";

function Grup({ entitate, defs }: { entitate: EntitateCamp; defs: DefinitieCamp[] }) {
  const router = useRouter();
  const d0 = SETARI_API_UI_DICT[useLocale()].campuri;
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [pending, startTransition] = useTransition();
  const [eticheta, setEticheta] = useState("");
  const [tip, setTip] = useState<TipCamp>("text");
  const [optiuni, setOptiuni] = useState("");
  const [eroare, setEroare] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editEticheta, setEditEticheta] = useState("");
  const [editOptiuni, setEditOptiuni] = useState("");

  const ruleaza = (f: () => Promise<{ ok: boolean; mesaj?: string }>, laGata?: () => void) =>
    startTransition(async () => {
      setEroare(null);
      const r = await f();
      if (!r.ok) {
        setEroare(r.mesaj ?? d0.nuAmSalvat);
        return;
      }
      laGata?.();
      router.refresh();
    });

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-[var(--ci-text)]">{d0.titluGrup[entitate]}</h3>
      {defs.length === 0 ? (
        <p className="mt-1 text-[12.5px] text-[var(--ci-text-muted)]">{d0.niciunCamp}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {defs.map((d) => (
            <li key={d.id} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3">
              {editId === d.id ? (
                <div className="space-y-2">
                  <div>
                    <Label htmlFor={`edit-${d.id}`}>{d0.nume}</Label>
                    <Input id={`edit-${d.id}`} value={editEticheta} maxLength={LIMITE_CAMP.maxEticheta} onChange={(e) => setEditEticheta(e.target.value)} />
                  </div>
                  {d.tip === "alegere" && (
                    <div>
                      <Label htmlFor={`opt-${d.id}`}>{d0.variante}</Label>
                      <Textarea id={`opt-${d.id}`} rows={4} value={editOptiuni} onChange={(e) => setEditOptiuni(e.target.value)} />
                      <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{d0.avertismentVariante}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="primary" className="min-h-11" loading={pending} onClick={() => ruleaza(() => actualizeazaCamp(orgSlug, d.id!, { eticheta: editEticheta, optiuni: editOptiuni }), () => setEditId(null))}>
                      {d0.salveaza}
                    </Button>
                    <Button className="min-h-11" disabled={pending} onClick={() => setEditId(null)}>
                      {d0.renunta}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-[var(--ci-text)]">
                      {d.eticheta}{" "}
                      <Badge tone={d.activ === false ? "neutral" : "green"} icon={false}>
                        {d.activ === false ? d0.arhivat : d0.activ}
                      </Badge>
                    </p>
                    <p className="text-[12px] text-[var(--ci-text-muted)]">
                      {d0.tipuri[d.tip]}
                      {d.tip === "alegere" ? `: ${d.optiuni.join(", ")}` : ""} · {d0.cheieApi} <code>{d.cheie}</code>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="min-h-10"
                      disabled={pending}
                      onClick={() => {
                        setEditId(d.id!);
                        setEditEticheta(d.eticheta);
                        setEditOptiuni(d.optiuni.join("\n"));
                      }}
                    >
                      {d0.editeaza}
                    </Button>
                    <Button className="min-h-10" disabled={pending} onClick={() => ruleaza(() => seteazaActivCamp(orgSlug, d.id!, d.activ === false))}>
                      {d.activ === false ? d0.reactiveaza : d0.arhiveaza}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 rounded-[var(--ci-radius-btn)] border border-dashed border-[var(--ci-border)] p-3">
        <p className="text-[12.5px] font-semibold text-[var(--ci-text)]">{d0.adaugaTitlu}</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`nou-${entitate}`}>{d0.nume}</Label>
            <Input id={`nou-${entitate}`} value={eticheta} maxLength={LIMITE_CAMP.maxEticheta} placeholder={d0.numePh} onChange={(e) => setEticheta(e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`tip-${entitate}`}>{d0.tip}</Label>
            <Select id={`tip-${entitate}`} value={tip} onChange={(e) => setTip(esteTipCamp(e.target.value) ? e.target.value : "text")}>
              {TIPURI_CAMP.map((t) => (
                <option key={t} value={t}>
                  {d0.tipuri[t]}
                </option>
              ))}
            </Select>
          </div>
          {tip === "alegere" && (
            <div className="sm:col-span-2">
              <Label htmlFor={`optiuni-${entitate}`}>{d0.variante2}</Label>
              <Textarea id={`optiuni-${entitate}`} rows={3} value={optiuni} onChange={(e) => setOptiuni(e.target.value)} />
            </div>
          )}
        </div>
        <div className="mt-3">
          <Button
            variant="primary"
            className="min-h-11"
            loading={pending}
            disabled={!eticheta.trim()}
            onClick={() =>
              ruleaza(
                () => adaugaCamp(orgSlug, { entitate, eticheta, tip, optiuni }),
                () => {
                  setEticheta("");
                  setOptiuni("");
                  setTip("text");
                },
              )
            }
          >
            {d0.adaugaBtn}
          </Button>
        </div>
      </div>
      {eroare && (
        <p role="alert" className="mt-2 rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[#9b1c1c]">
          {eroare}
        </p>
      )}
    </div>
  );
}

// Setări → Câmpuri personalizate: administratorii definesc câmpurile proprii ale organizației la donatori și la firme.
export function CampuriSection({ campuri }: { campuri: CampuriOrganizatie }) {
  const d0 = SETARI_API_UI_DICT[useLocale()].campuri;
  return (
    <Card>
      <h2 className="ci-display text-[15px] font-semibold text-[var(--ci-text)]">{d0.titlu}</h2>
      <p className="mt-1 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">{d0.intro}</p>
      <div className="mt-4 space-y-6">
        <Grup entitate="donator" defs={campuri.donator} />
        <Grup entitate="companie" defs={campuri.companie} />
      </div>
    </Card>
  );
}
