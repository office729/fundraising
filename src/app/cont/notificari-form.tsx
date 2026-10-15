"use client";

import { useState, useTransition } from "react";

import { seteazaNotificareAction } from "./actions";

type Optiune = { tip: "rezumat-calendar"; titlu: string; descriere: string; primita: boolean };

// Comutatoarele pentru e-mailurile pe care platforma le trimite utilizatorului. Fiecare se poate opri și reporni oricând; același efect ca linkul „Dezabonare” din e-mail.
export function NotificariForm({ optiuni }: { optiuni: Optiune[] }) {
  const [stare, setStare] = useState(Object.fromEntries(optiuni.map((o) => [o.tip, o.primita])) as Record<string, boolean>);
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="mt-3 space-y-3">
      {optiuni.map((o) => (
        <label key={o.tip} className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={stare[o.tip] ?? true}
            disabled={pending}
            onChange={(e) => {
              const activ = e.target.checked;
              setEroare(null);
              setStare((p) => ({ ...p, [o.tip]: activ }));
              start(async () => {
                const r = await seteazaNotificareAction(o.tip, activ);
                if (!r.ok) {
                  setStare((p) => ({ ...p, [o.tip]: !activ }));
                  setEroare(r.eroare);
                }
              });
            }}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand-green,#3fa85c)]"
          />
          <span>
            <span className="font-medium text-ink">{o.titlu}</span>
            <span className="mt-0.5 block text-body">{o.descriere}</span>
          </span>
        </label>
      ))}
      {eroare && (
        <p role="alert" className="text-sm text-red-600">
          {eroare}
        </p>
      )}
    </div>
  );
}
