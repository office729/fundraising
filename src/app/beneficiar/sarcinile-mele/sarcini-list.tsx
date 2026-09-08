"use client";

import { useState } from "react";

import { finalizeazaSarcinaBeneficiarAction } from "../actions";

export type TaskRow = {
  id: string;
  tip: "generala" | "sponsorizare";
  titlu: string;
  descriere: string | null;
  dataLimita: string | null;
  status: "de_facut" | "finalizata";
  companie: string | null;
  suma: number | null;
  textMultumire: string | null;
  canalRecomandat: string | null;
  attachments: { id: string; fisierUrl: string; denumire: string }[];
};

export function SarciniList({ taskuri }: { taskuri: TaskRow[] }) {
  const [pending, setPending] = useState<string | null>(null);
  const [finalizate, setFinalizate] = useState<string[]>(taskuri.filter((t) => t.status === "finalizata").map((t) => t.id));

  async function finalizeaza(id: string) {
    setPending(id);
    await finalizeazaSarcinaBeneficiarAction(id);
    setFinalizate((prev) => [...prev, id]);
    setPending(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {taskuri.map((t) => {
        const done = finalizate.includes(t.id);
        return (
          <div key={t.id} className="rounded-xl border border-line bg-panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[13.5px] font-semibold text-ink">{t.titlu}</p>
                  {t.tip === "sponsorizare" && (
                    <span className="rounded-full bg-brand-blue-soft px-2 py-0.5 text-[11px] font-medium text-brand-blue">Sponsorizare</span>
                  )}
                </div>
                {t.descriere && <p className="mt-1 text-[13px] text-body">{t.descriere}</p>}
                {t.tip === "sponsorizare" && (
                  <div className="mt-2 rounded-lg bg-panel-2 p-3 text-[12.5px] text-muted">
                    {t.companie && <p>Companie sponsor: {t.companie}</p>}
                    {t.suma != null && <p>Sumă: {t.suma.toLocaleString("ro-RO")} lei</p>}
                    {t.canalRecomandat && <p>Canal recomandat: {t.canalRecomandat}</p>}
                    {t.textMultumire && <p className="mt-1 whitespace-pre-wrap italic">„{t.textMultumire}”</p>}
                  </div>
                )}
                {t.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {t.attachments.map((a) => (
                      <a key={a.id} href={a.fisierUrl} target="_blank" rel="noreferrer" className="text-[12px] text-brand-green hover:underline">
                        📎 {a.denumire}
                      </a>
                    ))}
                  </div>
                )}
                {t.dataLimita && <p className="mt-2 text-[11.5px] text-muted-2">Termen: {new Date(t.dataLimita).toLocaleDateString("ro-RO")}</p>}
              </div>
              {done ? (
                <span className="shrink-0 rounded-full bg-brand-green-soft px-2.5 py-1 text-[12px] font-medium text-brand-green">Finalizată</span>
              ) : (
                <button
                  onClick={() => finalizeaza(t.id)}
                  disabled={pending === t.id}
                  className="shrink-0 rounded-lg bg-brand-green px-3 py-1.5 text-[12.5px] font-bold text-white hover:bg-brand-green-hover disabled:opacity-60"
                >
                  {pending === t.id ? "..." : "Am finalizat"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
