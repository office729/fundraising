"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { calculeazaAlocare, genereazaSfaturi, parseNum, parseazaExport, progresChestionar } from "@/lib/avatar-donator/motor";
import type { AvatarData, StatisticiPlatforma } from "@/lib/avatar-donator/tipuri";

import { salveazaAvatar } from "./actions";
import { TabBuget } from "./tab-buget";
import { TabChestionar } from "./tab-chestionar";
import { TabProfile } from "./tab-profile";
import { TabSinteza } from "./tab-sinteza";

type TabId = "buget" | "sinteza" | "chestionar" | "profile";
// Intrările (Buget) înaintea rezultatului (Sinteză): altfel omul nou ajunge pe o pagină goală.
const TABURI: { id: TabId; label: string }[] = [
  { id: "buget", label: "1. Buget & canale" },
  { id: "sinteza", label: "2. Sinteză & recomandări" },
  { id: "chestionar", label: "Chestionar (100 întrebări)" },
  { id: "profile", label: "Profiluri & rezumat" },
];

export type Actualizeaza = (fn: (d: AvatarData) => AvatarData) => void;
type Stare = "salvat" | "modificat" | "se-salveaza" | "eroare";

export function AvatarDonatorClient({ initial, stat }: { initial: AvatarData; stat: StatisticiPlatforma | null }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [data, setData] = useState<AvatarData>(initial);
  // Fără buget introdus încă, începem de la intrări; altfel de la rezultat.
  const [tab, setTabState] = useState<TabId>(parseNum(initial.buget.lunar) ? "sinteza" : "buget");
  const [stare, setStare] = useState<Stare>("salvat");
  const [mesaj, setMesaj] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Contor de încercări de salvare: „Reîncearcă” îl incrementează ca să repornească salvarea fără a modifica datele.
  const [reincearca, setReincearca] = useState(0);

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

  const alocare = useMemo(() => calculeazaAlocare(data), [data]);
  const sfaturi = useMemo(() => genereazaSfaturi(data, alocare, stat), [data, alocare, stat]);
  const progres = useMemo(() => progresChestionar(data), [data]);

  async function importaDinFisier(file: File) {
    const text = await file.text();
    const { raspunsuri, gasite } = parseazaExport(text);
    if (gasite === 0) {
      setMesaj("Nu am găsit răspunsuri completate în fișier (formatul așteptat: exportul „Avatarul donatorului perfect”).");
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
    setMesaj(`Am importat ${gasite} ${gasite === 1 ? "răspuns" : "răspunsuri"} din fișier.`);
  }

  const indicator =
    stare === "salvat" ? "Salvat" : stare === "modificat" ? "Modificări nesalvate…" : stare === "se-salveaza" ? "Se salvează…" : "Nu s-a putut salva";

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Avatar donator</h1>
          <p className="mt-0.5 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">
            Cine este donatorul tău ideal și unde îl găsești. Din cifrele tale aflii cum să-ți împarți bugetul de promovare, pe ce platformă să insiști și ce să faci concret.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <label className="cursor-pointer rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-within:ring-2 focus-within:ring-[var(--ci-primary)]">
            Importă din export (.txt)
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
      {mesaj && (
        <p role="status" className="rounded-lg bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] text-[var(--ci-text)]">
          {mesaj}
        </p>
      )}

      {/* Bara de taburi + starea salvării, lipite sus, ca să se vadă și pe chestionarul lung */}
      <div className="sticky top-0 z-10 -mx-1 bg-[var(--ci-bg)] px-1 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ci-border)] pb-2">
          <div role="tablist" aria-label="Secțiuni Avatar donator" className="flex flex-wrap gap-1.5">
            {TABURI.map((t) => (
              <button
                key={t.id}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`panou-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                type="button"
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                  e.preventDefault();
                  const i = TABURI.findIndex((x) => x.id === tab);
                  const urm = TABURI[(i + (e.key === "ArrowRight" ? 1 : TABURI.length - 1)) % TABURI.length];
                  setTab(urm.id);
                  requestAnimationFrame(() => document.getElementById(`tab-${urm.id}`)?.focus());
                }}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${
                  tab === t.id ? "bg-[var(--ci-primary)] text-white" : "text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
                }`}
              >
                {t.label}
                {t.id === "chestionar" && <span className="ml-1.5 text-[11px] font-normal opacity-80">{progres.completate}/{progres.total}</span>}
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
                Reîncearcă
              </button>
            )}
          </div>
        </div>
      </div>

      <div role="tabpanel" id={`panou-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "buget" && <TabBuget data={data} actualizeaza={actualizeaza} alocare={alocare} stat={stat} continua={() => setTab("sinteza")} />}
        {tab === "sinteza" && <TabSinteza data={data} actualizeaza={actualizeaza} alocare={alocare} sfaturi={sfaturi} mergiLa={setTab} />}
        {tab === "chestionar" && <TabChestionar data={data} actualizeaza={actualizeaza} progres={progres} />}
        {tab === "profile" && <TabProfile data={data} actualizeaza={actualizeaza} />}
      </div>
    </div>
  );
}
