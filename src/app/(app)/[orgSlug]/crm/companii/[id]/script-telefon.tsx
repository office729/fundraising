"use client";

import { ChevronDown, ClipboardCopy, Phone } from "lucide-react";
import { useState } from "react";

import { scriptCaText, type ScriptApel } from "@/lib/script-apel";

import { Card } from "../../components/ui/card";
import { useLocale } from "../../lib/locale-context";
import { COMPANII_UI_DICT } from "@/lib/i18n/dictionaries/companii-ui";

// Scriptul de apel al firmei (lib/script-apel.ts), pliabil, cu buton de copiere. Se calculează pe server, cu datele firmei, și vine aici gata făcut.
export function ScriptTelefon({ script }: { script: ScriptApel }) {
  const locale = useLocale();
  const ui = COMPANII_UI_DICT[locale].script;
  const [deschis, setDeschis] = useState(false);
  const [copiat, setCopiat] = useState(false);

  async function copiaza() {
    try {
      await navigator.clipboard.writeText(scriptCaText(script));
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } catch {
      setCopiat(false);
    }
  }

  return (
    <Card>
      <button type="button" onClick={() => setDeschis(!deschis)} aria-expanded={deschis} className="flex w-full items-center justify-between gap-3 text-left focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
        <span className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-[var(--ci-primary)]" aria-hidden />
          <span>
            <span className="block text-[15px] font-bold text-[var(--ci-text)]">{ui.titlu}</span>
            <span className="block text-[12.5px] text-[var(--ci-text-muted)]">{ui.descriere}</span>
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--ci-text-muted)] transition-transform ${deschis ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {deschis && (
        <div className="mt-4 space-y-4">
          {locale !== "ro" && <p className="text-[12px] text-[var(--ci-text-muted)]">{ui.scriptInRomana}</p>}
          {script.sectiuni.map((s) => (
            <section key={s.titlu}>
              <h3 className="text-[13px] font-bold text-[var(--ci-text)]">{s.titlu}</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-[var(--ci-text)]">
                {s.pasi.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </section>
          ))}
          <section>
            <h3 className="text-[13px] font-bold text-[var(--ci-text)]">{ui.obiectii}</h3>
            <dl className="mt-1 space-y-1.5 text-[13px] leading-relaxed">
              {script.obiectii.map((o) => (
                <div key={o.obiectie}>
                  <dt className="font-semibold text-[var(--ci-text)]">{o.obiectie}</dt>
                  <dd className="text-[var(--ci-text-muted)]">{o.raspuns}</dd>
                </div>
              ))}
            </dl>
          </section>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={copiaza} className="inline-flex items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
              <ClipboardCopy className="h-3.5 w-3.5" aria-hidden /> {copiat ? ui.copiat : ui.copiaza}
            </button>
            <p className="text-[12px] text-[var(--ci-text-muted)]">{ui.nota}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
