"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "../../components/ui/button";
import { Input, Label, Select } from "../../components/ui/input";
import { useLocale } from "../../lib/locale-context";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import { actualizeazaContract } from "../actions";

type ContractStatus = "trimis" | "asteptare" | "semnat" | "anulat";

export function ContractPanel({
  companyId,
  numarContract,
  dataSemnare,
  contractStatus,
}: {
  companyId: string;
  numarContract: string | null;
  dataSemnare: string | null;
  contractStatus: ContractStatus | null;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].detail.contract;
  const contractLabel = COMPANII_DICT[locale].detail.contractLabel;
  const [numar, setNumar] = useState(numarContract ?? "");
  const [data, setData] = useState(dataSemnare ?? "");
  const [status, setStatus] = useState<ContractStatus | "">(contractStatus ?? "");
  const [pending, setPending] = useState(false);
  const [salvat, setSalvat] = useState(false);

  async function salveaza() {
    setPending(true);
    setSalvat(false);
    await actualizeazaContract(orgSlug, companyId, {
      numarContract: numar.trim() || null,
      dataSemnare: data || null,
      contractStatus: status || null,
    });
    setPending(false);
    setSalvat(true);
    router.refresh();
    setTimeout(() => setSalvat(false), 1500);
  }

  return (
    <div className="max-w-md space-y-3">
      <p className="text-[13px] text-[var(--ci-text-muted)]">{dict.intro}</p>
      <div>
        <Label>{dict.numarContract}</Label>
        <Input value={numar} onChange={(e) => setNumar(e.target.value)} placeholder={dict.numarPlaceholder} />
      </div>
      <div>
        <Label>{dict.dataSemnarii}</Label>
        <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>
      <div>
        <Label>{dict.status}</Label>
        <Select value={status} onChange={(e) => setStatus(e.target.value as ContractStatus | "")}>
          <option value="">{dict.faraStatus}</option>
          <option value="trimis">{contractLabel.trimis}</option>
          <option value="asteptare">{contractLabel.asteptare}</option>
          <option value="semnat">{contractLabel.semnat}</option>
          <option value="anulat">{contractLabel.anulat}</option>
        </Select>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button variant="primary" onClick={salveaza} disabled={pending}>
          {pending ? dict.seSalveaza : dict.salveaza}
        </Button>
        {salvat && <span className="text-[12px] text-[var(--ci-green)]">{dict.salvat}</span>}
      </div>
    </div>
  );
}
