"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { useLocale } from "../../lib/locale-context";

// Caseta cu linkul public al Formularului 230 (contul principal): adresa completă, copiere și deschidere într-o filă nouă.
// Conturile suplimentare au linkul lor în tabelul de mai jos.
const subscribeGol = () => () => {};

export function LinkPublicCard({ cale }: { cale: string }) {
  const ro = useLocale() === "ro";
  const [copiat, setCopiat] = useState(false);
  // Adresa completă depinde de domeniul pe care e deschisă pagina; pe server nu o știm, deci se completează doar în browser.
  const origine = useSyncExternalStore(subscribeGol, () => window.location.origin, () => "");
  const link = `${origine}${cale}`;

  async function copiaza() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } catch {
      // clipboard indisponibil: linkul rămâne selectabil în casetă
    }
  }

  const buton =
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] text-[var(--ci-text)] shadow-[var(--ci-shadow-sm)] transition-colors hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none";

  return (
    <section aria-labelledby="link-f230" className="rounded-[var(--ci-radius-card)] border border-[var(--ci-primary)]/25 bg-[var(--ci-primary-soft)] p-5">
      <h2 id="link-f230" className="text-[15px] font-bold text-[var(--ci-text)]">
        {ro ? "Link public pentru completare formular 230:" : "Public link to fill in Form 230:"}
      </h2>
      <div className="mt-3 flex items-center gap-2.5">
        <p className="min-w-0 flex-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3.5 py-2.5 font-mono text-[13.5px] break-all text-[var(--ci-text)] select-all">{link || cale}</p>
        <button type="button" onClick={copiaza} className={buton} aria-label={ro ? "Copiază linkul" : "Copy link"} title={ro ? "Copiază linkul" : "Copy link"}>
          {copiat ? <Check className="h-4 w-4 text-[var(--ci-green)]" /> : <Copy className="h-4 w-4" />}
        </button>
        <a href={link || cale} target="_blank" rel="noopener noreferrer" className={buton} aria-label={ro ? "Deschide linkul într-o filă nouă" : "Open link in a new tab"} title={ro ? "Deschide linkul" : "Open link"}>
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      <p className="mt-2.5 text-[13px] text-[var(--ci-text-muted)]">
        {ro
          ? "Distribuie acest link pe site-ul tău, rețelele sociale sau prin email, ca să încurajezi susținătorii să redirecționeze 3,5%."
          : "Share this link on your website, social media or by email to encourage supporters to redirect 3.5%."}
      </p>
    </section>
  );
}
