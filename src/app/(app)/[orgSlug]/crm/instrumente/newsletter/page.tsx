"use client";

import { Download } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import { Badge } from "../../components/ui/badge";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { Input, Label, Textarea } from "../../components/ui/input";
import { downloadWordDoc } from "../../lib/download-doc";
import { useBeneficiari, useCompanii, useDonatori } from "../../lib/use-data";
import { useLocale } from "../../lib/locale-context";
import { INSTRUMENTE_DICT } from "@/lib/i18n/dictionaries/instrumente";

type Audienta = "pf" | "pj";

export default function NewsletterPage() {
  return (
    <Suspense fallback={null}>
      <NewsletterContent />
    </Suspense>
  );
}

function NewsletterContent() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const searchParams = useSearchParams();
  const DONATORI = useDonatori();
  const COMPANII = useCompanii();
  const BENEFICIARI = useBeneficiari();
  const locale = useLocale();
  const dictRoot = INSTRUMENTE_DICT[locale];
  const dict = dictRoot.newsletter;

  const [audienta, setAudienta] = useState<Audienta>(searchParams.get("aud") === "pj" ? "pj" : "pf");
  const template = audienta === "pf" ? dict.templatePf : dict.templatePj;
  const [subiect, setSubiect] = useState(template.subiect);
  const [corp, setCorp] = useState(template.corp);

  const caz = BENEFICIARI[0];
  const destinatari = audienta === "pf" ? DONATORI.filter((d) => d.consimtamant === "da") : COMPANII.filter((c) => c.status === "won");

  const preview = useMemo(() => {
    return corp
      .replace(/{{nume}}/g, "Maria")
      .replace(/{{companie}}/g, COMPANII[0]?.nume ?? "Companie")
      .replace(/{{caz}}/g, caz?.nume ?? "un caz")
      .replace(/{{suma}}/g, caz ? `${caz.sumaStransa.toLocaleString("ro-RO")} RON` : "0 RON")
      .replace(/{{obiectiv}}/g, caz ? `${caz.obiectiv.toLocaleString("ro-RO")} RON` : "0 RON");
  }, [corp, caz, COMPANII]);

  function schimbaAudienta(a: Audienta) {
    setAudienta(a);
    const t = a === "pf" ? dict.templatePf : dict.templatePj;
    setSubiect(t.subiect);
    setCorp(t.corp);
  }

  function genereaza() {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
      <h2>${subiect}</h2>
      <p style="white-space:pre-line">${preview}</p>
    </body></html>`;
    downloadWordDoc(`Newsletter ${audienta === "pf" ? dict.numeFisier.pf : dict.numeFisier.pj}.doc`, html);
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <Breadcrumb items={[{ label: dictRoot.breadcrumb, href: `/${orgSlug}/crm/instrumente` }, { label: dict.breadcrumbLabel }]} />

      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => schimbaAudienta("pf")}
          className={`rounded-lg border px-3.5 py-2 text-[13px] font-medium ${audienta === "pf" ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]" : "border-[var(--ci-border)] text-[var(--ci-text)]"}`}
        >
          {dict.persoaneFizice}
        </button>
        <button
          onClick={() => schimbaAudienta("pj")}
          className={`rounded-lg border px-3.5 py-2 text-[13px] font-medium ${audienta === "pj" ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]" : "border-[var(--ci-border)] text-[var(--ci-text)]"}`}
        >
          {dict.persoaneJuridice}
        </button>
        <Badge tone="blue">{dict.destinatariEligibili(destinatari.length)}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={dict.continut.title} />
          <div className="space-y-3">
            <div>
              <Label>{dict.subiect}</Label>
              <Input value={subiect} onChange={(e) => setSubiect(e.target.value)} />
            </div>
            <div>
              <Label>{dict.corpMesaj(`${audienta === "pf" ? "{{nume}}" : "{{companie}}"}, {{caz}}, {{suma}}, {{obiectiv}}`)}</Label>
              <Textarea rows={12} value={corp} onChange={(e) => setCorp(e.target.value)} />
            </div>
            <Button variant="primary" onClick={genereaza} className="w-full">
              <Download className="h-3.5 w-3.5" /> {dict.descarcaWord}
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title={dict.previzualizare} subtitle={subiect} />
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-[var(--ci-text)]">{preview}</p>
        </Card>
      </div>
    </div>
  );
}
