"use client";

import { ExternalLink, Search, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { NUME_FURNIZOR, type Furnizor } from "@/lib/prospectare/motor";

import { Badge } from "../../components/ui/badge";
import { Card, CardHeader } from "../../components/ui/card";
import { CrediteFurnizori } from "./credite-furnizori";
import { aprobaCandidatAction, cautaDecidentiPentruFirma, respingeCandidatAction, type RezultatActiune, type StareProspectare } from "./prospectare-actions";

// „Decidenți găsiți”: caută persoane de decizie pentru firmă cu cheile organizației (Lusha, Apollo, Prospeo, Hunter) și le păstrează în „De aprobat” până le aprobă cineva.
// La aprobare, persoana poate fi trimisă și în lista Waalaxy aleasă de organizație (abordare pe LinkedIn).
export function DecidentiCard({ orgSlug, companyId, stare }: { orgSlug: string; companyId: string; stare: StareProspectare }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rezultat, setRezultat] = useState<RezultatActiune | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [nuMaiPropune, setNuMaiPropune] = useState<Record<string, boolean>>({});
  const [inWaalaxy, setInWaalaxy] = useState<Record<string, boolean>>({});
  const [avertisment, setAvertisment] = useState<string | null>(null);
  const [versiuneCredite, setVersiuneCredite] = useState(0); // crește după fiecare căutare, ca să se recitească creditele
  const faraChei = stare.furnizoriConfigurati.length === 0;

  const cauta = () =>
    startTransition(async () => {
      setEroare(null);
      setRezultat(null);
      const r = await cautaDecidentiPentruFirma(orgSlug, companyId);
      if (!r.ok) setEroare(r.eroare ?? "Căutarea nu a reușit.");
      else setRezultat(r);
      setVersiuneCredite((v) => v + 1);
      router.refresh();
    });

  const ruleaza = (f: () => Promise<{ error: string | null; avertisment?: string }>) =>
    startTransition(async () => {
      setEroare(null);
      setAvertisment(null);
      const r = await f();
      if (r.error) setEroare(r.error);
      else if (r.avertisment) setAvertisment(r.avertisment);
      router.refresh();
    });

  return (
    <Card>
      <CardHeader
        title={`Decidenți găsiți${stare.candidati.length ? ` (${stare.candidati.length})` : ""}`}
        subtitle={
          faraChei
            ? "Adaugă cheile tale de la Lusha, Apollo, Prospeo sau Hunter ca să cauți decidenți pentru firmă."
            : `Căutare cu contul tău la ${stare.furnizoriConfigurati.map((f: Furnizor) => NUME_FURNIZOR[f]).join(", ")}. Persoanele găsite devin contacte abia după ce le aprobi.`
        }
        action={
          faraChei ? (
            <Link href={`/${orgSlug}/crm/setari#prospectare`} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
              Adaugă cheile
            </Link>
          ) : (
            <button
              type="button"
              onClick={cauta}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              <Search className="h-3.5 w-3.5" aria-hidden /> {pending ? "Se caută…" : "Caută decidenți"}
            </button>
          )
        }
      />

      <CrediteFurnizori orgSlug={orgSlug} versiune={versiuneCredite} />

      {eroare && <p className="mb-3 rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[12.5px] text-[var(--ci-red)]">{eroare}</p>}
      {avertisment && <p className="mb-3 rounded-lg bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] text-[var(--ci-amber)]">{avertisment}</p>}
      {rezultat && (
        <p className="mb-3 rounded-lg bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] text-[var(--ci-text-muted)]">
          {rezultat.noi ? `Am găsit ${rezultat.noi} ${rezultat.noi === 1 ? "persoană nouă" : "persoane noi"} pentru aprobare.` : rezultat.gasiti ? "Persoanele găsite erau deja în contacte sau în lista ta." : "Nu am găsit persoane noi pentru această firmă."}
          {rezultat.avertismente && rezultat.avertismente.length > 0 && <span className="mt-1 block text-[var(--ci-amber)]">{rezultat.avertismente.join(" ")}</span>}
        </p>
      )}

      {stare.candidati.length > 0 && (
        <ul className="space-y-2">
          {stare.candidati.map((c) => (
            <li key={c.id} className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-[var(--ci-text)]">
                    {c.nume}
                    {c.rol && <span className="font-normal text-[var(--ci-text-muted)]"> · {c.rol}</span>}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-[var(--ci-text-muted)]">
                    <Badge tone="blue" icon={false}>
                      {NUME_FURNIZOR[c.sursa as Furnizor] ?? c.sursa}
                    </Badge>
                    {c.dept && <span>{c.dept}</span>}
                    {c.email ? (
                      <span>
                        {c.email}{" "}
                        {c.emailStatus === "valid" && <Badge tone="green" icon={false}>e-mail verificat</Badge>}
                        {c.emailStatus === "risky" && <Badge tone="amber" icon={false}>e-mail riscant</Badge>}
                      </span>
                    ) : (
                      <span>fără e-mail</span>
                    )}
                    {c.linkedin && (
                      <a href={c.linkedin.startsWith("http") ? c.linkedin : `https://${c.linkedin}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[var(--ci-blue)] hover:underline">
                        LinkedIn <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => ruleaza(() => aprobaCandidatAction(orgSlug, c.id, Boolean(inWaalaxy[c.id] && c.linkedin)))}
                    className="inline-flex items-center gap-1 rounded-md bg-[var(--ci-green)] px-2.5 py-1.5 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    <UserCheck className="h-3.5 w-3.5" aria-hidden /> Adaugă la contacte
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => ruleaza(() => respingeCandidatAction(orgSlug, c.id, Boolean(nuMaiPropune[c.id])))}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--ci-border)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] disabled:opacity-60"
                  >
                    <UserX className="h-3.5 w-3.5" aria-hidden /> Respinge
                  </button>
                </div>
              </div>
              {stare.waalaxyGata && c.linkedin && (
                <label className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-[var(--ci-text-muted)]">
                  <input type="checkbox" checked={Boolean(inWaalaxy[c.id])} onChange={(e) => setInWaalaxy((v) => ({ ...v, [c.id]: e.target.checked }))} />
                  La adăugare: trimite-o și în Waalaxy (abordare pe LinkedIn)
                </label>
              )}
              <label className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-[var(--ci-text-muted)]">
                <input type="checkbox" checked={Boolean(nuMaiPropune[c.id])} onChange={(e) => setNuMaiPropune((v) => ({ ...v, [c.id]: e.target.checked }))} />
                La respingere: nu o mai propune deloc, pentru nicio firmă
              </label>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--ci-text-faint)]">
        Azi: {stare.apeluriAzi} din {stare.limitaApeluri} apeluri către furnizori. Persoanele adăugate ca contacte trebuie informate în cel mult 30 de zile despre prelucrarea datelor lor (art. 14 GDPR).
      </p>
    </Card>
  );
}
