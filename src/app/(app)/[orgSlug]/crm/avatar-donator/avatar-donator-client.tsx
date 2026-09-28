"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { calculeazaAlocare, genereazaSfaturi, parseazaExport, progresChestionar } from "@/lib/avatar-donator/motor";
import type { AvatarData, StatisticiPlatforma } from "@/lib/avatar-donator/tipuri";

import { salveazaAvatar } from "./actions";
import { TabBuget } from "./tab-buget";
import { TabChestionar } from "./tab-chestionar";
import { TabProfile } from "./tab-profile";
import { TabSinteza } from "./tab-sinteza";

type TabId = "sinteza" | "buget" | "chestionar" | "profile";
const TABURI: { id: TabId; label: string }[] = [
  { id: "sinteza", label: "Sinteză & recomandări" },
  { id: "buget", label: "Buget & canale" },
  { id: "chestionar", label: "Chestionar (100 întrebări)" },
  { id: "profile", label: "Profiluri & rezumat" },
];

export type Actualizeaza = (fn: (d: AvatarData) => AvatarData) => void;

export function AvatarDonatorClient({ initial, stat }: { initial: AvatarData; stat: StatisticiPlatforma | null }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [data, setData] = useState<AvatarData>(initial);
  const [tab, setTab] = useState<TabId>("sinteza");
  const [stare, setStare] = useState<"salvat" | "modificat" | "se-salveaza" | "eroare">("salvat");
  const [mesaj, setMesaj] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimulSalvat = useRef(initial);

  // Autosalvare: la 1,2 s după ultima modificare.
  const actualizeaza: Actualizeaza = useCallback((fn) => {
    setData((d) => fn(d));
    setStare("modificat");
  }, []);

  useEffect(() => {
    if (stare !== "modificat") return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setStare("se-salveaza");
      try {
        await salveazaAvatar(orgSlug, data);
        ultimulSalvat.current = data;
        setStare("salvat");
      } catch {
        setStare("eroare");
      }
    }, 1200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [data, stare, orgSlug]);

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
    stare === "salvat" ? "Salvat" : stare === "modificat" ? "Modificări nesalvate…" : stare === "se-salveaza" ? "Se salvează…" : "Nu s-a putut salva — încearcă din nou";

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Avatar donator</h1>
          <p className="mt-0.5 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">
            Cine este donatorul tău ideal și unde îl găsești. Din răspunsurile și cifrele tale aflii cum să-ți împarți bugetul de promovare, pe ce platformă să insiști și ce să faci concret.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`text-[12px] ${stare === "eroare" ? "text-[var(--ci-red)]" : "text-[var(--ci-text-muted)]"}`}>{indicator}</span>
          <label className="cursor-pointer rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
            Importă din export (.txt)
            <input
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importaDinFisier(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
      {mesaj && <p className="rounded-lg bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] text-[var(--ci-text)]">{mesaj}</p>}

      <div role="tablist" className="flex flex-wrap gap-1.5 border-b border-[var(--ci-border)] pb-2">
        {TABURI.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
              tab === t.id ? "bg-[var(--ci-primary)] text-white" : "text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
            }`}
          >
            {t.label}
            {t.id === "chestionar" && <span className="ml-1.5 text-[11px] font-normal opacity-80">{progres.completate}/{progres.total}</span>}
          </button>
        ))}
      </div>

      {tab === "sinteza" && <TabSinteza data={data} alocare={alocare} sfaturi={sfaturi} mergiLa={setTab} />}
      {tab === "buget" && <TabBuget data={data} actualizeaza={actualizeaza} alocare={alocare} stat={stat} />}
      {tab === "chestionar" && <TabChestionar data={data} actualizeaza={actualizeaza} progres={progres} />}
      {tab === "profile" && <TabProfile data={data} actualizeaza={actualizeaza} />}
    </div>
  );
}
