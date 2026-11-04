"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { AI_ORG_UI_DICT } from "@/lib/i18n/dictionaries/ai-org-ui";
import { MODELE_ALESE } from "@/lib/ai-org/pret";

import { useLocale } from "../crm/lib/locale-context";
import { deconecteazaAnthropic, salveazaCheieAnthropic, salveazaSetariAi, testeazaConexiuneAnthropic, type StareAi } from "./ai-actions";

// Setări → Integrări & AI: contul Anthropic al organizației (cheia criptată, doar amprenta se vede), modelul și bugetul lunar de referință.
export function AiSection({ orgSlug, stare }: { orgSlug: string; stare: StareAi }) {
  const router = useRouter();
  const locale = useLocale();
  const d = AI_ORG_UI_DICT[locale].sectiune;
  const [cheie, setCheie] = useState("");
  const [model, setModel] = useState<string>(stare.model);
  const [buget, setBuget] = useState(stare.bugetUsd != null ? String(stare.bugetUsd) : "");
  const [povesteLaAi, setPovesteLaAi] = useState(stare.povesteLaAi);
  const [opresteLaBuget, setOpresteLaBuget] = useState(stare.opresteLaBuget);
  const [eroare, setEroare] = useState<string | null>(null);
  const [reusit, setReusit] = useState<string | null>(null);
  const [lucreaza, setLucreaza] = useState<"salveaza" | "testeaza" | "alegeri" | null>(null);
  const [confirmaStergere, setConfirmaStergere] = useState(false);
  const [pending, startTransition] = useTransition();
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(locale === "ro" ? "ro-RO" : "en-GB", { day: "2-digit", month: "short", year: "numeric" });

  // Mesajul de reușită dispare singur.
  useEffect(() => {
    if (!reusit) return;
    const t = setTimeout(() => setReusit(null), 6000);
    return () => clearTimeout(t);
  }, [reusit]);

  const ruleaza = (eticheta: "salveaza" | "testeaza" | "alegeri", f: () => Promise<{ error: string | null }>, mesajReusit: string, dupa?: () => void) =>
    startTransition(async () => {
      setEroare(null);
      setReusit(null);
      setLucreaza(eticheta);
      const r = await f();
      setLucreaza(null);
      if (r.error) setEroare(r.error);
      else {
        setReusit(mesajReusit);
        dupa?.();
        router.refresh();
      }
    });

  return (
    <section id="ai" className="mt-8 scroll-mt-4 rounded-xl border border-line bg-panel p-5">
      <h2 className="font-medium text-ink">{d.titlu}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">{d.intro}</p>
      <ol className="mt-3 space-y-1.5 rounded-lg bg-panel-2 p-3 text-xs leading-relaxed text-ink">
        <li>
          <strong>1.</strong> {d.pas1}
        </li>
        <li>
          <strong>2.</strong> {d.pas2}
        </li>
        <li>
          <strong>3.</strong> {d.pas3}
        </li>
      </ol>
      {!stare.criptareActiva && (
        <p role="alert" className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900">
          {d.faraCriptare}
        </p>
      )}

      <div className="mt-4 rounded-lg border border-line p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-ink">
          <span>{d.stare}</span>
          {stare.conectat && stare.amprenta && stare.adaugatLa ? (
            <span className="text-xs font-medium text-brand-green">{d.conectat(stare.amprenta, fmt(stare.adaugatLa))}</span>
          ) : (
            <span className="text-xs font-normal text-muted">{d.neconectat}</span>
          )}
        </div>
        <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-medium text-ink underline">
          {d.deschideConsola}
        </a>

        <form
          className="mt-2 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (cheie.trim() && stare.criptareActiva && !pending) ruleaza("salveaza", () => salveazaCheieAnthropic(orgSlug, cheie), d.conectatOk, () => setCheie(""));
          }}
        >
          <label className="min-w-0 flex-1 text-xs text-muted sm:min-w-[16rem]">
            {d.cheia}
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={cheie}
              onChange={(e) => setCheie(e.target.value)}
              placeholder={stare.conectat ? d.inlocuieste : d.lipeste}
              className="mt-1 h-10 w-full rounded-md border border-line bg-panel px-2.5 text-sm text-ink"
            />
          </label>
          <button type="submit" disabled={pending || !cheie.trim() || !stare.criptareActiva} className="h-10 rounded-md bg-brand-green px-3 text-sm font-semibold text-white transition hover:bg-brand-green-hover disabled:opacity-50">
            {lucreaza === "salveaza" ? d.seVerifica : d.salveaza}
          </button>
          {stare.conectat && (
            <>
              <button type="button" disabled={pending} onClick={() => ruleaza("testeaza", () => testeazaConexiuneAnthropic(orgSlug), d.testOk)} className="h-10 rounded-md border border-line px-3 text-sm font-medium text-ink hover:bg-panel-2 disabled:opacity-50">
                {lucreaza === "testeaza" ? d.seTesteaza : d.testeaza}
              </button>
              {!confirmaStergere && (
                <button type="button" disabled={pending} onClick={() => setConfirmaStergere(true)} className="h-10 rounded-md border border-line px-3 text-sm font-medium text-ink hover:bg-panel-2 disabled:opacity-50">
                  {d.deconecteaza}
                </button>
              )}
            </>
          )}
        </form>

        {confirmaStergere && (
          <div role="alertdialog" aria-label={d.deconecteaza} className="mt-2 rounded-md bg-panel-2 p-3 text-xs text-ink">
            <p>{d.confirmaDeconectare}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setConfirmaStergere(false);
                  ruleaza("alegeri", () => deconecteazaAnthropic(orgSlug), d.deconectatOk);
                }}
                className="h-9 rounded-md bg-red-700 px-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {d.daDeconecteaza}
              </button>
              <button type="button" onClick={() => setConfirmaStergere(false)} className="h-9 rounded-md border border-line px-3 text-sm font-medium text-ink hover:bg-panel">
                {d.renunta}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 rounded-lg border border-line p-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 text-xs text-muted sm:min-w-[16rem]">
            {d.model}
            <select value={model} onChange={(e) => setModel(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-panel px-2.5 text-sm text-ink">
              {MODELE_ALESE.map((m) => (
                <option key={m} value={m}>
                  {d.modele[m]}
                </option>
              ))}
            </select>
          </label>
          <label className="w-40 text-xs text-muted">
            {d.buget}
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="1"
              value={buget}
              onChange={(e) => setBuget(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-line bg-panel px-2.5 text-sm text-ink"
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() => ruleaza("alegeri", () => salveazaSetariAi(orgSlug, { model, bugetUsd: buget.trim() === "" ? null : Number(buget), povesteLaAi, opresteLaBuget }), d.alegeriSalvate)}
            className="h-10 rounded-md bg-brand-green px-3 text-sm font-semibold text-white transition hover:bg-brand-green-hover disabled:opacity-50"
          >
            {d.salveazaAlegeri}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">{d.bugetAjutor}</p>
        <label className="mt-2 flex items-start gap-2 text-xs text-ink">
          <input type="checkbox" checked={opresteLaBuget} onChange={(e) => setOpresteLaBuget(e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span>{d.opresteLaBuget}</span>
        </label>
        <label className="mt-2 flex items-start gap-2 text-xs text-ink">
          <input type="checkbox" checked={povesteLaAi} onChange={(e) => setPovesteLaAi(e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span>
            {d.povesteLaAi} <span className="text-muted">{d.povesteLaAiAvertisment}</span>
          </span>
        </label>
        <Link href={`/${orgSlug}/crm/consum-ai`} className="mt-2 inline-block text-xs font-medium text-ink underline">
          {d.vezi}
        </Link>
      </div>

      <div aria-live="polite" className="mt-2 min-h-5 text-xs">
        {eroare && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-red-800">
            {eroare}
          </p>
        )}
        {!eroare && reusit && <p className="rounded-md bg-green-50 px-3 py-2 text-green-800">{reusit}</p>}
      </div>
    </section>
  );
}
