"use client";

import { useState } from "react";

export function ShareLinksClient({ url, titlu }: { url: string; titlu: string }) {
  const [copiat, setCopiat] = useState(false);

  const mesaj = `Susține „${titlu}” — ${url}`;

  async function copiaza() {
    await navigator.clipboard.writeText(url);
    setCopiat(true);
    setTimeout(() => setCopiat(false), 2000);
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(mesaj)}`}
        target="_blank"
        rel="noreferrer"
        className="rounded-full bg-[#25D366] px-3.5 py-1.5 text-[13px] font-bold text-white transition hover:opacity-90"
      >
        WhatsApp
      </a>
      <a
        href={`mailto:?subject=${encodeURIComponent(`Susține „${titlu}”`)}&body=${encodeURIComponent(mesaj)}`}
        className="rounded-full border border-line px-3.5 py-1.5 text-[13px] font-bold text-ink transition hover:border-brand-blue hover:text-brand-blue"
      >
        Email
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
        className="rounded-full bg-[#1877F2] px-3.5 py-1.5 text-[13px] font-bold text-white transition hover:opacity-90"
      >
        Facebook
      </a>
      <button
        type="button"
        onClick={copiaza}
        className="rounded-full border border-line px-3.5 py-1.5 text-[13px] font-bold text-ink transition hover:border-brand-blue hover:text-brand-blue"
      >
        {copiat ? "Copiat!" : "Copiază link"}
      </button>
    </div>
  );
}
