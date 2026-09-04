"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Select } from "../../components/ui/input";
import { useLocale } from "../../lib/locale-context";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import { comutaMarcaj, seteazaResponsabil } from "../actions";

type Marcaj = "cald" | "rece" | "recurent" | "d177" | "mec20" | "decembrie";

const PILE_KEYS: Marcaj[] = ["cald", "rece", "recurent", "d177", "mec20", "decembrie"];

export function TagPills({
  companyId,
  initial,
  responsabili,
  ownerIdInitial,
}: {
  companyId: string;
  initial: { temperatura: "cald" | "rece" | null; recurent: boolean; d177: boolean; mec20: boolean; decembrie: boolean };
  responsabili: { id: string; name: string | null }[];
  ownerIdInitial: string | null;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].detail.tagPills;
  const [stare, setStare] = useState(initial);
  const [ownerId, setOwnerId] = useState(ownerIdInitial ?? "");
  const [salvand, setSalvand] = useState<Marcaj | "responsabil" | null>(null);
  const [salvat, setSalvat] = useState<Marcaj | "responsabil" | null>(null);
  const [eroare, setEroare] = useState("");

  function activ(m: Marcaj): boolean {
    if (m === "cald") return stare.temperatura === "cald";
    if (m === "rece") return stare.temperatura === "rece";
    if (m === "recurent") return stare.recurent;
    if (m === "d177") return stare.d177;
    if (m === "mec20") return stare.mec20;
    return stare.decembrie;
  }

  async function comuta(m: Marcaj) {
    const nou = !activ(m);
    const anterior = stare;
    // Optimist: aplicăm imediat, inclusiv excluderea reciprocă cald/rece.
    setStare((s) => {
      if (m === "cald") return { ...s, temperatura: nou ? "cald" : null };
      if (m === "rece") return { ...s, temperatura: nou ? "rece" : null };
      if (m === "recurent") return { ...s, recurent: nou };
      if (m === "d177") return { ...s, d177: nou };
      if (m === "mec20") return { ...s, mec20: nou };
      return { ...s, decembrie: nou };
    });
    setSalvand(m);
    setEroare("");
    const rezultat = await comutaMarcaj(orgSlug, companyId, m, nou);
    setSalvand(null);
    if (rezultat.error) {
      setStare(anterior); // revenim la starea anterioară la eroare
      setEroare(rezultat.error);
      return;
    }
    setSalvat(m);
    setTimeout(() => setSalvat((s) => (s === m ? null : s)), 1500);
    router.refresh(); // reflectă marcajul și în lista de companii/filtre
  }

  async function schimbaResponsabil(id: string) {
    const anterior = ownerId;
    setOwnerId(id);
    setSalvand("responsabil");
    setEroare("");
    const rezultat = await seteazaResponsabil(orgSlug, companyId, id || null);
    setSalvand(null);
    if (rezultat.error) {
      setOwnerId(anterior);
      setEroare(rezultat.error);
      return;
    }
    setSalvat("responsabil");
    setTimeout(() => setSalvat((s) => (s === "responsabil" ? null : s)), 1500);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[var(--ci-text)]">{dict.title}</p>
          <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">
            {dict.subtitle}
            {salvand && salvand !== "responsabil" && <span className="ml-2 text-[var(--ci-text-faint)]">{dict.seSalveaza}</span>}
            {salvat && salvat !== "responsabil" && <span className="ml-2 text-[var(--ci-green)]">{dict.salvat}</span>}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {PILE_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => comuta(key)}
                disabled={salvand === key}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-60 ${
                  activ(key)
                    ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]"
                    : "border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]"
                }`}
              >
                {dict[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="w-56 shrink-0">
          <p className="text-[13px] font-semibold text-[var(--ci-text)]">{dict.responsabilFirma}</p>
          <div className="mt-2 flex items-center gap-2">
            <Select value={ownerId} onChange={(e) => schimbaResponsabil(e.target.value)} className="h-9 text-[13px]">
              <option value="">{dict.faraResponsabil}</option>
              {responsabili.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name || dict.faraNume}
                </option>
              ))}
            </Select>
          </div>
          {salvand === "responsabil" && <p className="mt-1 text-[11px] text-[var(--ci-text-faint)]">{dict.seSalveaza}</p>}
          {salvat === "responsabil" && <p className="mt-1 text-[11px] text-[var(--ci-green)]">{dict.salvat}</p>}
        </div>
      </div>
      {eroare && <p className="mt-2 text-[12px] text-[var(--ci-red)]">{eroare}</p>}
    </div>
  );
}
