"use client";

import { useState } from "react";

import type { Locale } from "@/lib/i18n/config";
import { SF_PUBLIC_UI_DICT } from "@/lib/i18n/dictionaries/sf-public-ui";
import type { Etapa, MesajGrup, PostZilnic } from "@/lib/promovare/generator";

function CopyButton({ text, copiat: etCopiat, copiaza: etCopiaza }: { text: string; copiat: string; copiaza: string }) {
  const [copiat, setCopiat] = useState(false);

  async function copiaza() {
    await navigator.clipboard.writeText(text);
    setCopiat(true);
    setTimeout(() => setCopiat(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copiaza}
      className="shrink-0 rounded-full border border-line px-3.5 py-1.5 text-[12.5px] font-bold text-ink transition hover:border-brand-blue hover:text-brand-blue"
    >
      {copiat ? etCopiat : etCopiaza}
    </button>
  );
}

function TextCard({ eyebrow, text, copiat, copiaza }: { eyebrow: string; text: string; copiat: string; copiaza: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-bold tracking-wide text-brand-green uppercase">{eyebrow}</p>
        <CopyButton text={text} copiat={copiat} copiaza={copiaza} />
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-body">{text}</p>
    </div>
  );
}

const TABURI = ["calendar", "grupuri", "presa"] as const;

type Tab = (typeof TABURI)[number];

export function PromovareTabs({
  locale,
  calendar,
  mesajeGrupuri,
  comunicatPresa,
  etape,
}: {
  locale: Locale;
  calendar: PostZilnic[];
  mesajeGrupuri: MesajGrup[];
  comunicatPresa: string;
  etape: Etapa[];
}) {
  const t = SF_PUBLIC_UI_DICT[locale].promovare;
  const [tab, setTab] = useState<Tab>("calendar");

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        {TABURI.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold transition ${
              tab === k ? "bg-brand-green text-white" : "border border-line text-ink hover:border-brand-blue hover:text-brand-blue"
            }`}
          >
            {t.taburi[k]}
          </button>
        ))}
      </div>

      {tab === "calendar" && (
        <div className="mt-5">
          <p className="mb-3 text-[12.5px] leading-relaxed text-muted-2">{t.calendarNota}</p>
          <div className="flex flex-col gap-3">
            {calendar.map((post) => (
              <TextCard key={post.zi} eyebrow={t.ziua(post.zi, post.unghi)} text={post.text} copiat={t.copiat} copiaza={t.copiaza} />
            ))}
          </div>
        </div>
      )}

      {tab === "grupuri" && (
        <div className="mt-5">
          <p className="mb-3 text-[12.5px] leading-relaxed text-muted-2">{t.grupuriNota}</p>
          <div className="flex flex-col gap-3">
            {mesajeGrupuri.map((m) => (
              <TextCard key={m.eticheta} eyebrow={m.eticheta} text={m.text} copiat={t.copiat} copiaza={t.copiaza} />
            ))}
          </div>

          <p className="mt-6 mb-3 text-[12.5px] leading-relaxed text-muted-2">{t.etapeNota}</p>
          <div className="flex flex-col gap-3">
            {etape.map((e) => (
              <div key={e.cheie} className={`rounded-2xl border p-4 ${e.activa ? "border-2 border-brand-green bg-brand-green-soft/50" : "border-line bg-panel-2"}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-[12px] font-bold tracking-wide uppercase ${e.activa ? "text-brand-green" : "text-muted-2"}`}>
                    {e.eticheta} {e.activa && t.stadiulCurent}
                  </p>
                  <CopyButton text={e.mesaj} copiat={t.copiat} copiaza={t.copiaza} />
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-body">{e.mesaj}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "presa" && (
        <div className="mt-5">
          <p className="mb-3 text-[12.5px] leading-relaxed text-muted-2">{t.presaNota}</p>
          <TextCard eyebrow={t.comunicat} text={comunicatPresa} copiat={t.copiat} copiaza={t.copiaza} />
        </div>
      )}
    </div>
  );
}
