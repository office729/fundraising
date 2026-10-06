"use client";

import { Check, ChevronDown, Copy, ExternalLink, Phone, UserPlus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cautaLinkedinPersoane, linkAngajatiLinkedin } from "@/lib/pagini-sociale";

import { Button } from "../../components/ui/button";
import { aprobaPersoane, respingePersoane } from "./fisa-actions";
import type { PersoanaDeAprobat } from "../actions";

export type ContactGhid = { id: string; nume: string; rol: string | null; email: string | null; telefon: string | null; cheie?: boolean; consentStatus?: string | null };
export type FirmaGhid = { id: string; nume: string; administrator: string | null; linkedin: string | null; site: string | null };

const linkClasa = "inline-flex items-center gap-1 font-medium text-[var(--ci-blue)] hover:underline";

function curataTel(t: string): string {
  return t.replace(/[^\d+]/g, "");
}

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClasa}>
      {children} <ExternalLink className="h-3 w-3" />
    </a>
  );
}

// ---------------------------------------------------------------- Planul B gratuit
export function PlanB({ firma, onAdaugaAdministrator }: { firma: FirmaGhid; onAdaugaAdministrator: () => void }) {
  const angajati = linkAngajatiLinkedin(firma.linkedin);
  const google = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  const pasi: React.ReactNode[] = [
    angajati ? (
      <Ext key="li" href={angajati}>Vezi angajații firmei pe LinkedIn</Ext>
    ) : (
      <Ext key="li" href={cautaLinkedinPersoane(firma.nume)}>Caută pe LinkedIn persoane „{firma.nume} director”</Ext>
    ),
  ];
  if (firma.administrator) {
    pasi.push(
      <span key="adm" className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
        Administratorul din registrul comerțului: <strong className="text-[var(--ci-text)]">{firma.administrator}</strong>
        <button type="button" onClick={onAdaugaAdministrator} className="inline-flex min-h-8 items-center gap-1 font-medium text-[var(--ci-primary)] hover:underline">
          <UserPlus className="h-3.5 w-3.5" /> Adaugă ca contact
        </button>
      </span>,
    );
  }
  if (firma.site && /^https?:\/\//i.test(firma.site)) pasi.push(<Ext key="site" href={firma.site}>Site-ul firmei — pagina de contact / echipă</Ext>);
  pasi.push(
    <span key="g" className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      Google:
      <Ext href={google(`"${firma.nume}" director general`)}>director general</Ext>
      <Ext href={google(`"${firma.nume}" director financiar`)}>director financiar</Ext>
      <Ext href={google(`"${firma.nume}" CSR`)}>CSR</Ext>
    </span>,
  );
  return (
    <div className="mt-3 rounded-lg bg-[var(--ci-surface-2)] p-3">
      <p className="text-[12px] font-bold tracking-wide text-[var(--ci-text-muted)] uppercase">Planul B gratuit</p>
      <ol className="mt-2 list-decimal space-y-2 pl-5 text-[13px] text-[var(--ci-text-muted)]">
        {pasi.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------- Pasul următor
// UN singur lucru de făcut acum, în ordinea de priorități din specificație. Contactele care au refuzat (consimțământ „nu”)
// sunt ignorate; cele „principale” (inimioara) au prioritate.
export function PasulUrmator({
  contacte,
  nrDeAprobat,
  firma,
  onAdaugaAdministrator,
}: {
  contacte: ContactGhid[];
  nrDeAprobat: number;
  firma: FirmaGhid;
  onAdaugaAdministrator: () => void;
}) {
  const active = contacte.filter((c) => c.consentStatus !== "nu").sort((a, b) => Number(!!b.cheie) - Number(!!a.cheie));
  const acceptatEmail = active.find((c) => c.consentStatus === "da" && c.email);
  const cuTelefon = active.find((c) => c.telefon);

  let titlu: string;
  let actiune: React.ReactNode = null;
  let ghid = false;
  let detaliu: React.ReactNode = null;

  if (nrDeAprobat > 0) {
    titlu = `Aprobă persoanele găsite (${nrDeAprobat})`;
    actiune = (
      <Button variant="primary" onClick={() => document.getElementById("de-aprobat")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
        Vezi lista
      </Button>
    );
  } else if (acceptatEmail) {
    titlu = `Trimite prezentarea lui ${acceptatEmail.nume} pe email`;
    actiune = (
      <a
        href={`mailto:${acceptatEmail.email}?subject=${encodeURIComponent("Parteneriat de sponsorizare")}`}
        className="inline-flex min-h-10 items-center rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90"
      >
        Scrie emailul
      </a>
    );
  } else if (cuTelefon) {
    titlu = `Sună-l pe ${cuTelefon.nume}${cuTelefon.rol ? ` (${cuTelefon.rol})` : ""}`;
    actiune = (
      <a href={`tel:${curataTel(cuTelefon.telefon!)}`} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-4 text-[14px] font-semibold text-white hover:opacity-90">
        <Phone className="h-4 w-4" /> {cuTelefon.telefon}
      </a>
    );
    detaliu = (
      <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">
        Reține (GDPR): spune cine ești, de unde ai datele (baze de date profesionale / LinkedIn), că scopul e un parteneriat de sponsorizare și că poate cere oricând ștergerea. Textul complet e mai jos.
      </p>
    );
  } else if (active.length > 0) {
    titlu = "Găsește un număr de telefon";
    detaliu = <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">Avem contacte, dar niciunul cu telefon. Încearcă pașii de mai jos.</p>;
    ghid = true;
  } else {
    titlu = "Firma nu are încă niciun contact";
    detaliu = <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">Caută persoana potrivită cu pașii de mai jos.</p>;
    ghid = true;
  }

  return (
    <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] p-4">
      <p className="text-[11px] font-bold tracking-wide text-[var(--ci-primary)] uppercase">Pasul următor</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-[15px] font-semibold text-[var(--ci-text)]">{titlu}</p>
        {actiune}
      </div>
      {detaliu}
      {ghid && <PlanB firma={firma} onAdaugaAdministrator={onAdaugaAdministrator} />}
    </div>
  );
}

// ---------------------------------------------------------------- Lista „De aprobat”
const EMAIL_STARE: Record<NonNullable<PersoanaDeAprobat["emailStare"]>, { text: string; clasa: string }> = {
  verificat: { text: "✓ verificat", clasa: "text-[var(--ci-green)]" },
  neverificat: { text: "neverificat", clasa: "text-[var(--ci-text-muted)]" },
  invalid: { text: "✗ invalid", clasa: "text-[var(--ci-red)]" },
  nesigur: { text: "nesigur", clasa: "text-[var(--ci-amber)]" },
};

function bifatImplicit(p: PersoanaDeAprobat): boolean {
  return /conducere|financiar/i.test(p.departament ?? "");
}

export function DeAprobat({ companyId, persoane }: { companyId: string; persoane: PersoanaDeAprobat[] }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [bifati, setBifati] = useState(() => new Set(persoane.filter(bifatImplicit).map((p) => p.id)));
  const [eroare, setEroare] = useState("");

  if (persoane.length === 0) return null;

  function ruleaza(tip: "aproba" | "respinge", ids: string[]) {
    if (ids.length === 0) return;
    if (tip === "respinge" && !window.confirm(`Respingi ${ids.length} ${ids.length === 1 ? "persoană" : "persoane"}? Datele lor se șterg definitiv.`)) return;
    setEroare("");
    start(async () => {
      const r = tip === "aproba" ? await aprobaPersoane(orgSlug, companyId, ids) : await respingePersoane(orgSlug, companyId, ids);
      if (r.error) setEroare(r.error);
      else router.refresh();
    });
  }

  const toti = persoane.map((p) => p.id);
  const bifatiLista = persoane.filter((p) => bifati.has(p.id)).map((p) => p.id);
  const btn = "min-h-9 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-[12px] font-semibold text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] disabled:opacity-50";

  return (
    <div id="de-aprobat" className="scroll-mt-4 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] font-bold text-[var(--ci-text)]">De aprobat ({persoane.length})</p>
        <p className="text-[12px] text-[var(--ci-text-muted)]">Persoane găsite, încă nu sunt în CRM.</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => ruleaza("aproba", toti)} className={`${btn} !border-[var(--ci-primary)] !bg-[var(--ci-primary)] !text-white`}>
          Aprobă tot
        </button>
        <button type="button" disabled={pending} onClick={() => setBifati(bifati.size === persoane.length ? new Set() : new Set(toti))} className={btn}>
          {bifati.size === persoane.length ? "Debifează tot" : "Bifează tot"}
        </button>
        <button type="button" disabled={pending || bifatiLista.length === 0} onClick={() => ruleaza("aproba", bifatiLista)} className={btn}>
          Aprobă bifații ({bifatiLista.length})
        </button>
        <button type="button" disabled={pending || bifatiLista.length === 0} onClick={() => ruleaza("respinge", bifatiLista)} className={btn}>
          Respinge bifații
        </button>
      </div>

      <div className="mt-3 divide-y divide-[var(--ci-border)]">
        {persoane.map((p) => {
          const stare = p.emailStare ? EMAIL_STARE[p.emailStare] : null;
          return (
            <div key={p.id} className="flex flex-wrap items-start gap-3 py-3">
              <input
                type="checkbox"
                checked={bifati.has(p.id)}
                onChange={() => {
                  const urm = new Set(bifati);
                  if (urm.has(p.id)) urm.delete(p.id);
                  else urm.add(p.id);
                  setBifati(urm);
                }}
                aria-label={`Bifează ${p.nume}`}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold break-words text-[var(--ci-text)]">
                  {p.nume}
                  {p.functie && <span className="font-normal text-[var(--ci-text-muted)]"> — {p.functie}</span>}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-[var(--ci-text-muted)]">
                  {p.departament && <span>{p.departament}</span>}
                  {p.sursa && <span>· sursă: {p.sursa}</span>}
                  {p.email && (
                    <span className="break-all">
                      · {p.email} {stare && <span className={stare.clasa}>({stare.text})</span>}
                    </span>
                  )}
                  {p.telefon && <span>· {p.telefon}</span>}
                  {p.linkedin && /^https?:\/\//i.test(p.linkedin) && (
                    <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className={linkClasa}>
                      LinkedIn <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" disabled={pending} onClick={() => ruleaza("aproba", [p.id])} className={`${btn} !text-[var(--ci-green)]`}>
                  Aprobă
                </button>
                <button type="button" disabled={pending} onClick={() => ruleaza("respinge", [p.id])} className={`${btn} !text-[var(--ci-red)]`}>
                  Respinge
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {eroare && <p className="mt-2 text-[13px] text-[var(--ci-red)]">{eroare}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Informare GDPR (art. 14)
function Copiaza({ text }: { text: string }) {
  const [copiat, setCopiat] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopiat(true);
          setTimeout(() => setCopiat(false), 1800);
        } catch {
          window.prompt("Copiază textul:", text);
        }
      }}
      className="inline-flex min-h-8 items-center gap-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-2.5 text-[12px] font-semibold text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
    >
      {copiat ? <Check className="h-3.5 w-3.5 text-[var(--ci-green)]" /> : <Copy className="h-3.5 w-3.5" />} {copiat ? "Copiat" : "Copiază"}
    </button>
  );
}

export function InformareGdpr({ orgNume, emailContact }: { orgNume: string; emailContact: string | null }) {
  const [deschis, setDeschis] = useState(false);
  const contact = emailContact ?? "adresa de email a organizației";
  const telefon = `Bună ziua, mă numesc [numele tău] și sunt de la ${orgNume}. Vă contactez în legătură cu un parteneriat de sponsorizare. Datele dumneavoastră profesionale (nume, funcție, date de contact) le avem din baze de date profesionale și de pe LinkedIn, și le folosim doar pentru acest scop, pe baza interesului nostru legitim de a propune parteneriate. Aveți dreptul de a ne cere oricând ștergerea datelor sau de a vă opune folosirii lor — spuneți-mi și le ștergem imediat sau scrieți-ne la ${contact}. Aveți un minut să vă povestesc despre ce este vorba?`;
  const email = `Informare privind datele personale: ${orgNume} vă contactează în legătură cu un parteneriat de sponsorizare. Datele dumneavoastră profesionale provin din baze de date profesionale și de pe LinkedIn și sunt folosite doar în acest scop, pe baza interesului nostru legitim. Aveți dreptul la ștergerea datelor și la opoziție: răspundeți cu STOP la acest email sau scrieți-ne la ${contact}, iar datele vor fi șterse.`;
  return (
    <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
      <button type="button" onClick={() => setDeschis((v) => !v)} aria-expanded={deschis} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-[13px] font-semibold text-[var(--ci-text)]">
        Ce spui la primul contact (GDPR)
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${deschis ? "rotate-180" : ""}`} />
      </button>
      {deschis && (
        <div className="space-y-4 border-t border-[var(--ci-border)] p-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-bold tracking-wide text-[var(--ci-text-muted)] uppercase">La telefon</p>
              <Copiaza text={telefon} />
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ci-text-muted)]">{telefon}</p>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-bold tracking-wide text-[var(--ci-text-muted)] uppercase">Pe email (sub semnătură)</p>
              <Copiaza text={email} />
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ci-text-muted)]">{email}</p>
          </div>
        </div>
      )}
    </div>
  );
}
