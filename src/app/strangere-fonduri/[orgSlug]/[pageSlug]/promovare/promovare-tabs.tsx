"use client";

import { useState } from "react";

import type { Etapa, MesajGrup, PostZilnic } from "@/lib/promovare/generator";

function CopyButton({ text }: { text: string }) {
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
      {copiat ? "Copiat!" : "Copiază"}
    </button>
  );
}

function TextCard({ eyebrow, text }: { eyebrow: string; text: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-bold tracking-wide text-brand-green uppercase">{eyebrow}</p>
        <CopyButton text={text} />
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-body">{text}</p>
    </div>
  );
}

const TABURI = [
  { key: "calendar", label: "Calendar zilnic" },
  { key: "grupuri", label: "Mesaje pentru grupuri" },
  { key: "presa", label: "Comunicat presă" },
] as const;

type Tab = (typeof TABURI)[number]["key"];

export function PromovareTabs({
  calendar,
  mesajeGrupuri,
  comunicatPresa,
  etape,
}: {
  calendar: PostZilnic[];
  mesajeGrupuri: MesajGrup[];
  comunicatPresa: string;
  etape: Etapa[];
}) {
  const [tab, setTab] = useState<Tab>("calendar");

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        {TABURI.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold transition ${
              tab === t.key ? "bg-brand-green text-white" : "border border-line text-ink hover:border-brand-blue hover:text-brand-blue"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "calendar" && (
        <div className="mt-5">
          <p className="mb-3 text-[12.5px] leading-relaxed text-muted-2">
            Un text pregătit pentru fiecare zi — le poți folosi în ordine, sau alegi ce se potrivește momentului.
          </p>
          <div className="flex flex-col gap-3">
            {calendar.map((post) => (
              <TextCard key={post.zi} eyebrow={`Ziua ${post.zi} · ${post.unghi}`} text={post.text} />
            ))}
          </div>
        </div>
      )}

      {tab === "grupuri" && (
        <div className="mt-5">
          <p className="mb-3 text-[12.5px] leading-relaxed text-muted-2">
            Trei variante, pentru context diferit — alege-o pe cea potrivită pentru grupul unde postezi.
          </p>
          <div className="flex flex-col gap-3">
            {mesajeGrupuri.map((m) => (
              <TextCard key={m.eticheta} eyebrow={m.eticheta} text={m.text} />
            ))}
          </div>

          <p className="mt-6 mb-3 text-[12.5px] leading-relaxed text-muted-2">
            Mesaj adaptat automat la stadiul actual al campaniei — pragul activ e evidențiat.
          </p>
          <div className="flex flex-col gap-3">
            {etape.map((e) => (
              <div key={e.cheie} className={`rounded-2xl border p-4 ${e.activa ? "border-2 border-brand-green bg-brand-green-soft/50" : "border-line bg-panel-2"}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-[12px] font-bold tracking-wide uppercase ${e.activa ? "text-brand-green" : "text-muted-2"}`}>
                    {e.eticheta} {e.activa && "· stadiul curent"}
                  </p>
                  <CopyButton text={e.mesaj} />
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-body">{e.mesaj}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "presa" && (
        <div className="mt-5">
          <p className="mb-3 text-[12.5px] leading-relaxed text-muted-2">
            Draft de comunicat pentru presa locală — completează câmpurile marcate și trimite-l pe email.
          </p>
          <TextCard eyebrow="Comunicat de presă" text={comunicatPresa} />
        </div>
      )}
    </div>
  );
}
