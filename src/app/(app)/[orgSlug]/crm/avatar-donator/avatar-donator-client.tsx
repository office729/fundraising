"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AVATAR_UI_DICT } from "@/lib/i18n/dictionaries/avatar-donator-ui";
import { calculeazaAlocare, genereazaSfaturi, parseazaExport, progresChestionar } from "@/lib/avatar-donator/motor";
import { FISA_PRINCIPALA, fiseDeRevizuit, type AvatarData, type StatisticiPlatforma } from "@/lib/avatar-donator/tipuri";
import type { RezultatAvatare } from "@/lib/avatar-donator/avatare-reale";
import type { SegmentStat } from "@/lib/segmente-donatori";

import { useLocale } from "../lib/locale-context";
import { salveazaAvatar } from "./actions";
import { TabAvatare } from "./tab-avatare";
import { TabBuget } from "./tab-buget";
import { TabChestionar } from "./tab-chestionar";
import { TabProfile } from "./tab-profile";
import { TabSimplu } from "./tab-simplu";
import { TabSinteza } from "./tab-sinteza";

type TabId = "avatare" | "simplu" | "buget" | "sinteza" | "chestionar" | "profile";
// Întâi ce arată datele reale (Avatare), apoi instrumentele manuale: fișa ta, intrările (Buget) înaintea rezultatului (Sinteză).
const TAB_IDS: TabId[] = ["avatare", "simplu", "buget", "sinteza", "chestionar", "profile"];
const TABURI = TAB_IDS.map((id) => ({ id }));

export type Actualizeaza = (fn: (d: AvatarData) => AvatarData) => void;
type Stare = "salvat" | "modificat" | "se-salveaza" | "eroare";

export function AvatarDonatorClient({ initial, stat, segmente, avatare, avatarComplet }: { initial: AvatarData; stat: StatisticiPlatforma | null; segmente: SegmentStat[] | null; avatare: RezultatAvatare | null; avatarComplet: boolean }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const locale = useLocale();
  const t = AVATAR_UI_DICT[locale].client;
  const [data, setData] = useState<AvatarData>(initial);
  // Se deschide mereu pe ce arată datele reale; instrumentele manuale sunt în celelalte secțiuni.
  const [tab, setTabState] = useState<TabId>("avatare");
  const [stare, setStare] = useState<Stare>("salvat");
  const [mesaj, setMesaj] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Contor de încercări de salvare: „Reîncearcă” îl incrementează ca să repornească salvarea fără a modifica datele.
  const [reincearca, setReincearca] = useState(0);

  // Momentul deschiderii paginii: fixat o dată (nu se recalculează la fiecare randare).
  const [acum] = useState(() => Date.now());

  const setTab = useCallback((t: TabId) => {
    setTabState(t);
    window.scrollTo({ top: 0 });
  }, []);

  const actualizeaza: Actualizeaza = useCallback((fn) => {
    setData((d) => fn(d));
    setStare("modificat");
  }, []);

  // Autosalvare: la 1,2 s după ultima modificare (sau imediat la „Reîncearcă”).
  useEffect(() => {
    if (stare !== "modificat") return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setStare("se-salveaza");
      try {
        await salveazaAvatar(orgSlug, data);
        setStare((s) => (s === "se-salveaza" ? "salvat" : s));
      } catch {
        setStare("eroare");
      }
    }, 1200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [data, stare, orgSlug, reincearca]);

  // Avertizare la închiderea paginii cât timp există modificări nesalvate (altfel se pierd cele din ultima secundă).
  useEffect(() => {
    if (stare === "salvat") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [stare]);

  const alocare = useMemo(() => calculeazaAlocare(data, locale), [data, locale]);
  const sfaturi = useMemo(() => genereazaSfaturi(data, alocare, stat, locale), [data, alocare, stat, locale]);
  const progres = useMemo(() => progresChestionar(data), [data]);
  const deRevizuit = useMemo(() => fiseDeRevizuit(initial, acum), [initial, acum]);

  async function importaDinFisier(file: File) {
    const text = await file.text();
    const { raspunsuri, gasite } = parseazaExport(text);
    if (gasite === 0) {
      setMesaj(t.importNimic);
      return;
    }
    actualizeaza((d) => {
      const nou = { ...d, raspunsuri: { ...d.raspunsuri } };
      for (const [nr, r] of Object.entries(raspunsuri)) nou.raspunsuri[Number(nr)] = r;
      // Conversia principală (Q19) → câmpul structurat, dacă e recunoscută.
      const q19 = (raspunsuri[19]?.variante ?? "").toLowerCase();
      if (q19.includes("recurent")) nou.conversie = "recurenta";
      else if (q19.includes("unic")) nou.conversie = "unica";
      else if (q19.includes("sponsor")) nou.conversie = "sponsorizare";
      else if (q19.includes("sms")) nou.conversie = "sms";
      return nou;
    });
    setMesaj(t.importOk(gasite));
  }

  const indicator = stare === "salvat" ? t.stare.salvat : stare === "modificat" ? t.stare.modificat : stare === "se-salveaza" ? t.stare.seSalveaza : t.stare.eroare;

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{t.titlu}</h1>
          <p className="mt-0.5 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">{t.subtitlu}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <label className="cursor-pointer rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-within:ring-2 focus-within:ring-[var(--ci-primary)]">
            {t.importa}
            <input
              type="file"
              accept=".txt,text/plain"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importaDinFisier(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
      {deRevizuit.length > 0 && (
        <div role="note" className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--ci-radius-card)] bg-[var(--ci-amber-soft)] px-3 py-2 text-[13px] text-[var(--ci-text)]">
          <span>
            {t.deRevizuit(deRevizuit.length)} <strong>{deRevizuit.map((f) => (f.id === FISA_PRINCIPALA ? t.principala : f.nume)).join(", ")}</strong>.
          </span>
          <button type="button" onClick={() => setTab("simplu")} className="font-semibold text-[var(--ci-primary)] hover:underline">
            {t.revizuiesteAcum}
          </button>
        </div>
      )}
      {mesaj && (
        <p role="status" className="rounded-lg bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] text-[var(--ci-text)]">
          {mesaj}
        </p>
      )}

      {/* Bara de taburi + starea salvării, lipite sus, ca să se vadă și pe chestionarul lung */}
      <div className="sticky top-0 z-10 -mx-1 bg-[var(--ci-bg)] px-1 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ci-border)] pb-2">
          <div role="tablist" aria-label={t.taburiAria} className="flex flex-wrap gap-1.5">
            {TABURI.map((tb) => (
              <button
                key={tb.id}
                role="tab"
                id={`tab-${tb.id}`}
                aria-selected={tab === tb.id}
                aria-controls={`panou-${tb.id}`}
                tabIndex={tab === tb.id ? 0 : -1}
                type="button"
                onClick={() => setTab(tb.id)}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                  e.preventDefault();
                  const i = TABURI.findIndex((x) => x.id === tab);
                  const urm = TABURI[(i + (e.key === "ArrowRight" ? 1 : TABURI.length - 1)) % TABURI.length];
                  setTab(urm.id);
                  requestAnimationFrame(() => document.getElementById(`tab-${urm.id}`)?.focus());
                }}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${
                  tab === tb.id ? "bg-[var(--ci-primary)] text-white" : "text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
                }`}
              >
                {t.taburi[tb.id]}
                {tb.id === "chestionar" && <span className="ml-1.5 text-[11px] font-normal opacity-80">{progres.completate}/{progres.total}</span>}
              </button>
            ))}
          </div>
          <div role={stare === "eroare" ? "alert" : "status"} aria-live="polite" className="flex items-center gap-2 text-[12px]">
            <span className={stare === "eroare" ? "font-semibold text-[var(--ci-red)]" : "text-[var(--ci-text-muted)]"}>{indicator}</span>
            {stare === "eroare" && (
              <button
                type="button"
                onClick={() => {
                  setStare("modificat");
                  setReincearca((n) => n + 1);
                }}
                className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-2 py-0.5 font-medium text-[var(--ci-primary)] hover:bg-[var(--ci-surface-2)]"
              >
                {t.reincearca}
              </button>
            )}
          </div>
        </div>
      </div>

      <div role="tabpanel" id={`panou-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "avatare" && <TabAvatare rezultat={avatare} mergiLa={setTab} />}
        {tab !== "avatare" && !avatarComplet && (
          <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-6 text-[13.5px] leading-relaxed">
            <p className="font-semibold text-[var(--ci-text)]">{t.blocatTitlu}</p>
            <p className="mt-1 text-[var(--ci-text-muted)]">{t.blocatText}</p>
            <a href={`/${orgSlug}/crm/facturare`} className="mt-3 inline-block font-semibold text-[var(--ci-primary)] hover:underline">{t.vezPachetele}</a>
          </div>
        )}
        {tab === "simplu" && avatarComplet && <TabSimplu data={data} actualizeaza={actualizeaza} mergiLa={setTab} segmente={segmente} stat={stat} />}
        {tab === "buget" && avatarComplet && <TabBuget data={data} actualizeaza={actualizeaza} alocare={alocare} stat={stat} continua={() => setTab("sinteza")} />}
        {tab === "sinteza" && avatarComplet && <TabSinteza data={data} actualizeaza={actualizeaza} alocare={alocare} sfaturi={sfaturi} mergiLa={setTab} />}
        {tab === "chestionar" && avatarComplet && <TabChestionar data={data} actualizeaza={actualizeaza} progres={progres} />}
        {tab === "profile" && avatarComplet && <TabProfile data={data} actualizeaza={actualizeaza} />}
      </div>
    </div>
  );
}
