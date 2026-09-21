"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { buildContract, ONG_CAMPURI, type ContractTip, type ContractVals } from "@/lib/contract-sponsorizare";

import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input, Label } from "../../components/ui/input";
import { citesteDateOng, salveazaDateOng } from "./contract-actions";

// Contractul de sponsorizare, precompletat cu datele firmei și afișat în josul paginii:
// alegi formatul (D177 sau 20%), completezi ce lipsește (IBAN, bancă, sumă) și vezi documentul
// în timp real. Se descarcă Word sau se tipărește PDF; semnarea se face în afara platformei.
export type FirmaContract = {
  nume: string;
  cui: string | null;
  nrRegCom: string | null;
  judet: string | null;
  localitate: string | null;
  adresa: string | null;
  administrator: string | null;
  sumaPropusa: number | null;
  numarContract: string | null;
  dataSemnare: string | null;
  emailSemnatar: string | null;
  responsabil: string | null;
  mec20: boolean;
};

export function ContractSponsorizareSection({ firma }: { firma: FirmaContract }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [tip, setTip] = useState<ContractTip>(firma.mec20 ? "mec20" : "d177");
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
    nr: firma.numarContract ?? "",
    data: firma.dataSemnare ?? "",
    caz: "",
    resp: firma.responsabil ?? "",
  });
  const [email, setEmail] = useState(firma.emailSemnatar ?? "");
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

  const html = useMemo(() => buildContract(v, tip, ong), [v, tip, ong]);
  const setCamp = (k: keyof ContractVals) => (e: React.ChangeEvent<HTMLInputElement>) => setV((p) => ({ ...p, [k]: e.target.value }));
  const numeFisier = `Contract_${tip === "d177" ? "D177" : "20la-suta"}_${(v.nume || "firma").replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 40)}`;

  function descarcaWord() {
    const blob = new Blob(["\uFEFF" + html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${numeFisier}.doc`;
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
    w.document.write(html + "<script>window.onload=function(){setTimeout(function(){window.print()},250)}</" + "script>");
    w.document.close();
  }
  function trimiteEmail() {
    const subiect = `Contract de sponsorizare — ${ong.ongNume || ""}`.trim();
    const corp = `Bună ziua,\n\nVă trimit atașat contractul de sponsorizare (${tip === "d177" ? "D177" : "20%"}) pentru ${v.nume}.\n\nCu mulțumiri,\n${v.resp || ""}`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subiect)}&body=${encodeURIComponent(corp)}`;
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
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--ci-text)]">Contract de sponsorizare</h2>
          <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">Precompletat cu datele firmei — verifică, completează ce lipsește și descarcă.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[var(--ci-text-muted)]">Format:</span>
          {([["d177", "D177 (redirecționare impozit)"], ["mec20", "20% (sponsorizare directă)"]] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTip(k)}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                tip === k ? "border-[var(--ci-primary)] bg-[var(--ci-primary)] text-white" : "border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:border-[var(--ci-border-strong)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {([
          ["nume", "Denumire sponsor"], ["cui", "CUI"], ["reg", "Nr. Reg. Com."],
          ["sediu", "Sediu (adresă)"], ["judet", "Județ"], ["iban", "IBAN"],
          ["banca", "Banca"], ["rep", "Reprezentant legal"], ["fct", "Funcție"],
          ["suma", "Sumă (RON)"], ["nr", "Nr. contract"],
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
        <div>
          <Label>Caz asociat (opțional)</Label>
          <Input value={v.caz} onChange={setCamp("caz")} />
        </div>
        <div>
          <Label>Responsabil (opțional)</Label>
          <Input value={v.resp} onChange={setCamp("resp")} />
        </div>
        <div>
          <Label>Email sponsor (semnatar)</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>

      <details className="mt-4 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3">
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

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" onClick={descarcaWord}>📄 Descarcă Word</Button>
        <Button variant="secondary" onClick={tipareste}>🖨 Tipărește / PDF</Button>
        <Button variant="secondary" onClick={trimiteEmail} disabled={!email}>✉ Pregătește emailul</Button>
      </div>

      <p className="mt-5 mb-2 text-[12px] font-bold tracking-wide text-[var(--ci-text-muted)] uppercase">Previzualizare</p>
      <iframe title="Previzualizare contract" sandbox="" srcDoc={html} className="h-[640px] w-full rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-white" />
    </Card>
  );
}
