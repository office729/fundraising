"use client";

import { Building2, CreditCard, Download, FileText, Pencil, Receipt } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { JUDETE } from "@/lib/judete";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { salveazaDateFacturareAction } from "../../billing-actions";

import { genereazaFacturaAction, type DateFacturare } from "./actions";

const data = (iso: string) => new Date(iso).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "long", year: "numeric" });
const STATUS: Record<string, { text: string; ton: "green" | "amber" | "neutral" }> = {
  active: { text: "activ", ton: "green" },
  trialing: { text: "perioadă de probă", ton: "amber" },
  past_due: { text: "plată întârziată", ton: "amber" },
  canceled: { text: "anulat", ton: "neutral" },
};

export function FacturareClient({ orgSlug, date }: { orgSlug: string; date: DateFacturare }) {
  const { plan, metodaPlata, firma, facturi } = date;
  const status = STATUS[plan.status] ?? { text: plan.status, ton: "neutral" as const };
  const [editare, setEditare] = useState(false);

  const metoda =
    metodaPlata.tip === "card-automat"
      ? { titlu: "Card, reînnoire automată", detaliu: [metodaPlata.masca, metodaPlata.expira ? `expiră ${metodaPlata.expira}` : null].filter(Boolean).join(" · ") }
      : metodaPlata.tip === "card"
        ? { titlu: "Card, plată lunară", detaliu: "Plătești manual la fiecare reînnoire" }
        : { titlu: "Nicio plată încă", detaliu: plan.probaZileRamase != null ? `${plan.probaZileRamase} zile de probă rămase` : "Alege un plan pentru a începe" };

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]" aria-hidden>
          <Receipt className="h-5 w-5" />
        </span>
        <div>
          <h1 className="ci-display text-xl font-bold text-[var(--ci-text)]">Facturare</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">Abonamentul și facturile emise de Alexandrit</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-[12.5px] text-[var(--ci-text-muted)]">Plan curent</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="blue" icon={false}>
              {plan.eticheta}
            </Badge>
            <span className="text-[13px] text-[var(--ci-text-muted)]">({status.text})</span>
          </div>
          <Link href={`/${orgSlug}/crm/setari#abonament`} className="mt-3 inline-block text-[13px] font-semibold text-[var(--ci-primary)] hover:underline">
            Schimbă planul
          </Link>
        </Card>
        <Card>
          <p className="text-[12.5px] text-[var(--ci-text-muted)]">Metoda de plată</p>
          <p className="mt-2 flex items-center gap-2 text-[15px] font-semibold text-[var(--ci-text)]">
            <CreditCard className="h-4 w-4 text-[var(--ci-text-muted)]" aria-hidden /> {metoda.titlu}
          </p>
          <p className="mt-1 text-[12.5px] text-[var(--ci-text-muted)]">{metoda.detaliu}</p>
        </Card>
        <Card>
          <p className="text-[12.5px] text-[var(--ci-text-muted)]">{plan.probaZileRamase != null ? "Perioada de probă" : "Expiră la"}</p>
          <p className="ci-tabular mt-2 text-[17px] font-bold text-[var(--ci-text)]">
            {plan.probaZileRamase != null ? `${plan.probaZileRamase} ${plan.probaZileRamase === 1 ? "zi rămasă" : "zile rămase"}` : plan.expiraLa ? data(plan.expiraLa) : "—"}
          </p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-[16px] font-bold text-[var(--ci-text)]">
              <Building2 className="h-4 w-4 text-[var(--ci-primary)]" aria-hidden /> Date de facturare
            </h2>
            <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">Aceste date apar pe facturile generate.</p>
          </div>
          <Button onClick={() => setEditare(true)}>
            <Pencil className="h-3.5 w-3.5" /> Editează
          </Button>
        </div>
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <Camp eticheta="Denumire" valoare={firma.nume} nota="Se schimbă din Setări → Organizație" />
          <Camp eticheta="CUI" valoare={firma.cif} />
          <Camp eticheta="Județ" valoare={firma.judet} />
          <Camp eticheta="Email facturi" valoare={firma.emailFacturi} nota="Facturile se trimit pe emailul proprietarului contului" />
          <div className="sm:col-span-2">
            <Camp eticheta="Adresa sediului" valoare={firma.adresa} />
          </div>
        </dl>
        {!firma.completa && <p className="mt-4 rounded-lg bg-[var(--ci-amber-soft)] px-3 py-2 text-[13px] text-[var(--ci-text)]">Completează CUI-ul, adresa și județul: fără ele nu putem emite factura pe numele organizației.</p>}
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-[var(--ci-text)]">
          <FileText className="h-4 w-4 text-[var(--ci-primary)]" aria-hidden /> Facturile mele
        </h2>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">Istoricul facturilor pentru abonamentul tău</p>
        <div className="mt-4">
          {facturi.length === 0 ? (
            <EmptyState icon={Receipt} title="Nicio factură încă" description="După prima plată a abonamentului, factura apare aici și o primești și pe email." />
          ) : (
            <div className="overflow-x-auto rounded-[var(--ci-radius-card)] border border-[var(--ci-border)]">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead className="bg-[var(--ci-surface-2)] text-[11.5px] tracking-wide text-[var(--ci-text-muted)] uppercase">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Data</th>
                    <th className="px-3 py-2 font-semibold">Descriere</th>
                    <th className="px-3 py-2 text-right font-semibold">Suma</th>
                    <th className="px-3 py-2 text-right font-semibold">Factura</th>
                  </tr>
                </thead>
                <tbody>
                  {facturi.map((f) => (
                    <RandFactura key={f.id} orgSlug={orgSlug} f={f} facturareActiva={date.facturareActiva} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {editare && <EditareDate orgSlug={orgSlug} firma={firma} onClose={() => setEditare(false)} />}
    </div>
  );
}

function Camp({ eticheta, valoare, nota }: { eticheta: string; valoare: string | null; nota?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12.5px] text-[var(--ci-text-muted)]">{eticheta}</dt>
      <dd className="mt-0.5 text-[14.5px] font-semibold break-words text-[var(--ci-text)]">{valoare && valoare.trim() ? valoare : "—"}</dd>
      {nota && <p className="mt-0.5 text-[11.5px] text-[var(--ci-text-muted)]">{nota}</p>}
    </div>
  );
}

function RandFactura({ orgSlug, f, facturareActiva }: { orgSlug: string; f: DateFacturare["facturi"][number]; facturareActiva: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [eroare, setEroare] = useState("");
  return (
    <>
      <tr className="border-t border-[var(--ci-border)]">
        <td className="px-3 py-2.5 whitespace-nowrap">{data(f.data)}</td>
        <td className="px-3 py-2.5">
          {f.pachet} <span className="text-[var(--ci-text-muted)]">(o lună)</span>
        </td>
        <td className="ci-tabular px-3 py-2.5 text-right whitespace-nowrap">{f.sumaLei.toLocaleString("ro-RO")} lei</td>
        <td className="px-3 py-2.5 text-right whitespace-nowrap">
          {f.stare === "emisa" && f.link ? (
            <a href={f.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-[var(--ci-primary)] hover:underline">
              <Download className="h-3.5 w-3.5" aria-hidden /> Descarcă {f.numar ? `#${f.numar}` : ""}
            </a>
          ) : f.stare === "nefacturat" ? (
            <span className="text-[var(--ci-text-muted)]">Plată de test, nefacturată</span>
          ) : facturareActiva ? (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => {
                setEroare("");
                start(async () => {
                  const r = await genereazaFacturaAction(orgSlug, f.id);
                  if (r.ok) router.refresh();
                  else setEroare(r.eroare);
                });
              }}
            >
              {pending ? "Se emite…" : "Generează factura"}
            </Button>
          ) : (
            <span className="text-[var(--ci-text-muted)]">Se emite în curând</span>
          )}
        </td>
      </tr>
      {eroare && (
        <tr>
          <td colSpan={4} className="px-3 pb-2.5">
            <p role="alert" className="rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[12.5px] text-[var(--ci-red)]">
              {eroare}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

function EditareDate({ orgSlug, firma, onClose }: { orgSlug: string; firma: DateFacturare["firma"]; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [cif, setCif] = useState(firma.cif ?? "");
  const [adresa, setAdresa] = useState(firma.adresa ?? "");
  const [judet, setJudet] = useState(firma.judet ?? "");
  const [eroare, setEroare] = useState("");

  return (
    <Dialog open onClose={onClose} title="Date de facturare" width="max-w-lg">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setEroare("");
          start(async () => {
            const r = await salveazaDateFacturareAction(orgSlug, { cif, adresaSediu: adresa, judet });
            if (r.error) setEroare(r.error);
            else {
              router.refresh();
              onClose();
            }
          });
        }}
      >
        <div>
          <Label htmlFor="fc-cif">CUI (cu sau fără RO)</Label>
          <Input id="fc-cif" value={cif} onChange={(e) => setCif(e.target.value)} placeholder="ex. RO12345678" />
        </div>
        <div>
          <Label htmlFor="fc-adresa">Adresa sediului social</Label>
          <Input id="fc-adresa" value={adresa} onChange={(e) => setAdresa(e.target.value)} placeholder="Strada, număr, localitate" />
        </div>
        <div>
          <Label htmlFor="fc-judet">Județ</Label>
          <Select id="fc-judet" value={judet} onChange={(e) => setJudet(e.target.value)}>
            <option value="">Alege județul</option>
            {JUDETE.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </Select>
        </div>
        <p className="text-[12.5px] text-[var(--ci-text-muted)]">Modificările se aplică facturilor viitoare. Facturile deja emise nu se schimbă.</p>
        {eroare && (
          <p role="alert" className="rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
            {eroare}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
          <Button type="button" onClick={onClose}>
            Renunț
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            Salvează
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
