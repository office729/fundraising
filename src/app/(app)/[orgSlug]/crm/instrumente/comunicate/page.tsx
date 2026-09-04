"use client";

import { Copy, Download, Printer, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { Input, Label, Textarea } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/states";
import { downloadWordDoc } from "../../lib/download-doc";
import { formatDataOra } from "../../lib/format";
import { addComunicat, getComunicate, stergeComunicat, useLocalStoreValue } from "../../lib/local-store";
import { useLocale } from "../../lib/locale-context";
import { INSTRUMENTE_DICT } from "@/lib/i18n/dictionaries/instrumente";

export default function ComunicatePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const locale = useLocale();
  const dictRoot = INSTRUMENTE_DICT[locale];
  const dict = dictRoot.comunicate;
  const [titlu, setTitlu] = useState("");
  const [continut, setContinut] = useState("");
  const [copiat, setCopiat] = useState(false);
  const istoric = useLocalStoreValue(getComunicate, []);

  function html() {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
      <h1 style="text-align:center">${titlu || dict.docDefault}</h1>
      <p style="white-space:pre-line">${continut}</p>
      <p style="margin-top:40px;font-size:11px;color:#666">${dict.docContact}</p>
    </body></html>`;
  }

  function salveazaSiDescarca() {
    if (!titlu.trim() || !continut.trim()) return;
    addComunicat(titlu.trim(), continut.trim());
    downloadWordDoc(`${titlu.trim()}.doc`, html());
  }

  function printeaza() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html());
    w.document.close();
    w.print();
  }

  async function copiazaEmail() {
    const text = `${dict.subiectEmail}: ${titlu}\n\n${continut}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } catch {
      // clipboard indisponibil — ignorăm silențios
    }
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <Breadcrumb items={[{ label: dictRoot.breadcrumb, href: `/${orgSlug}/crm/instrumente` }, { label: dict.breadcrumbLabel }]} />

      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
      </div>

      <Card>
        <CardHeader title={dict.comunicatNou} />
        <div className="space-y-3">
          <div>
            <Label>{dict.titlu}</Label>
            <Input value={titlu} onChange={(e) => setTitlu(e.target.value)} placeholder={dict.titluPlaceholder} />
          </div>
          <div>
            <Label>{dict.continut}</Label>
            <Textarea rows={10} value={continut} onChange={(e) => setContinut(e.target.value)} placeholder={dict.continutPlaceholder} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={salveazaSiDescarca} disabled={!titlu.trim() || !continut.trim()}>
              <Download className="h-3.5 w-3.5" /> {dict.descarcaWord}
            </Button>
            <Button variant="secondary" onClick={printeaza} disabled={!titlu.trim() || !continut.trim()}>
              <Printer className="h-3.5 w-3.5" /> {dict.genereazaPdf}
            </Button>
            <Button variant="secondary" onClick={copiazaEmail} disabled={!titlu.trim() || !continut.trim()}>
              <Copy className="h-3.5 w-3.5" /> {copiat ? dict.copiat : dict.copiazaEmail}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={dict.istoric.title} subtitle={dict.istoric.subtitle(istoric.length)} />
        {istoric.length ? (
          <div className="space-y-2">
            {istoric.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                <div>
                  <p className="text-[13px] font-medium text-[var(--ci-text)]">{c.titlu}</p>
                  <p className="text-[12px] text-[var(--ci-text-muted)]">{formatDataOra(c.creatLa)}</p>
                </div>
                <button onClick={() => stergeComunicat(c.id)} className="text-[var(--ci-text-faint)] hover:text-[var(--ci-red)]">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={dict.niciunComunicat} />
        )}
      </Card>
    </div>
  );
}
