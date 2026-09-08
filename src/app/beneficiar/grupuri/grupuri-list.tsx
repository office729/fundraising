"use client";

import { useState } from "react";

import { marcheazaPublicatGrupAction } from "../actions";

export type GroupRow = { id: string; nume: string; platforma: "facebook" | "whatsapp" | "altul"; link: string; localitate: string | null };

const PLATFORMA_LABEL: Record<GroupRow["platforma"], string> = { facebook: "Facebook", whatsapp: "WhatsApp", altul: "Altul" };

export function GrupuriList({ grupuri, publicateIds }: { grupuri: GroupRow[]; publicateIds: string[] }) {
  const [publicate, setPublicate] = useState<string[]>(publicateIds);
  const [pending, setPending] = useState<string | null>(null);

  async function marcheaza(id: string) {
    setPending(id);
    await marcheazaPublicatGrupAction(id);
    setPublicate((prev) => [...prev, id]);
    setPending(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {grupuri.map((g) => {
        const done = publicate.includes(g.id);
        return (
          <div key={g.id} className="rounded-xl border border-line bg-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <a href={g.link} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-ink hover:underline">
                  {g.nume}
                </a>
                <p className="mt-0.5 text-[12px] text-muted-2">
                  {PLATFORMA_LABEL[g.platforma]}
                  {g.localitate ? ` · ${g.localitate}` : ""}
                </p>
              </div>
              {done ? (
                <span className="rounded-full bg-brand-green-soft px-2.5 py-1 text-[12px] font-medium text-brand-green">Am publicat</span>
              ) : (
                <button
                  onClick={() => marcheaza(g.id)}
                  disabled={pending === g.id}
                  className="rounded-lg border border-line bg-panel px-3 py-1.5 text-[12.5px] font-medium text-ink hover:bg-panel-2 disabled:opacity-50"
                >
                  {pending === g.id ? "Se salvează..." : "Am publicat"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
