"use client";

import { useParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, FileText, Sparkles, Upload } from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { Input, Label, Select } from "../../components/ui/input";
import { useLocale } from "../../lib/locale-context";
import type { DateFinanciareExtrase } from "@/lib/ai";
import {
  extrageDateFinanciareAction,
  incarcaDocumentFinanciarAction,
  listeazaDocumenteFinanciareAction,
  salveazaCorectiiFinanciareAction,
  type DocumentFinanciarRand,
} from "./documente-financiare-actions";

const CAMPURI: { cheie: keyof DateFinanciareExtrase; eticheta_ro: string; eticheta_en: string }[] = [
  { cheie: "venituri", eticheta_ro: "Venituri", eticheta_en: "Revenue" },
  { cheie: "cheltuieli", eticheta_ro: "Cheltuieli", eticheta_en: "Expenses" },
  { cheie: "activeTotale", eticheta_ro: "Active totale", eticheta_en: "Total assets" },
  { cheie: "datoriiTotale", eticheta_ro: "Datorii totale", eticheta_en: "Total liabilities" },
  { cheie: "capitalPropriu", eticheta_ro: "Capital propriu", eticheta_en: "Equity" },
  { cheie: "rezultatNet", eticheta_ro: "Rezultat net", eticheta_en: "Net result" },
];

const ANUL_CURENT = new Date().getFullYear();

export function DocumenteFinanciareClient({ initial }: { initial: DocumentFinanciarRand[] }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const locale = useLocale();
  const ro = locale !== "en";
  const [docs, setDocs] = useState(initial);
  const [an, setAn] = useState(ANUL_CURENT);
  const [tip, setTip] = useState<"balanta" | "bilant">("bilant");
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [corectii, setCorectii] = useState<Record<string, DateFinanciareExtrase>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const cheie = (a: number, t: string) => `${a}-${t}`;

  const reincarcaLista = async () => setDocs(await listeazaDocumenteFinanciareAction(orgSlug));

  const onIncarca = () => {
    const fisier = fileRef.current?.files?.[0];
    if (!fisier) {
      setEroare(ro ? "Alege un fișier." : "Choose a file.");
      return;
    }
    setEroare(null);
    start(async () => {
      try {
        await incarcaDocumentFinanciarAction(orgSlug, { an, tip, fisier });
        if (fileRef.current) fileRef.current.value = "";
        await reincarcaLista();
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  const onExtrage = (d: DocumentFinanciarRand) => {
    setEroare(null);
    start(async () => {
      try {
        await extrageDateFinanciareAction(orgSlug, { an: d.an, tip: d.tip });
        await reincarcaLista();
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  const onConfirma = (d: DocumentFinanciarRand) => {
    const editate = corectii[cheie(d.an, d.tip)] ?? d.dateExtrase ?? {};
    setEroare(null);
    start(async () => {
      try {
        await salveazaCorectiiFinanciareAction(orgSlug, { an: d.an, tip: d.tip, corectii: editate });
        await reincarcaLista();
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title={ro ? "Încarcă document financiar" : "Upload financial document"}
          subtitle={ro ? "Balanța de verificare sau Bilanțul contabil, pe an — PDF sau Excel." : "Trial balance or balance sheet, per year — PDF or Excel."}
        />
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>{ro ? "An" : "Year"}</Label>
            <Input type="number" value={an} onChange={(e) => setAn(Number(e.target.value))} className="w-28" min={2000} max={2100} />
          </div>
          <div>
            <Label>{ro ? "Tip document" : "Document type"}</Label>
            <Select value={tip} onChange={(e) => setTip(e.target.value as "balanta" | "bilant")} className="w-48">
              <option value="bilant">{ro ? "Bilanț contabil" : "Balance sheet"}</option>
              <option value="balanta">{ro ? "Balanță de verificare" : "Trial balance"}</option>
            </Select>
          </div>
          <div>
            <Label>{ro ? "Fișier (PDF sau Excel, max 10MB)" : "File (PDF or Excel, max 10MB)"}</Label>
            <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls" className="text-sm text-[var(--ci-text)]" />
          </div>
          <Button onClick={onIncarca} disabled={pending}>
            <Upload className="h-3.5 w-3.5" /> {ro ? "Încarcă" : "Upload"}
          </Button>
        </div>
        {eroare && (
          <p className="mt-3 flex items-center gap-1.5 text-[13px] text-[var(--ci-red)]">
            <AlertTriangle className="h-3.5 w-3.5" /> {eroare}
          </p>
        )}
      </Card>

      <Card>
        <CardHeader title={ro ? "Documente încărcate" : "Uploaded documents"} subtitle={ro ? "Extrage cifrele cu AI, apoi confirmă-le înainte de a le folosi într-un raport." : "Extract figures with AI, then confirm before using them in a report."} />
        {docs.length === 0 ? (
          <p className="text-[13px] text-[var(--ci-text-muted)]">{ro ? "Niciun document încă." : "No documents yet."}</p>
        ) : (
          <div className="space-y-3">
            {docs.map((d) => {
              const editate = corectii[cheie(d.an, d.tip)] ?? d.dateExtrase ?? {};
              return (
                <div key={d.id} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[var(--ci-text-muted)]" />
                      <span className="text-[13px] font-medium text-[var(--ci-text)]">
                        {d.an} · {d.tip === "bilant" ? (ro ? "Bilanț" : "Balance sheet") : ro ? "Balanță" : "Trial balance"}
                      </span>
                      <span className="text-[12px] text-[var(--ci-text-muted)]">{d.fisierNume}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.confirmatLa ? (
                        <Badge tone="green">{ro ? "Confirmat" : "Confirmed"}</Badge>
                      ) : d.extractieStatus === "ok" ? (
                        <Badge tone="amber">{ro ? "De confirmat" : "Needs review"}</Badge>
                      ) : d.extractieStatus === "eroare" ? (
                        <Badge tone="red">{ro ? "Eroare extragere" : "Extraction error"}</Badge>
                      ) : (
                        <Badge tone="neutral">{ro ? "În așteptare" : "Pending"}</Badge>
                      )}
                      {d.extractieStatus !== "ok" || !d.confirmatLa ? (
                        <Button variant="secondary" onClick={() => onExtrage(d)} disabled={pending}>
                          <Sparkles className="h-3.5 w-3.5" /> {ro ? "Extrage cu AI" : "Extract with AI"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {d.extractieEroare && <p className="mt-2 text-[12px] text-[var(--ci-red)]">{d.extractieEroare}</p>}
                  {(d.dateExtrase || corectii[cheie(d.an, d.tip)]) && (
                    <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {CAMPURI.map((c) => (
                        <div key={c.cheie}>
                          <Label>{ro ? c.eticheta_ro : c.eticheta_en}</Label>
                          <Input
                            type="number"
                            value={editate[c.cheie] ?? ""}
                            onChange={(e) =>
                              setCorectii((prev) => ({
                                ...prev,
                                [cheie(d.an, d.tip)]: { ...editate, [c.cheie]: e.target.value === "" ? undefined : Number(e.target.value) },
                              }))
                            }
                            disabled={Boolean(d.confirmatLa)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {(d.dateExtrase || corectii[cheie(d.an, d.tip)]) && !d.confirmatLa && (
                    <Button className="mt-3" onClick={() => onConfirma(d)} disabled={pending}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> {ro ? "Confirmă cifrele" : "Confirm figures"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
