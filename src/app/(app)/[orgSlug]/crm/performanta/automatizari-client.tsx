"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PERFORMANTA_UI5_DICT } from "@/lib/i18n/dictionaries/performanta-ui-5";
import type { RezultatRulare, SetariAutomatizari } from "@/lib/performanta-automatizari";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input, Label, Select } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { ruleazaAcumAction, salveazaSetariAction } from "./automatizari-actions";
import { dataOra } from "./ui-comune";

type Cheie = "termene" | "blocaje" | "actualizari" | "rezumat" | "riscManager" | "multumire" | "raportSponsor";

export function AutomatizariClient({ orgSlug, setari, angajati, admin }: { orgSlug: string; setari: SetariAutomatizari; angajati: { id: string; nume: string }[]; admin: boolean }) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI5_DICT[locale].automatizari;
  const REGULI = dict.reguli;
  const ZILE = dict.zile;
  const router = useRouter();
  const [s, setS] = useState<SetariAutomatizari>(setari);
  const [mesaj, setMesaj] = useState<{ t: string; eroare: boolean } | null>(null);
  const [rezultat, setRezultat] = useState<RezultatRulare | null>(null);
  const [pending, tr] = useTransition();
  const [rulare, trRulare] = useTransition();
  const set = <K extends keyof SetariAutomatizari>(k: K, v: SetariAutomatizari[K]) => setS((x) => ({ ...x, [k]: v }));

  function salveaza() {
    setMesaj(null);
    tr(async () => {
      const r = await salveazaSetariAction(orgSlug, { ...s });
      if (!r.ok) return setMesaj({ t: r.eroare, eroare: true });
      setMesaj({ t: dict.setariSalvate, eroare: false });
      router.refresh();
    });
  }

  const ru = setari.ultimaRulare;
  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-[13px] text-[var(--ci-text-muted)]">
        {dict.intro}
        {!admin && dict.doarAdmin}
      </p>

      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {REGULI.map((r) => (
          <li key={r.cheie}>
            <Card className="h-full">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" className="mt-1 size-4" disabled={!admin} checked={s[r.cheie as Cheie]} onChange={(e) => set(r.cheie as Cheie, e.target.checked)} />
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-[var(--ci-text)]">{r.titlu}</span>
                  <span className="mt-0.5 block text-[13px] text-[var(--ci-text-muted)]">{r.ce}</span>
                </span>
              </label>
              <dl className="mt-2.5 space-y-1 pl-7 text-[12px] text-[var(--ci-text-muted)]">
                <div>
                  <dt className="inline font-medium text-[var(--ci-text)]">{dict.cinePrimeste}</dt>
                  <dd className="inline">{r.cine}</dd>
                </div>
                <div>
                  <dt className="inline font-medium text-[var(--ci-text)]">{dict.faraRepetari}</dt>
                  <dd className="inline">{r.repetari}</dd>
                </div>
              </dl>
              {r.cheie === "rezumat" && (
                <div className="mt-3 pl-7">
                  <Label htmlFor="a-zi">{dict.ziuaRezumatului}</Label>
                  <Select id="a-zi" className="!w-auto min-w-36" disabled={!admin} value={s.ziRezumat} onChange={(e) => set("ziRezumat", Number(e.target.value))}>
                    {ZILE.map((z, i) => (
                      <option key={z} value={i + 1}>
                        {z}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {r.cheie === "multumire" && (
                <div className="mt-3 grid gap-2 pl-7 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="a-prag">{dict.pragul}</Label>
                    <Input id="a-prag" type="number" min={1} disabled={!admin} value={s.pragMultumire} onChange={(e) => set("pragMultumire", Number(e.target.value))} />
                  </div>
                  <div>
                    <Label htmlFor="a-rm">{dict.cineMultumeste}</Label>
                    <Select id="a-rm" disabled={!admin} value={s.responsabilMultumireId ?? ""} onChange={(e) => set("responsabilMultumireId", e.target.value || null)}>
                      <option value="">{dict.alege}</option>
                      {angajati.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nume}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}
              {r.cheie === "raportSponsor" && (
                <div className="mt-3 pl-7">
                  <Label htmlFor="a-rr">{dict.cinePregateste}</Label>
                  <Select id="a-rr" className="!w-auto min-w-52" disabled={!admin} value={s.responsabilRaportId ?? ""} onChange={(e) => set("responsabilRaportId", e.target.value || null)}>
                    <option value="">{dict.alege}</option>
                    {angajati.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nume}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        {admin && (
          <>
            <Button variant="primary" loading={pending} onClick={salveaza}>
              {dict.salveazaSetarile}
            </Button>
            <Button
              loading={rulare}
              onClick={() =>
                trRulare(async () => {
                  setMesaj(null);
                  const r = await ruleazaAcumAction(orgSlug);
                  if (!r.ok) return setMesaj({ t: r.eroare, eroare: true });
                  setRezultat(r.rezultat);
                  router.refresh();
                })
              }
            >
              {dict.ruleazaAcum}
            </Button>
          </>
        )}
        <p role="status" aria-live="polite" className={mesaj ? `text-[13px] ${mesaj.eroare ? "rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[var(--ci-red)]" : "text-[var(--ci-green)]"}` : "sr-only"}>
          {mesaj?.t ?? ""}
        </p>
      </div>
      {admin && <p className="text-[12px] text-[var(--ci-text-muted)]">{dict.notaRuleaza}</p>}

      {(rezultat || ru) && (
        <Card>
          <h3 className="ci-display text-[14px] font-semibold text-[var(--ci-text)]">{dict.ultimaRulare}{ru ? ` · ${dataOra(ru.la, locale)}` : ""}</h3>
          {(() => {
            const r = rezultat ?? ru!.rezumat;
            return (
              <ul className="mt-2 grid gap-x-6 gap-y-1 text-[13px] text-[var(--ci-text-muted)] sm:grid-cols-2">
                <li>{dict.rezTermene}<strong className="text-[var(--ci-text)]">{r.termene}</strong></li>
                <li>{dict.rezBlocaje}<strong className="text-[var(--ci-text)]">{r.blocaje}</strong></li>
                <li>{dict.rezActualizari}<strong className="text-[var(--ci-text)]">{r.actualizari}</strong></li>
                <li>{dict.rezRezumate}<strong className="text-[var(--ci-text)]">{r.rezumat}</strong></li>
                <li>{dict.rezRisc}<strong className="text-[var(--ci-text)]">{r.risc}</strong></li>
                <li>{dict.rezMultumiri}<strong className="text-[var(--ci-text)]">{r.multumiri}</strong></li>
                <li>{dict.rezRapoarte}<strong className="text-[var(--ci-text)]">{r.rapoarte}</strong></li>
              </ul>
            );
          })()}
        </Card>
      )}
    </div>
  );
}
