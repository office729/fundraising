"use client";

import { Check, Copy, Download, Maximize2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { clasifica } from "@/lib/atribuire/clasificare";
import { construiesteLinkPromovare, PRESETURI_PROMOVARE, sugereazaCod } from "@/lib/atribuire/linkuri";
import { SURSE_UI_DICT, traduEroareLink } from "@/lib/i18n/dictionaries/surse-ui";
import { qrSvg } from "@/lib/qr";

import { Card, CardHeader } from "../components/ui/card";
import { Input, Label, Select } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";

export type TintaLink = { cheie: string; grup: string; eticheta: string; cale: string };

const GRUPURI = ["Social", "Căutare", "Email și mesagerie", "Offline și parteneri"] as const;

// Generatorul de linkuri de promovare pentru cele trei fluxuri. Linkurile duc către paginile publice, nu către CRM. Nu salvează nimic: construiește adresa din ce alegi.
export function GeneratorLinkuri({ siteUrl, tinte }: { siteUrl: string; tinte: TintaLink[] }) {
  const locale = useLocale();
  const dict = SURSE_UI_DICT[locale];
  const d = dict.generator;
  const presetEt = (x: (typeof PRESETURI_PROMOVARE)[number]) => d.presetari[x.cheie]?.eticheta ?? x.eticheta;
  const presetIndiciu = (x: (typeof PRESETURI_PROMOVARE)[number]) => d.presetari[x.cheie]?.indiciu ?? x.indiciu;
  const [tinta, setTinta] = useState(tinte[0]?.cheie ?? "");
  const [preset, setPreset] = useState(PRESETURI_PROMOVARE[0]!.cheie);
  const [campanie, setCampanie] = useState("");
  const [continut, setContinut] = useState("");
  const [copiat, setCopiat] = useState(false);
  const [ecranPlin, setEcranPlin] = useState(false);

  const p = PRESETURI_PROMOVARE.find((x) => x.cheie === preset) ?? PRESETURI_PROMOVARE[0]!;
  const t = tinte.find((x) => x.cheie === tinta);
  const rezultat = useMemo(() => {
    if (!t) return { ok: false as const, eroare: d.alegePagina };
    const r = construiesteLinkPromovare({ baza: new URL(t.cale, siteUrl).toString(), source: p.source, medium: p.medium, campaign: campanie, content: continut });
    return r.ok ? r : { ok: false as const, eroare: traduEroareLink(locale, r.eroare) };
  }, [t, p, campanie, continut, siteUrl, locale, d.alegePagina]);
  // Cum va fi clasificată o vizită pe acest link (aceleași reguli ca în rapoarte).
  const clasa = clasifica({ utmSource: p.source, utmMedium: p.medium }, []);

  // Codul QR al linkului: SVG generat local, din adresa de mai sus (nu se trimite nicăieri). Pe tot ecranul, ca să-l scaneze cei din fața standului.
  const qrMic = useMemo(() => (rezultat.ok ? qrSvg(rezultat.url, "200px") : ""), [rezultat]);
  const qrMare = useMemo(() => (rezultat.ok && ecranPlin ? qrSvg(rezultat.url, "min(80vw, 60vh)") : ""), [rezultat, ecranPlin]);

  function descarcaQr() {
    if (!rezultat.ok) return;
    const blob = new Blob([qrSvg(rezultat.url, "512px")], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cod-qr-${sugereazaCod(campanie) || "promovare"}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

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
    <div className="space-y-4">
      <Card>
        <CardHeader title={d.titlu} subtitle={d.subtitlu} />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>{d.pagina}</Label>
            <Select value={tinta} onChange={(e) => setTinta(e.target.value)}>
              {[...new Set(tinte.map((x) => x.grup))].map((g) => (
                <optgroup key={g} label={g}>
                  {tinte.filter((x) => x.grup === g).map((x) => (
                    <option key={x.cheie} value={x.cheie}>
                      {x.eticheta}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>
          <div>
            <Label>{d.sursaTip}</Label>
            <Select value={preset} onChange={(e) => setPreset(e.target.value)}>
              {GRUPURI.map((g) => (
                <optgroup key={g} label={d.grupuri[g] ?? g}>
                  {PRESETURI_PROMOVARE.filter((x) => x.grup === g).map((x) => (
                    <option key={x.cheie} value={x.cheie}>
                      {presetEt(x)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
            <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{presetIndiciu(p)}</p>
          </div>
          <div>
            <Label>{d.numeCampanie}</Label>
            <Input value={campanie} onChange={(e) => setCampanie(e.target.value)} onBlur={() => setCampanie((v) => sugereazaCod(v))} placeholder={d.numeCampaniePlaceholder} />
            <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{d.numeCampanieNota}</p>
          </div>
          <div>
            <Label>{d.continut}</Label>
            <Input value={continut} onChange={(e) => setContinut(e.target.value)} onBlur={() => setContinut((v) => sugereazaCod(v))} placeholder={d.continutPlaceholder} />
            <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{d.continutNota}</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={d.linkul} />
        {rezultat.ok ? (
          <>
            <div className="flex flex-wrap items-stretch gap-2">
              <code className="min-w-0 flex-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] break-all text-[var(--ci-text)]">{rezultat.url}</code>
              <button
                type="button"
                onClick={copiaza}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--ci-primary-hover)]"
              >
                {copiat ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiat ? d.copiat : d.copiaza}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[var(--ci-border)] pt-4">
              <div className="shrink-0 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-white p-1" dangerouslySetInnerHTML={{ __html: qrMic }} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-[var(--ci-text)]">{d.qrTitlu}</p>
                <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">{d.qrDesc}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEcranPlin(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3.5 text-[13px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
                    <Maximize2 className="h-4 w-4" aria-hidden="true" /> {d.ecranPlin}
                  </button>
                  <button type="button" onClick={descarcaQr} className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3.5 text-[13px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
                    <Download className="h-4 w-4" aria-hidden="true" /> {d.descarca}
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-3 text-[12.5px] text-[var(--ci-text-muted)]">
              {d.vizitele} <strong className="text-[var(--ci-text)]">{dict.canal[clasa.canal]}</strong> · <strong className="text-[var(--ci-text)]">{dict.tip[clasa.tip]}</strong>.
            </p>
          </>
        ) : (
          <p className="text-[13px] text-[var(--ci-text-muted)]" role="status">
            {rezultat.eroare}
          </p>
        )}
      </Card>

      <Card>
        <CardHeader title={d.reguliTitlu} />
        <ul className="list-disc space-y-1 pl-5 text-[13px] text-[var(--ci-text-muted)]">
          {d.reguli.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Card>
      {ecranPlin && rezultat.ok && (
        <div role="dialog" aria-modal="true" aria-label={d.qrAria} className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4 bg-white p-4 text-center">
          <button type="button" onClick={() => setEcranPlin(false)} aria-label={d.inchide} className="absolute top-3 right-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-300 text-neutral-800">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <p className="text-lg font-semibold text-neutral-900">{d.scaneaza}</p>
          <div dangerouslySetInnerHTML={{ __html: qrMare }} />
          <p className="max-w-md text-sm break-all text-neutral-600">{rezultat.url}</p>
        </div>
      )}
    </div>
  );
}
