"use client";

import { useState, useTransition } from "react";

import type { Locale } from "@/lib/i18n/config";
import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { PERFORMANTA_UI3_DICT } from "@/lib/i18n/dictionaries/performanta-ui-3";
import { PERFORMANTA_UI5_DICT } from "@/lib/i18n/dictionaries/performanta-ui-5";
import { METRICA_PE_ID } from "@/lib/performanta-metrici";
import { NOTA_CONFIRMAT, NOTA_EXEMPLU, type KrSablon, type SablonEfectiv } from "@/lib/performanta-sabloane";
import type { OptiuniPerformanta } from "@/lib/performanta-tipuri";

import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { aplicaSablonAction } from "./obiective-actions";

const tinta = (r: KrSablon, locale: Locale) => {
  const dict = PERFORMANTA_UI5_DICT[locale].sablonDialog;
  const u = r.unitate ? ` ${r.unitate}` : "";
  if (r.metoda === "binar") return dict.tintaBinar;
  if (r.metoda === "interval") return dict.tintaIntre(String(r.tinta), String(r.tintaMax), u);
  return `${r.metoda === "descrescator" ? dict.tintaCelMult : dict.tintaCelPutin} ${r.tinta?.toLocaleString(locale === "ro" ? "ro-RO" : "en-GB")}${u}`;
};

export function SablonDialog({ orgSlug, sabloane, optiuni, perioada, onClose, onGata }: { orgSlug: string; sabloane: SablonEfectiv[]; optiuni: OptiuniPerformanta; perioada: { start: string; end: string }; onClose: () => void; onGata: (t: string) => void }) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI5_DICT[locale].sablonDialog;
  const comune = PERFORMANTA_UI_DICT[locale].comune;
  const metriciEn = PERFORMANTA_UI3_DICT[locale].metrici;
  const etMetrica = (id: string | null | undefined) => metriciEn[id ?? ""]?.eticheta ?? METRICA_PE_ID.get(id ?? "")?.eticheta ?? id;
  const dataZi = (iso: string) => iso.split("-").reverse().join(locale === "ro" ? "." : "/");
  const [sablonId, setSablonId] = useState(sabloane[0].id);
  const [angajatId, setAngajatId] = useState(optiuni.euAngajatId ?? "");
  const [start, setStart] = useState(perioada.start);
  const [end, setEnd] = useState(perioada.end);
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, tr] = useTransition();
  const sablon = sabloane.find((s) => s.id === sablonId)!;

  function aplica() {
    if (!angajatId) return setEroare(dict.alegePersoana);
    setEroare(null);
    tr(async () => {
      const r = await aplicaSablonAction(orgSlug, { sablonId, angajatId, perioadaStart: start, perioadaEnd: end });
      if (!r.ok) return setEroare(r.eroare);
      onGata(r.create.length === 0 ? dict.nimicNou(r.sarite.length) : dict.create(r.create.length, r.sarite.length, sablon.confirmat));
    });
  }

  return (
    <Dialog open onClose={onClose} title={dict.titlu} width="max-w-3xl">
      <div className="space-y-4">
        {sablon.confirmat ? (
          <p className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-green-soft)] px-3 py-2 text-[13px] text-[var(--ci-green)]">
            {dict.confA}
            <strong>{dict.confB}</strong>
            {dict.confC(sablon.confirmatLa ? dataZi(sablon.confirmatLa) : null)}
          </p>
        ) : (
          <p className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] px-3 py-2 text-[13px] text-[var(--ci-amber)]">
            {dict.exA}
            <strong>{dict.exB}</strong>
            {dict.exC}
            <a href={`/${orgSlug}/crm/performanta/sabloane`} className="font-semibold underline">{dict.exLink}</a>
            {dict.exD}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="sb-rol">{dict.rol}</Label>
            <Select id="sb-rol" value={sablonId} onChange={(e) => setSablonId(e.target.value)}>
              {sabloane.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.rol}
                  {s.confirmat ? dict.tinteConfirmate : ""}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="sb-pers">{dict.pentruPersoana}</Label>
            <Select id="sb-pers" value={angajatId} onChange={(e) => setAngajatId(e.target.value)}>
              <option value="">{dict.alege}</option>
              {optiuni.angajati
                .filter((a) => a.activ)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nume}
                  </option>
                ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="sb-s">{dict.inceput}</Label>
            <Input id="sb-s" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="sb-e">{dict.sfarsit}</Label>
            <Input id="sb-e" type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>

        <section aria-label={dict.previzualizare}>
          <p className="mb-2 text-[13px] text-[var(--ci-text-muted)]">{sablon.rezumat}</p>
          <ul className="space-y-3">
            {sablon.obiective.map((o) => (
              <li key={o.titlu} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3">
                <p className="text-[14px] font-semibold text-[var(--ci-text)]">{o.titlu}</p>
                <p className="text-[12.5px] text-[var(--ci-text-muted)]">{o.descriere}</p>
                <ul className="mt-2 space-y-2">
                  {o.rezultate.map((r) => (
                    <li key={r.titlu} className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] p-2.5 text-[12.5px]">
                      <p className="font-medium text-[var(--ci-text)]">
                        {r.titlu} <span className="font-normal text-[var(--ci-text-muted)]">· {comune.metoda[r.metoda]?.eticheta.toLowerCase()} · {tinta(r, locale)}</span>
                        {r.metoda !== "binar" && <span className={`ml-2 rounded-full px-1.5 py-px text-[11px] font-medium ${sablon.confirmat ? "bg-[var(--ci-green-soft)] text-[var(--ci-green)]" : "bg-[var(--ci-amber-soft)] text-[var(--ci-amber)]"}`}>{sablon.confirmat ? dict.confirmat : dict.exemplu}</span>}
                      </p>
                      <p className="mt-0.5 text-[var(--ci-text-muted)]">
                        <strong className="font-medium text-[var(--ci-text)]">{dict.sursa}</strong> {r.sursa === "crm" ? dict.crm(String(etMetrica(r.metrica))) : dict.manual} · <strong className="font-medium text-[var(--ci-text)]">{dict.formula}</strong> {r.formula}
                      </p>
                      <p className="mt-0.5 text-[var(--ci-text-muted)]">
                        <strong className="font-medium text-[var(--ci-text)]">{dict.atribuire}</strong> {r.atribuire}
                      </p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        {eroare && (
          <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
            {eroare}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] text-[var(--ci-text-muted)]">{locale === "ro" ? (sablon.confirmat ? NOTA_CONFIRMAT : NOTA_EXEMPLU) : sablon.confirmat ? dict.notaConfirmat : dict.notaExemplu}
            {dict.poatiSchimba}
          </p>
          <div className="flex gap-2">
            <Button onClick={onClose}>{dict.renunta}</Button>
            <Button variant="primary" loading={pending} onClick={aplica}>
              {dict.creeaza}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
