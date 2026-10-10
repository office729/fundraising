"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { Badge, type StatusTone } from "../components/ui/badge";

// Bucăți mici comune paginii „Voluntari”: rularea unei acțiuni cu mesaj, formatarea datelor, pastile de stare.

export type Rez = { ok: true } | { ok: false; eroare: string };
export type Mesaj = { tip: "ok" | "eroare"; text: string } | null;

export function useActiune() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mesaj, setMesaj] = useState<Mesaj>(null);

  // Rulează o acțiune de server, arată rezultatul și reîncarcă datele paginii.
  function ruleaza<T extends Rez>(f: () => Promise<T>, ok: string, dupa?: (r: T) => void) {
    start(async () => {
      const r = await f();
      setMesaj(r.ok ? { tip: "ok", text: ok } : { tip: "eroare", text: r.eroare });
      if (r.ok) {
        dupa?.(r);
        router.refresh();
      }
    });
  }
  return { pending, mesaj, setMesaj, ruleaza };
}

export function MesajActiune({ mesaj }: { mesaj: Mesaj }) {
  if (!mesaj) return null;
  return (
    <p
      role={mesaj.tip === "eroare" ? "alert" : "status"}
      className={`rounded-lg px-3 py-2 text-[13px] ${mesaj.tip === "eroare" ? "bg-[var(--ci-red-soft)] text-[var(--ci-red)]" : "bg-[var(--ci-green-soft)] text-[var(--ci-green)]"}`}
    >
      {mesaj.text}
    </p>
  );
}

const FUS = "Europe/Bucharest";
export const dataScurta = (iso: string) => new Date(iso).toLocaleDateString("ro-RO", { timeZone: FUS, day: "2-digit", month: "short", year: "numeric" });
export const dataOra = (iso: string) => new Date(iso).toLocaleString("ro-RO", { timeZone: FUS, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
export const ora = (iso: string) => new Date(iso).toLocaleTimeString("ro-RO", { timeZone: FUS, hour: "2-digit", minute: "2-digit" });
export const ziData = (isoData: string) => new Date(`${isoData}T12:00:00Z`).toLocaleDateString("ro-RO", { timeZone: "UTC", day: "2-digit", month: "short" });

const TONURI_INSCRIERE: Record<string, StatusTone> = { confirmata: "green", prezent: "green", in_asteptare: "amber", rezerva: "neutral", absent: "red", anulata: "neutral" };
export function PastilaStatus({ valoare, eticheta }: { valoare: string; eticheta: string }) {
  return (
    <Badge tone={TONURI_INSCRIERE[valoare] ?? "neutral"} icon={false}>
      {eticheta}
    </Badge>
  );
}

// Un cap de secțiune simplu: titlu + descriere scurtă + acțiune opțională.
export function Sectiune({ titlu, descriere, actiune }: { titlu: string; descriere?: string; actiune?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold text-[var(--ci-text)]">{titlu}</h2>
        {descriere && <p className="mt-0.5 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">{descriere}</p>}
      </div>
      {actiune}
    </div>
  );
}

export function descarcaCsv(nume: string, randuri: (string | number | null)[][]) {
  const celula = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    // Protecție împotriva formulelor din Excel („=”, „+”, „-”, „@” la început de celulă).
    const sigur = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n;]/.test(sigur) ? `"${sigur.replace(/"/g, '""')}"` : sigur;
  };
  const text = "﻿" + randuri.map((r) => r.map(celula).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nume;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
