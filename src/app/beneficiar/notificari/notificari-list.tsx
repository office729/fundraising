"use client";

import { useState } from "react";

import { marcheazaNotificareCititaAction, marcheazaToateNotificarileCititeAction } from "../actions";

export type NotificareRow = { id: string; titlu: string; continut: string | null; link: string | null; citit: boolean; createdAt: string };

export function NotificariList({ notificari }: { notificari: NotificareRow[] }) {
  const [citite, setCitite] = useState<string[]>(notificari.filter((n) => n.citit).map((n) => n.id));

  async function marcheaza(id: string) {
    if (citite.includes(id)) return;
    setCitite((prev) => [...prev, id]);
    await marcheazaNotificareCititaAction(id);
  }

  async function marcheazaToate() {
    setCitite(notificari.map((n) => n.id));
    await marcheazaToateNotificarileCititeAction();
  }

  const necitite = notificari.length - citite.length;

  return (
    <div className="space-y-3">
      {necitite > 0 && (
        <button onClick={marcheazaToate} className="text-[12.5px] font-medium text-brand-green hover:underline">
          Marchează toate ca citite
        </button>
      )}
      <div className="flex flex-col gap-2">
        {notificari.map((n) => {
          const citit = citite.includes(n.id);
          const content = (
            <div
              className={`rounded-xl border p-4 transition ${citit ? "border-line bg-panel" : "border-brand-green bg-brand-green-soft/40"}`}
              onClick={() => marcheaza(n.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13.5px] font-semibold text-ink">{n.titlu}</p>
                <span className="shrink-0 text-[11px] text-muted-2">{new Date(n.createdAt).toLocaleDateString("ro-RO")}</span>
              </div>
              {n.continut && <p className="mt-1 text-[13px] text-body">{n.continut}</p>}
            </div>
          );
          return n.link ? (
            <a
              key={n.id}
              href={n.link}
              onClick={async (e) => {
                if (citit) return;
                e.preventDefault();
                await marcheaza(n.id);
                window.location.href = n.link!;
              }}
            >
              {content}
            </a>
          ) : (
            <div key={n.id}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
