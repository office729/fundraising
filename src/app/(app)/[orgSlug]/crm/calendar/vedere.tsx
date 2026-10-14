import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { ETICHETE_TIP_EVENIMENT, NUME_LUNI, grilaLuna, grupeazaPeZile, lunaVecina, type EvenimentCalendar, type TipEveniment } from "@/lib/calendar-fundraising";

import { Card } from "../components/ui/card";

// Culoarea fiecărui tip de eveniment (puncte și etichete); termenele care cer acțiune sunt în roșu sau chihlimbar, momentele de campanie în albastru.
const CULOARE: Record<TipEveniment, string> = {
  grant: "var(--ci-red)",
  raportare: "var(--ci-orange)",
  fiscal: "var(--ci-pink)",
  campanie: "var(--ci-green)",
  obiectiv: "var(--ci-purple)",
  followup: "var(--ci-amber)",
  voluntari: "var(--ci-teal)",
  moment: "var(--ci-blue)",
};

// Forma completează culoarea: termenele care cer acțiune (grant, raportare, fiscal) nu sunt cercuri, deci se disting și fără culori.
const FORMA: Record<TipEveniment, string> = {
  grant: "rounded-sm",
  raportare: "rounded-sm rotate-45",
  fiscal: "rotate-45 scale-90 rounded-[1px]",
  campanie: "rounded-full",
  obiectiv: "rounded-full",
  followup: "rounded-full",
  voluntari: "rounded-full",
  moment: "rounded-full",
};

function Punct({ tip, mic }: { tip: TipEveniment; mic?: boolean }) {
  return <span className={`inline-block shrink-0 ${mic ? "h-1.5 w-1.5" : "h-2 w-2"} ${FORMA[tip]}`} style={{ background: CULOARE[tip] }} aria-hidden />;
}

// Termenele de acțiune care au trecut sau cad azi se marchează în listă (la „moment de campanie” sau „follow-up” nu are rost).
const CERE_ACTIUNE: TipEveniment[] = ["grant", "raportare", "obiectiv", "followup"];

const ZILE_SAPTAMANA = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"];

const zi = (data: string) => Number(data.slice(8, 10));
const dataLunga = (data: string) => new Date(`${data}T12:00:00`).toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" });

function Eticheta({ tip }: { tip: TipEveniment }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--ci-text-muted)]">
      <Punct tip={tip} />
      {ETICHETE_TIP_EVENIMENT[tip]}
    </span>
  );
}

// Calendarul lunii: grila, legenda și lista pe zile. Primește evenimentele gata calculate (vezi page.tsx), deci nu atinge baza de date.
export function CalendarVedere({ orgSlug, an, luna, azi, evenimente }: { orgSlug: string; an: number; luna: number; azi: string; evenimente: EvenimentCalendar[] }) {
  const grila = grilaLuna(an, luna, azi);
  const pe = grupeazaPeZile(evenimente);
  const prefixLuna = `${an}-${String(luna).padStart(2, "0")}`;
  const zileCuEvenimente = [...pe.keys()].filter((d) => d.startsWith(prefixLuna));
  const link = (l: string) => `/${orgSlug}/crm/calendar?luna=${l}`;
  const butonNav = "inline-flex h-9 w-9 items-center justify-center rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]";

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]" aria-hidden>
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <h1 className="ci-display text-xl font-bold text-[var(--ci-text)]">Calendar de fundraising</h1>
            <p className="mt-0.5 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">
              Termene de granturi, sfârșituri de campanie, follow-up-uri la companii, ture de voluntari și momentele din an bune pentru o campanie, într-o singură vedere.
            </p>
          </div>
        </div>
        <nav aria-label="Schimbă luna" className="flex items-center gap-2">
          <Link prefetch={false} href={link(lunaVecina(an, luna, -1))} className={butonNav} aria-label="Luna anterioară">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="ci-display min-w-[9.5rem] text-center text-[15px] font-semibold text-[var(--ci-text)] capitalize">
            {NUME_LUNI[luna - 1]} {an}
          </span>
          <Link prefetch={false} href={link(lunaVecina(an, luna, 1))} className={butonNav} aria-label="Luna următoare">
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link prefetch={false} href={`/${orgSlug}/crm/calendar`} className="inline-flex h-9 items-center rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 text-[13px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
            Azi
          </Link>
        </nav>
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[var(--ci-border)] bg-[var(--ci-surface-2)] text-center text-[12px] font-medium text-[var(--ci-text-muted)]">
          {ZILE_SAPTAMANA.map((z) => (
            <div key={z} className="py-2">
              {z}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grila.saptamani.flat().map((z) => {
            const lista = pe.get(z.data) ?? [];
            return (
              <div key={z.data} className={`min-h-[4.5rem] border-r border-b border-[var(--ci-border)] p-1.5 last:border-r-0 sm:min-h-[6.5rem] ${z.inLuna ? "" : "bg-[var(--ci-surface-2)]/60 opacity-60"}`}>
                {lista.length > 0 && z.inLuna ? (
                  <a href={`#zi-${z.data}`} className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] font-semibold tabular-nums hover:underline ${z.azi ? "bg-[var(--ci-primary)] text-white" : "text-[var(--ci-text)]"}`} aria-current={z.azi ? "date" : undefined} aria-label={`${dataLunga(z.data)}: ${lista.length} ${lista.length === 1 ? "eveniment" : "evenimente"}`}>
                    {zi(z.data)}
                  </a>
                ) : (
                  <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] tabular-nums ${z.azi ? "bg-[var(--ci-primary)] font-bold text-white" : "text-[var(--ci-text-muted)]"}`} aria-current={z.azi ? "date" : undefined}>
                    {zi(z.data)}
                  </span>
                )}
                {/* Pe ecran mic: doar puncte colorate; pe ecran mare: titlurile (cel mult trei, restul într-un „+N”). */}
                <div className="mt-1 flex flex-wrap gap-1 sm:hidden" aria-hidden>
                  {lista.slice(0, 4).map((e) => (
                    <Punct key={e.id} tip={e.tip} />
                  ))}
                </div>
                <ul className="mt-1 hidden space-y-0.5 sm:block">
                  {lista.slice(0, 3).map((e) => (
                    <li key={e.id}>
                      {e.href ? (
                        <Link prefetch={false} href={e.href} title={e.titlu} className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11.5px] leading-tight text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
                          <Punct tip={e.tip} mic />
                          <span className="truncate">{e.titlu}</span>
                        </Link>
                      ) : (
                        <span title={e.titlu} className="flex items-center gap-1 truncate px-1 py-0.5 text-[11.5px] leading-tight text-[var(--ci-text)]">
                          <Punct tip={e.tip} mic />
                          <span className="truncate">{e.titlu}</span>
                        </span>
                      )}
                    </li>
                  ))}
                  {lista.length > 3 && <li className="px-1 text-[11px] text-[var(--ci-text-muted)]">+{lista.length - 3} în plus</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Legendă">
        {(Object.keys(ETICHETE_TIP_EVENIMENT) as TipEveniment[]).map((t) => (
          <Eticheta key={t} tip={t} />
        ))}
      </div>

      <Card>
        <h2 className="ci-display mb-3 text-[15px] font-semibold text-[var(--ci-text)]">Lista lunii</h2>
        {zileCuEvenimente.length === 0 ? (
          <p className="text-[13px] text-[var(--ci-text-muted)]">Nimic programat în această lună.</p>
        ) : (
          <ul className="divide-y divide-[var(--ci-border)]">
            {zileCuEvenimente.map((d) => (
              <li key={d} id={`zi-${d}`} className="grid scroll-mt-4 grid-cols-1 gap-1 py-3 sm:grid-cols-[11rem_1fr]">
                <p className={`text-[13px] font-medium capitalize ${d === azi ? "text-[var(--ci-primary)]" : "text-[var(--ci-text)]"}`}>
                  {dataLunga(d)}
                  {d === azi ? " · azi" : ""}
                </p>
                <ul className="space-y-1.5">
                  {(pe.get(d) ?? []).map((e) => (
                    <li key={e.id} className="flex items-start gap-2 text-[13px]">
                      <span className="mt-1.5"><Punct tip={e.tip} /></span>
                      <span className="min-w-0">
                        {e.href ? (
                          <Link prefetch={false} href={e.href} className="font-medium text-[var(--ci-text)] hover:underline">
                            {e.titlu}
                          </Link>
                        ) : (
                          <span className="font-medium text-[var(--ci-text)]">{e.titlu}</span>
                        )}
                        <span className="block text-[12px] text-[var(--ci-text-muted)]">
                          {ETICHETE_TIP_EVENIMENT[e.tip]}
                          {e.detaliu ? ` · ${e.detaliu}` : ""}
                          {CERE_ACTIUNE.includes(e.tip) && e.data < azi && <b className="ml-1.5 font-semibold text-[var(--ci-red)]">· Depășit</b>}
                          {CERE_ACTIUNE.includes(e.tip) && e.data === azi && <b className="ml-1.5 font-semibold text-[var(--ci-red)]">· Azi</b>}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[12px] text-[var(--ci-text-muted)]">
          Termenele fiscale și momentele de campanie sunt orientative: verifică termenele oficiale pe anaf.ro. Termenele de granturi se adaugă din pagina Granturi.
        </p>
      </Card>
    </div>
  );
}
