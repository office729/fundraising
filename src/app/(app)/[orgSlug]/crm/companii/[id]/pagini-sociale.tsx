"use client";

import { ExternalLink } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cautaFacebookFirma, cautaLinkedinFirma, linkAngajatiLinkedin } from "@/lib/pagini-sociale";

import { Input } from "../../components/ui/input";
import { comutaNegasit, seteazaPaginaSociala } from "./fisa-actions";

type Platforma = "linkedin" | "facebook";
const NUME: Record<Platforma, string> = { linkedin: "LinkedIn", facebook: "Facebook" };

function Rand({ companyId, nume, platforma, url, canEdit }: { companyId: string; nume: string; platforma: Platforma; url: string | null; canEdit: boolean }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editeaza, setEditeaza] = useState(false);
  const [valoare, setValoare] = useState("");
  const [eroare, setEroare] = useState("");
  const linkSigur = url && /^https?:\/\//i.test(url) ? url : null;
  const angajati = platforma === "linkedin" ? linkAngajatiLinkedin(linkSigur) : null;
  const cauta = platforma === "linkedin" ? cautaLinkedinFirma(nume) : cautaFacebookFirma(nume);

  function salveaza() {
    setEroare("");
    start(async () => {
      const r = await seteazaPaginaSociala(orgSlug, companyId, platforma, valoare);
      if (r.error) {
        setEroare(r.error);
        return;
      }
      setEditeaza(false);
      setValoare("");
      router.refresh();
    });
  }

  const link = "inline-flex items-center gap-1 font-medium text-[var(--ci-blue)] hover:underline";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
      <span className="w-[72px] shrink-0 font-semibold text-[var(--ci-text)]">{NUME[platforma]}</span>
      {editeaza ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Input
            autoFocus
            value={valoare}
            onChange={(e) => setValoare(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                salveaza();
              }
            }}
            placeholder={platforma === "linkedin" ? "linkedin.com/company/…" : "facebook.com/numele-paginii"}
            className="h-8 min-w-0 flex-1 text-[13px] sm:max-w-sm"
            disabled={pending}
          />
          <button type="button" onClick={salveaza} disabled={pending || !valoare.trim()} className="h-8 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-3 text-[12px] font-semibold text-white disabled:opacity-50">
            Salvează
          </button>
          <button
            type="button"
            onClick={() => {
              setEditeaza(false);
              setValoare("");
              setEroare("");
            }}
            className="text-[12px] text-[var(--ci-text-muted)] hover:underline"
          >
            Renunță
          </button>
          {eroare && <p className="basis-full text-[12px] text-[var(--ci-red)]">{eroare}</p>}
        </div>
      ) : linkSigur ? (
        <>
          <a href={linkSigur} target="_blank" rel="noopener noreferrer" className={link}>
            Pagina de {NUME[platforma]} <ExternalLink className="h-3 w-3" />
          </a>
          {angajati && (
            <a href={angajati} target="_blank" rel="noopener noreferrer" className={link}>
              Vezi angajații <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {canEdit && (
            <button type="button" onClick={() => setEditeaza(true)} className="text-[12px] text-[var(--ci-text-muted)] hover:underline">
              schimbă
            </button>
          )}
        </>
      ) : (
        <>
          <span className="text-[var(--ci-text-muted)]">Fără pagină de {NUME[platforma]}</span>
          <a href={cauta} target="_blank" rel="noopener noreferrer" className={link}>
            Caută pe {NUME[platforma]} <ExternalLink className="h-3 w-3" />
          </a>
          {canEdit && (
            <button type="button" onClick={() => setEditeaza(true)} className="font-medium text-[var(--ci-primary)] hover:underline">
              + Adaugă linkul
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function PaginiSociale({ companyId, nume, linkedin, facebook }: { companyId: string; nume: string; linkedin: string | null; facebook: string | null }) {
  return (
    <div className="mt-3 space-y-1.5 border-t border-[var(--ci-border)] pt-3">
      <Rand companyId={companyId} nume={nume} platforma="linkedin" url={linkedin} canEdit />
      <Rand companyId={companyId} nume={nume} platforma="facebook" url={facebook} canEdit />
    </div>
  );
}

// Marcajul „Negăsit pe platforme” — o singură formulare peste tot; se salvează cu data și cine a marcat.
export function NegasitMarcaj({ companyId, negasit }: { companyId: string; negasit: { la: string; deNume: string | null } | null }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const [pending, start] = useTransition();
  const explicatie = "Nimeni găsit în bazele de date — caută manual: LinkedIn, registrul comerțului, site, centrală";

  function comuta() {
    start(async () => {
      await comutaNegasit(orgSlug, companyId, !negasit);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {negasit ? (
        <span title={explicatie} className="rounded-full bg-[var(--ci-amber-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--ci-amber)]">
          Negăsit pe platforme
        </span>
      ) : null}
      {negasit && (
        <span className="text-[12px] text-[var(--ci-text-muted)]">
          marcat {new Date(negasit.la).toLocaleDateString("ro-RO")}
          {negasit.deNume ? ` de ${negasit.deNume}` : ""}
        </span>
      )}
      <button type="button" onClick={comuta} disabled={pending} title={explicatie} className="min-h-8 text-[12px] font-medium text-[var(--ci-primary)] hover:underline disabled:opacity-50">
        {negasit ? "Scoate marcajul" : "Marchează „Negăsit pe platforme”"}
      </button>
    </div>
  );
}
