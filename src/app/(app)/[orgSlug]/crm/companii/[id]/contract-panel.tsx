"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "../../components/ui/button";
import { Input, Label, Select } from "../../components/ui/input";
import { useLocale } from "../../lib/locale-context";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import { actualizeazaContract } from "../actions";
import { buildContract, ONG_CAMPURI, type ContractTip, type ContractVals } from "@/lib/contract-sponsorizare";
import { citesteDateOng, salveazaDateOng } from "./contract-actions";

type ContractStatus = "trimis" | "asteptare" | "semnat" | "anulat";

export function ContractPanel({
  companyId,
  numarContract,
  dataSemnare,
  contractStatus,
  firma,
}: {
  companyId: string;
  numarContract: string | null;
  dataSemnare: string | null;
  contractStatus: ContractStatus | null;
  firma: {
    nume: string; cui: string | null; nrRegCom: string | null; judet: string | null; localitate: string | null;
    adresa: string | null; administrator: string | null; sumaPropusa: number | null;
  };
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

  // ----- Generator contract de sponsorizare (fără semnătură electronică) -----
  const [tip, setTip] = useState<ContractTip>("d177");
  const [v, setV] = useState<ContractVals>({
    nume: firma.nume,
    sediu: [firma.localitate, firma.adresa].filter((x) => x && x.trim()).join(", "),
    judet: firma.judet ?? "",
    cui: firma.cui ?? "",
    reg: firma.nrRegCom ?? "",
    rep: firma.administrator ?? "",
    fct: "Administrator",
    iban: "",
    banca: "",
    suma: firma.sumaPropusa ? String(firma.sumaPropusa) : "",
    nr: numarContract ?? "",
    data: dataSemnare ?? "",
    caz: "",
    resp: "",
  });
  const [ong, setOng] = useState<Record<string, string>>({});
  const [ongSalvat, setOngSalvat] = useState<string | null>(null);
  useEffect(() => {
    let anulat = false;
    citesteDateOng(orgSlug).then((d) => {
      if (!anulat) setOng(d);
    });
    return () => {
      anulat = true;
    };
  }, [orgSlug]);
  const setCamp = (k: keyof ContractVals) => (e: React.ChangeEvent<HTMLInputElement>) => setV((p) => ({ ...p, [k]: e.target.value }));

  function html() {
    return buildContract(v, tip, ong);
  }
  function descarcaWord() {
    const blob = new Blob(["\ufeff" + html()], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Contract_${tip === "d177" ? "D177" : "20la-suta"}_${(v.nume || "firma").replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 40)}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  function tipareste() {
    const w = window.open("", "_blank");
    if (!w) {
      alert("Permite ferestrele pop-up pentru a genera PDF-ul.");
      return;
    }
    w.document.write(html() + "<script>window.onload=function(){setTimeout(function(){window.print()},250)}</" + "script>");
    w.document.close();
  }
  async function salveazaOng() {
    setOngSalvat(null);
    try {
      const r = await salveazaDateOng(orgSlug, ong);
      setOngSalvat(r.ok ? "Salvat ✓" : (r.error ?? "Eroare"));
    } catch {
      setOngSalvat("Doar administratorii pot salva datele ONG-ului.");
    }
  }

  return (
    <div className="space-y-6">
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

    <div className="max-w-3xl space-y-4 border-t border-[var(--ci-border)] pt-5">
      <div>
        <h3 className="text-[14px] font-bold text-[var(--ci-text)]">Generează contract de sponsorizare</h3>
        <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">
          Completat din datele firmei; îl descarci în Word sau îl tipărești ca PDF și îl semnezi în afara platformei.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {([["d177", "D177 · redirecționare impozit"], ["mec20", "20% · sponsorizare directă"]] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTip(k)}
            className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              tip === k
                ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]"
                : "border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:border-[var(--ci-border-strong)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {([
          ["nume", "Denumire firmă"], ["rep", "Reprezentant"], ["fct", "Funcția"], ["cui", "CUI"], ["reg", "Nr. Reg. Com."],
          ["sediu", "Sediu (localitate, adresă)"], ["judet", "Județ"], ["iban", "IBAN firmă"], ["banca", "Banca"],
          ["suma", "Sumă (RON)"], ["nr", "Nr. contract"], ["caz", "Caz asociat"], ["resp", "Responsabil firmă"],
        ] as [keyof ContractVals, string][]).map(([k, label]) => (
          <div key={k}>
            <Label>{label}</Label>
            <Input value={v[k]} onChange={setCamp(k)} />
          </div>
        ))}
        <div>
          <Label>Data</Label>
          <Input type="date" value={v.data} onChange={setCamp("data")} />
        </div>
      </div>

      <details className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3">
        <summary className="cursor-pointer text-[13px] font-medium text-[var(--ci-text)]">Datele ONG-ului (beneficiar) — apar în toate contractele</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {ONG_CAMPURI.map((c) => (
            <div key={c.key}>
              <Label>{c.label}</Label>
              <Input value={ong[c.key] ?? ""} onChange={(e) => setOng((p) => ({ ...p, [c.key]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button variant="secondary" onClick={salveazaOng}>Salvează datele ONG-ului</Button>
          {ongSalvat && <span className="text-[12px] text-[var(--ci-text-muted)]">{ongSalvat}</span>}
        </div>
      </details>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={descarcaWord}>📄 Descarcă Word</Button>
        <Button variant="secondary" onClick={tipareste}>🖨 Tipărește / PDF</Button>
      </div>
    </div>
    </div>
  );
}
