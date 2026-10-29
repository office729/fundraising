"use client";

import { useMemo, useState } from "react";

import { clasifica, ETICHETE_CANAL, ETICHETE_TIP } from "@/lib/atribuire/clasificare";
import { construiesteLinkPromovare, PRESETURI_PROMOVARE, sugereazaCod } from "@/lib/atribuire/linkuri";

const PAGINI = [
  { cale: "/descopera", eticheta: "Descoperă Alexandrit (formularul pentru ONG-uri)" },
  { cale: "/", eticheta: "Pagina de start" },
  { cale: "/signup", eticheta: "Crearea contului" },
  { cale: "/hub", eticheta: "Prețuri și pachete" },
  { cale: "/cum-functioneaza", eticheta: "Cum funcționează" },
  { cale: "/ce-facem", eticheta: "Ce facem" },
  { cale: "/contact", eticheta: "Contact" },
];

const camp = "h-9 w-full rounded-lg border border-line bg-panel px-3 text-sm text-ink";

// Linkuri de promovare pentru site-ul platformei (campanii către ONG-uri), cu aceleași convenții ca generatorul din CRM.
export function GeneratorPlatforma({ siteUrl }: { siteUrl: string }) {
  const [cale, setCale] = useState(PAGINI[0]!.cale);
  const [preset, setPreset] = useState(PRESETURI_PROMOVARE[0]!.cheie);
  const [campanie, setCampanie] = useState("");
  const [continut, setContinut] = useState("");
  const [copiat, setCopiat] = useState(false);
  const p = PRESETURI_PROMOVARE.find((x) => x.cheie === preset) ?? PRESETURI_PROMOVARE[0]!;
  const rezultat = useMemo(() => construiesteLinkPromovare({ baza: new URL(cale, siteUrl).toString(), source: p.source, medium: p.medium, campaign: campanie, content: continut }), [cale, p, campanie, continut, siteUrl]);
  const clasa = clasifica({ utmSource: p.source, utmMedium: p.medium }, []);

  async function copiaza() {
    if (!rezultat.ok) return;
    try {
      await navigator.clipboard.writeText(rezultat.url);
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } catch {
      setCopiat(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs font-medium text-muted">
          Pagina
          <select value={cale} onChange={(e) => setCale(e.target.value)} className={`${camp} mt-1`}>
            {PAGINI.map((x) => (
              <option key={x.cale} value={x.cale}>
                {x.eticheta}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted">
          Sursa și tipul promovării
          <select value={preset} onChange={(e) => setPreset(e.target.value)} className={`${camp} mt-1`}>
            {PRESETURI_PROMOVARE.map((x) => (
              <option key={x.cheie} value={x.cheie}>
                {x.eticheta}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted">
          Numele campaniei de marketing
          <input value={campanie} onChange={(e) => setCampanie(e.target.value)} onBlur={() => setCampanie((v) => sugereazaCod(v))} placeholder="ex. ong_toamna_2026" className={`${camp} mt-1`} />
        </label>
        <label className="text-xs font-medium text-muted">
          Postarea, reclama sau mesajul (opțional)
          <input value={continut} onChange={(e) => setContinut(e.target.value)} onBlur={() => setContinut((v) => sugereazaCod(v))} placeholder="ex. postare_03" className={`${camp} mt-1`} />
        </label>
      </div>
      <div className="mt-4">
        {rezultat.ok ? (
          <>
            <div className="flex flex-wrap gap-2">
              <code className="min-w-0 flex-1 rounded-lg border border-line bg-panel-2 px-3 py-2 text-xs break-all text-ink">{rezultat.url}</code>
              <button type="button" onClick={copiaza} className="h-9 shrink-0 rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white">
                {copiat ? "Copiat" : "Copiază linkul"}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Vizitele vor apărea ca <strong className="text-ink">{ETICHETE_CANAL[clasa.canal]}</strong> · <strong className="text-ink">{ETICHETE_TIP[clasa.tip]}</strong>.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">{rezultat.eroare}</p>
        )}
      </div>
    </div>
  );
}
