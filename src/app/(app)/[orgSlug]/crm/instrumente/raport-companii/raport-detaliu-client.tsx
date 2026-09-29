"use client";

import { AlertTriangle, CheckCircle2, Save, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { Label, Textarea } from "../../components/ui/input";
import { formatSuma } from "../../lib/format";
import { useLocale } from "../../lib/locale-context";
import type { SectiuniRaportActivitate } from "@/lib/ai";
import { genereazaRaportAction, salveazaRaportAction, type DetaliuRaport } from "./raport-actions";

const SECTIUNI: { cheie: keyof SectiuniRaportActivitate; eticheta_ro: string; eticheta_en: string }[] = [
  { cheie: "titlu", eticheta_ro: "Titlu", eticheta_en: "Title" },
  { cheie: "introducere", eticheta_ro: "Introducere", eticheta_en: "Introduction" },
  { cheie: "rezumatFinanciar", eticheta_ro: "Rezumat financiar", eticheta_en: "Financial summary" },
  { cheie: "folosireFonduri", eticheta_ro: "Cum au fost folosite fondurile", eticheta_en: "How funds were used" },
  { cheie: "impact", eticheta_ro: "Impact", eticheta_en: "Impact" },
  { cheie: "multumire", eticheta_ro: "Mulțumire", eticheta_en: "Thank you" },
];

const GOL: SectiuniRaportActivitate = { titlu: "", introducere: "", rezumatFinanciar: "", folosireFonduri: "", impact: "", multumire: "" };

export function RaportDetaliuClient({
  orgSlug,
  companyId,
  an,
  detaliu,
}: {
  orgSlug: string;
  companyId: string;
  an: number;
  detaliu: DetaliuRaport;
}) {
  const locale = useLocale();
  const ro = locale !== "en";
  const [continut, setContinut] = useState<SectiuniRaportActivitate>(detaliu.continut ?? GOL);
  const [eroare, setEroare] = useState<string | null>(null);
  const [salvatOk, setSalvatOk] = useState(false);
  const [pending, start] = useTransition();

  const onGenereaza = () => {
    setEroare(null);
    setSalvatOk(false);
    start(async () => {
      try {
        const sectiuni = await genereazaRaportAction(orgSlug, companyId, an);
        setContinut(sectiuni);
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  const onSalveaza = () => {
    setEroare(null);
    start(async () => {
      try {
        await salveazaRaportAction(orgSlug, companyId, an, continut);
        setSalvatOk(true);
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <Breadcrumb
        items={[
          { label: ro ? "Instrumente" : "Tools", href: `/${orgSlug}/crm/instrumente` },
          { label: ro ? "Raport activitate companii" : "Company activity report", href: `/${orgSlug}/crm/instrumente/raport-companii` },
          { label: `${detaliu.companyNume} · ${an}` },
        ]}
      />

      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{detaliu.companyNume}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
          {ro ? "An" : "Year"} {an} · {ro ? "sponsorizare" : "sponsorship"} {formatSuma(detaliu.sumaSponsorizata)}
          {detaliu.proiecte.length > 0 && ` · ${detaliu.proiecte.join(", ")}`}
        </p>
      </div>

      {!detaliu.sursaFinanciaraConfirmata && (
        <Card className="border-[var(--ci-amber)] bg-[var(--ci-amber-soft)]">
          <p className="flex items-center gap-1.5 text-[13px] text-[var(--ci-amber)]">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {ro
              ? `Niciun document financiar confirmat pentru ${an} — raportul va fi generat fără cifre financiare. Încarcă și confirmă Balanța/Bilanțul pentru un rezumat financiar complet.`
              : `No confirmed financial document for ${an} — the report will be generated without financial figures.`}
          </p>
        </Card>
      )}

      <Card>
        <CardHeader title={ro ? "Conținutul raportului" : "Report content"} subtitle={ro ? "Generat cu AI, editabil înainte de trimitere." : "AI-generated, editable before sending."} />
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onGenereaza} disabled={pending}>
            <Sparkles className="h-3.5 w-3.5" /> {detaliu.continut ? (ro ? "Regenerează cu AI" : "Regenerate with AI") : ro ? "Generează cu AI" : "Generate with AI"}
          </Button>
          <Button variant="secondary" onClick={onSalveaza} disabled={pending}>
            <Save className="h-3.5 w-3.5" /> {ro ? "Salvează" : "Save"}
          </Button>
          {salvatOk && (
            <span className="flex items-center gap-1 text-[13px] text-[var(--ci-green)]">
              <CheckCircle2 className="h-3.5 w-3.5" /> {ro ? "Salvat" : "Saved"}
            </span>
          )}
        </div>
        {eroare && (
          <p className="mt-3 flex items-center gap-1.5 text-[13px] text-[var(--ci-red)]">
            <AlertTriangle className="h-3.5 w-3.5" /> {eroare}
          </p>
        )}

        <div className="mt-4 space-y-3.5">
          {SECTIUNI.map((s) => (
            <div key={s.cheie}>
              <Label>{ro ? s.eticheta_ro : s.eticheta_en}</Label>
              <Textarea
                value={continut[s.cheie]}
                onChange={(e) => setContinut((prev) => ({ ...prev, [s.cheie]: e.target.value }))}
                rows={s.cheie === "titlu" ? 1 : 4}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
