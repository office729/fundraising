"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

import { STRANGERE_FONDURI_UI_DICT } from "@/lib/i18n/dictionaries/strangere-fonduri-ui";
import { snippetWidget, type ModWidget } from "@/lib/widget-doneaza";

import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { Input, Label, Select } from "../../components/ui/input";
import { useLocale } from "../../lib/locale-context";

// Codul pentru widgetul de donație de pe site-ul organizației (WordPress, Wix, orice pagină HTML). Detalii: public/embed.js.
export function EmbedCard({ orgSlug, pageSlug, baza }: { orgSlug: string; pageSlug: string; baza: string }) {
  const dict = STRANGERE_FONDURI_UI_DICT[useLocale()].embed;
  const [mod, setMod] = useState<ModWidget>("buton");
  const [text, setText] = useState("Donează");
  const [culoare, setCuloare] = useState("#2e8b57");
  const [copiat, setCopiat] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);
  const cod = snippetWidget({ baza, orgSlug, pageSlug, mod, text, culoare }) ?? "";

  return (
    <Card>
      <CardHeader title={dict.title} subtitle={dict.subtitle} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="widget-mod">{dict.cumArata}</Label>
          <Select id="widget-mod" value={mod} onChange={(e) => setMod(e.target.value as ModWidget)}>
            <option value="buton">{dict.modButon}</option>
            <option value="inline">{dict.modInline}</option>
          </Select>
        </div>
        {mod === "buton" && (
          <>
            <div>
              <Label htmlFor="widget-text">{dict.textButon}</Label>
              <Input id="widget-text" value={text} maxLength={40} onChange={(e) => setText(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="widget-culoare">{dict.culoareButon}</Label>
              <div className="flex items-center gap-2">
                <input id="widget-culoare" type="color" value={culoare} onChange={(e) => setCuloare(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-[var(--ci-border)] bg-transparent p-0.5" />
                <span className="font-mono text-[12.5px] text-[var(--ci-text-muted)]">{culoare}</span>
              </div>
            </div>
          </>
        )}
      </div>
      <p className="mt-4 mb-1.5 text-[13px] font-medium text-[var(--ci-text)]">{dict.lipesteCod}</p>
      <pre className="ci-scrollbar overflow-x-auto rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] p-3 text-[12.5px] text-[var(--ci-text)]">{cod}</pre>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          onClick={() => {
            const clip = navigator.clipboard;
            if (!clip) {
              setEroare(dict.eroareClipboardIndisponibil);
              return;
            }
            clip.writeText(cod).then(
              () => {
                setEroare(null);
                setCopiat(true);
                window.setTimeout(() => setCopiat(false), 2000);
              },
              () => setEroare(dict.eroareCopiere),
            );
          }}
        >
          {copiat ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copiat ? dict.copiat : dict.copiazaCodul}
        </Button>
        <a
          href={`/strangere-fonduri/${orgSlug}/${pageSlug}/embed`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 text-sm font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
        >
          {dict.previzualizeaza} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
      {eroare && (
        <p role="alert" className="mt-2 text-[13px] text-[var(--ci-red)]">
          {eroare}
        </p>
      )}
      <p className="mt-3 text-[12px] text-[var(--ci-text-muted)]">
        {dict.uniLipesti}
      </p>
      <div className="mt-3 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] p-3 text-[12px] text-[var(--ci-text-muted)]">
        <p className="font-medium text-[var(--ci-text)]">{dict.politicaTitle}</p>
        <p className="mt-1">
          „Formularul de donație este oferit de Alexandrit (persoană împuternicită a noastră), care, la încărcarea formularului, primește adresa IP și browserul vizitatorului, fără cookie-uri. Plata este procesată de Stripe.”
        </p>
      </div>
    </Card>
  );
}
