"use client";

import { AlertTriangle, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { faraDiacritice } from "@/lib/cautare";
import { linkAngajatiLinkedin } from "@/lib/pagini-sociale";

import { Card, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { comutaNegasit } from "../companii/[id]/fisa-actions";
import {
  getSponsoriZona,
  getTopCompaniiCaz,
  punePeLocInTop,
  scoateDinTop,
  seteazaStatusTop,
  type FirmaTop,
  type SponsorZona,
  type StatusTop,
  type TopCompaniiCaz,
} from "./top-companii-actions";

const STATUSURI: { k: StatusTop; eticheta: string; clasa: string }[] = [
  { k: "abordat", eticheta: "Abordat", clasa: "bg-[var(--ci-blue)] text-white border-[var(--ci-blue)]" },
  { k: "interesat", eticheta: "Interesat", clasa: "bg-[var(--ci-amber)] text-white border-[var(--ci-amber)]" },
  { k: "sponsor", eticheta: "Sponsor", clasa: "bg-[var(--ci-green)] text-white border-[var(--ci-green)]" },
  { k: "refuz", eticheta: "Refuz", clasa: "bg-[var(--ci-red)] text-white border-[var(--ci-red)]" },
];

const TREPTE = [
  { titlu: "Top 10", de: 1, pana: 10 },
  { titlu: "Locurile 11–30", de: 11, pana: 30 },
  { titlu: "Locurile 31–60", de: 31, pana: 60 },
  { titlu: "Locurile 61–100", de: 61, pana: 100 },
];

const lei = (n: number) => `${n.toLocaleString("ro-RO")} lei`;

export function TopCompaniiCard({ orgSlug, pageId }: { orgSlug: string; pageId: string }) {
  const [date, setDate] = useState<TopCompaniiCaz | null>(null);
  const [eroare, setEroare] = useState("");
  const [cauta, setCauta] = useState("");
  const [pending, start] = useTransition();

  const incarca = useCallback(async () => {
    try {
      setDate(await getTopCompaniiCaz(orgSlug, pageId));
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Nu am putut încărca panoul.");
    }
  }, [orgSlug, pageId]);

  useEffect(() => {
    getTopCompaniiCaz(orgSlug, pageId)
      .then(setDate)
      .catch((e) => setEroare(e instanceof Error ? e.message : "Nu am putut încărca panoul."));
  }, [orgSlug, pageId]);

  function actiune(fn: () => Promise<{ error: string | null } | void>) {
    setEroare("");
    start(async () => {
      try {
        const r = await fn();
        if (r && r.error) setEroare(r.error);
        await incarca();
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  }

  const q = faraDiacritice(cauta.trim());
  const firme = useMemo(() => (date?.firme ?? []).filter((f) => !q || faraDiacritice(f.nume).includes(q)), [date, q]);

  return (
    <Card>
      <CardHeader
        title={`Top 100 companii din județul cazului${date?.judet ? ` — ${date.judet}` : ""}`}
        subtitle="Doar firme noi, după cifra de afaceri. Firmele care au mai sponsorizat nu apar aici."
      />
      {eroare && <p className="mb-2 text-[13px] text-[var(--ci-red)]">{eroare}</p>}
      {!date && !eroare && <p className="text-[13px] text-[var(--ci-text-muted)]">Se încarcă…</p>}
      {date && !date.judet && <p className="text-[13px] text-[var(--ci-text-muted)]">Completează județul campaniei (butonul de editare) ca să vezi firmele din zonă.</p>}
      {date && date.judet && (
        <>
          <Input value={cauta} onChange={(e) => setCauta(e.target.value)} placeholder="Caută o firmă din panou…" className="mb-3 h-9 w-full sm:max-w-xs" />
          {firme.length === 0 && <p className="text-[13px] text-[var(--ci-text-muted)]">Nicio firmă găsită.</p>}
          <div className={`space-y-5 ${pending ? "opacity-70" : ""}`}>
            {TREPTE.map((t) => {
              const lista = firme.filter((f) => f.pozitie >= t.de && f.pozitie <= t.pana);
              if (lista.length === 0) return null;
              return (
                <section key={t.titlu}>
                  <h3 className="mb-2 text-[12px] font-bold tracking-wide text-[var(--ci-text-muted)] uppercase">{t.titlu}</h3>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {lista.map((f) => (
                      <FirmaCard key={f.id} orgSlug={orgSlug} pageId={pageId} f={f} actiune={actiune} pending={pending} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {date.scoase.length > 0 && (
            <details className="mt-5 rounded-lg bg-[var(--ci-surface-2)] p-3">
              <summary className="cursor-pointer text-[13px] font-semibold text-[var(--ci-text)]">Scoase din panou ({date.scoase.length})</summary>
              <ul className="mt-2 space-y-1.5">
                {date.scoase.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                    <span className="min-w-0 break-words text-[var(--ci-text)]">
                      {s.nume} <span className="text-[var(--ci-text-muted)]">— {s.motiv}</span>
                    </span>
                    <button type="button" disabled={pending} onClick={() => actiune(() => punePeLocInTop(orgSlug, pageId, s.id))} className="min-h-8 font-medium text-[var(--ci-primary)] hover:underline">
                      Pune înapoi
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </Card>
  );
}

function FirmaCard({
  orgSlug,
  pageId,
  f,
  actiune,
  pending,
}: {
  orgSlug: string;
  pageId: string;
  f: FirmaTop;
  actiune: (fn: () => Promise<{ error: string | null } | void>) => void;
  pending: boolean;
}) {
  const angajati = linkAngajatiLinkedin(f.linkedin);
  const linkOk = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);
  const li = linkOk(f.linkedin);
  const fb = linkOk(f.facebook);
  return (
    <div className="min-w-0 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="ci-tabular shrink-0 text-[11px] font-bold text-[var(--ci-text-faint)]">#{f.pozitie}</span>
            <Link href={`/${orgSlug}/crm/companii/${f.segment}?tab=contacte`} className="min-w-0 truncate text-[13px] font-semibold text-[var(--ci-text)] hover:underline">
              {f.nume}
            </Link>
            {li && (
              <a href={li} target="_blank" rel="noopener noreferrer" title="Pagina de LinkedIn" className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded px-1 text-[10px] leading-none font-bold text-white" style={{ background: "#0a66c2" }}>
                in
              </a>
            )}
            {fb && (
              <a href={fb} target="_blank" rel="noopener noreferrer" title="Pagina de Facebook" className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded px-1 text-[11px] leading-none font-bold text-white" style={{ background: "#1877f2" }}>
                f
              </a>
            )}
          </div>
          <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">
            {f.ca != null ? `CA ${lei(f.ca)}` : "CA necunoscută"} · {f.nrContacte > 0 ? `${f.nrContacte} contacte în CRM` : "Fără contact în CRM"}
          </p>
          {f.nrContacte === 0 && angajati && (
            <a href={angajati} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--ci-blue)] hover:underline">
              vezi angajații pe LinkedIn <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <button
          type="button"
          disabled={pending}
          title="Scoate din panou"
          onClick={() => {
            const motiv = window.prompt("De ce scoți firma din panou? (ex. are propria fundație)");
            if (motiv === null) return;
            actiune(() => scoateDinTop(orgSlug, pageId, f.id, motiv));
          }}
          className="flex min-h-8 shrink-0 items-center gap-1 rounded-[var(--ci-radius-btn)] px-1.5 text-[11px] font-medium text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-red)]"
        >
          <X className="h-3.5 w-3.5" /> Scoate din panou
        </button>
      </div>

      {f.altCaz && (
        <p className="mt-2 flex items-start gap-1.5 rounded-md bg-[var(--ci-amber-soft)] px-2 py-1 text-[12px] text-[var(--ci-amber)]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Deja lucrată la alt caz: {f.altCaz}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {STATUSURI.map((s) => {
          const activ = f.status === s.k;
          return (
            <button
              key={s.k}
              type="button"
              disabled={pending}
              aria-pressed={activ}
              onClick={() => actiune(() => seteazaStatusTop(orgSlug, pageId, f.id, activ ? null : s.k))}
              className={`min-h-8 rounded-full border px-3 text-[12px] font-semibold transition-colors ${activ ? s.clasa : "border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]"}`}
            >
              {s.eticheta}
            </button>
          );
        })}
      </div>

      <label className="mt-2 flex min-h-8 cursor-pointer items-center gap-2 text-[12px] text-[var(--ci-text-muted)]">
        <input type="checkbox" checked={f.negasit} disabled={pending} onChange={() => actiune(() => comutaNegasit(orgSlug, f.id, !f.negasit))} className="h-4 w-4" />
        Negăsit pe platforme — de căutat manual
      </label>
    </div>
  );
}

// 4.3 „Sponsori din zonă” — firmele din județ (București + Ilfov = o zonă) care au sponsorizat deja.
export function SponsoriZonaCard({ orgSlug, pageId }: { orgSlug: string; pageId: string }) {
  const [date, setDate] = useState<{ judet: string | null; sponsori: SponsorZona[] } | null>(null);
  const [eroare, setEroare] = useState("");

  useEffect(() => {
    getSponsoriZona(orgSlug, pageId)
      .then(setDate)
      .catch((e) => setEroare(e instanceof Error ? e.message : "Nu am putut încărca sponsorii."));
  }, [orgSlug, pageId]);

  return (
    <Card>
      <CardHeader title={`Sponsori din zonă${date?.judet ? ` — ${date.judet}` : ""}`} subtitle="Firme din județ care au sponsorizat deja (București și Ilfov sunt o singură zonă)." />
      {eroare && <p className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}
      {!date && !eroare && <p className="text-[13px] text-[var(--ci-text-muted)]">Se încarcă…</p>}
      {date && date.sponsori.length === 0 && <p className="text-[13px] text-[var(--ci-text-muted)]">{date.judet ? "Nicio firmă din zonă nu a sponsorizat încă." : "Completează județul campaniei."}</p>}
      {date && date.sponsori.length > 0 && (
        <div className="divide-y divide-[var(--ci-border)]">
          {date.sponsori.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2">
              <Link href={`/${orgSlug}/crm/companii/${s.segment}`} className="min-w-0 truncate text-[13px] font-medium text-[var(--ci-text)] hover:underline">
                {s.nume}
              </Link>
              <p className="ci-tabular text-[12px] text-[var(--ci-text-muted)]">
                bani deja alocați: <span className="font-semibold text-[var(--ci-text)]">{lei(s.sumaAlocata)}</span>
                {s.sumaNealocata != null && <> · nealocat: <span className="font-semibold text-[var(--ci-text)]">{lei(s.sumaNealocata)}</span></>}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
