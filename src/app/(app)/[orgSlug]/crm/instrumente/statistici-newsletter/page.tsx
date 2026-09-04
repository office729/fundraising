"use client";

import { Upload } from "lucide-react";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";

import { Badge } from "../../components/ui/badge";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/states";
import { parseImportFile } from "../../lib/import-parse";
import { useDonatori } from "../../lib/use-data";
import { useLocale } from "../../lib/locale-context";
import { INSTRUMENTE_DICT } from "@/lib/i18n/dictionaries/instrumente";

function extrageEmail(row: Record<string, string>): string {
  const cheie = Object.keys(row).find((k) => k.toLowerCase().includes("email") || k.toLowerCase().includes("mail"));
  return (cheie ? row[cheie] : Object.values(row)[0] ?? "").trim().toLowerCase();
}

export default function StatisticiNewsletterPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const DONATORI = useDonatori();
  const locale = useLocale();
  const dictRoot = INSTRUMENTE_DICT[locale];
  const dict = dictRoot.statisticiNewsletter;
  const [abonati, setAbonati] = useState<string[] | null>(null);
  const [dezabonati, setDezabonati] = useState<string[] | null>(null);
  const inputAbonati = useRef<HTMLInputElement>(null);
  const inputDezabonati = useRef<HTMLInputElement>(null);

  async function incarca(file: File, tip: "abonati" | "dezabonati") {
    const rows = await parseImportFile(file);
    const emailuri = rows.map(extrageEmail).filter(Boolean);
    if (tip === "abonati") setAbonati(emailuri);
    else setDezabonati(emailuri);
  }

  const emailuriDonatori = new Set(DONATORI.map((d) => d.email.toLowerCase()));
  const rataDezabonare = abonati?.length && dezabonati?.length ? Math.round((dezabonati.length / abonati.length) * 1000) / 10 : null;
  const donatoriPierduti = dezabonati?.filter((e) => emailuriDonatori.has(e)) ?? [];
  const listaDeCuratat = dezabonati?.filter((e) => !emailuriDonatori.has(e)) ?? [];

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <Breadcrumb items={[{ label: dictRoot.breadcrumb, href: `/${orgSlug}/crm/instrumente` }, { label: dict.breadcrumbLabel }]} />

      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader title={dict.abonati} subtitle={abonati ? dict.randuri(abonati.length) : dict.niciunFisier} />
          <input ref={inputAbonati} type="file" accept=".csv,.xlsx,.xls,.json" className="hidden" onChange={(e) => e.target.files?.[0] && incarca(e.target.files[0], "abonati")} />
          <Button variant="secondary" onClick={() => inputAbonati.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> {dict.incarcaAbonati}
          </Button>
        </Card>
        <Card>
          <CardHeader title={dict.dezabonati} subtitle={dezabonati ? dict.randuri(dezabonati.length) : dict.niciunFisier} />
          <input ref={inputDezabonati} type="file" accept=".csv,.xlsx,.xls,.json" className="hidden" onChange={(e) => e.target.files?.[0] && incarca(e.target.files[0], "dezabonati")} />
          <Button variant="secondary" onClick={() => inputDezabonati.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> {dict.incarcaDezabonati}
          </Button>
        </Card>
      </div>

      {rataDezabonare !== null && (
        <Card>
          <CardHeader title={dict.rataDezabonare} />
          <p className="ci-tabular text-2xl font-bold text-[var(--ci-text)]">{rataDezabonare}%</p>
        </Card>
      )}

      <Card>
        <CardHeader title={dict.donatoriPierduti.title} subtitle={dict.donatoriPierduti.subtitle} action={<Badge tone="red">{donatoriPierduti.length}</Badge>} />
        {donatoriPierduti.length ? (
          <div className="flex flex-wrap gap-1.5">
            {donatoriPierduti.map((e) => <Badge key={e} tone="neutral">{e}</Badge>)}
          </div>
        ) : (
          <EmptyState title={dict.niciunDonatorPierdut} description={dezabonati ? undefined : dict.incarcaAmbeleFisiere} />
        )}
      </Card>

      <Card>
        <CardHeader title={dict.listaDeCuratat.title} subtitle={dict.listaDeCuratat.subtitle} action={<Badge tone="neutral">{listaDeCuratat.length}</Badge>} />
        {listaDeCuratat.length ? (
          <div className="flex flex-wrap gap-1.5">
            {listaDeCuratat.map((e) => <Badge key={e} tone="neutral">{e}</Badge>)}
          </div>
        ) : (
          <EmptyState title={dict.nimicDeCuratat} description={dezabonati ? undefined : dict.incarcaAmbeleFisiere} />
        )}
      </Card>
    </div>
  );
}
