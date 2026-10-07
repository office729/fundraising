"use client";

import { useId, useState } from "react";

// Câmp de parolă cu buton „Arată/Ascunde” și, opțional, o indicație vizibilă (nu doar un mesaj de validare apărut după trimitere).
// Un utilizator fără experiență tehnică își poate verifica parola scrisă, în loc să ghicească de ce nu a mers.
export function PasswordField({
  label,
  name,
  autoComplete,
  minLength,
  hint,
  arata,
  ascunde,
}: {
  label: string;
  name: string;
  autoComplete: string;
  minLength?: number;
  hint?: string;
  arata: string;
  ascunde: string;
}) {
  const id = useId();
  const [vizibila, setVizibila] = useState(false);

  return (
    <div className="text-sm font-medium text-ink">
      <label htmlFor={id}>{label}</label>
      <div className="relative mt-1">
        <input
          id={id}
          type={vizibila ? "text" : "password"}
          name={name}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="w-full rounded-lg border border-line bg-panel py-2 pl-3 pr-20 text-ink"
        />
        <button
          type="button"
          onClick={() => setVizibila((v) => !v)}
          aria-pressed={vizibila}
          className="absolute inset-y-0 right-0 rounded-r-lg px-3 text-xs font-semibold text-brand-green hover:underline"
        >
          {vizibila ? ascunde : arata}
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs font-normal text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
