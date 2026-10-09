"use client";

import { AlertOctagon, CheckCircle2, CircleDashed, Clock, Flag, Link2, MoreHorizontal, Repeat, ShieldAlert, ShieldCheck, Target } from "lucide-react";

import { ETICHETE_PRIORITATE, ETICHETE_STATUS_ACT, type Prioritate, type StatusActivitate } from "@/lib/performanta-activitati-reguli";
import type { ActivitateDto } from "@/lib/performanta-activitati-tipuri";

import { Avatar } from "../components/ui/avatar";
import { DropdownItem, DropdownMenu } from "../components/ui/dropdown-menu";
import { useActivitati } from "./activitati-context";
import { dataScurta } from "./ui-comune";

const STIL_STATUS: Record<StatusActivitate, { Icon: typeof Clock; clasa: string }> = {
  de_facut: { Icon: CircleDashed, clasa: "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]" },
  in_lucru: { Icon: Clock, clasa: "bg-[var(--ci-blue-soft)] text-[var(--ci-blue)]" },
  in_asteptare: { Icon: Clock, clasa: "bg-[var(--ci-amber-soft)] text-[var(--ci-amber)]" },
  blocat: { Icon: AlertOctagon, clasa: "bg-[var(--ci-red-soft)] text-[var(--ci-red)]" },
  finalizat: { Icon: CheckCircle2, clasa: "bg-[var(--ci-green-soft)] text-[var(--ci-green)]" },
  anulat: { Icon: CircleDashed, clasa: "bg-[var(--ci-surface-2)] text-[var(--ci-text-faint)]" },
};

export function StatusActivitateBadge({ status }: { status: StatusActivitate }) {
  const { Icon, clasa } = STIL_STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium whitespace-nowrap ${clasa}`}>
      <Icon className="size-3.5" aria-hidden />
      {ETICHETE_STATUS_ACT[status]}
    </span>
  );
}

const CULOARE_PRIORITATE: Record<Prioritate, string> = { critica: "text-[var(--ci-red)]", mare: "text-[var(--ci-amber)]", medie: "text-[var(--ci-text-muted)]", scazuta: "text-[var(--ci-text-faint)]" };

export function PrioritateChip({ prioritate }: { prioritate: Prioritate }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${CULOARE_PRIORITATE[prioritate]}`}>
      <Flag className="size-3.5" aria-hidden />
      {ETICHETE_PRIORITATE[prioritate]}
    </span>
  );
}

// Cardul unei activități, folosit în listă, tablă, calendar și Spațiul meu. Acțiunea principală depinde de stare; restul sunt în meniu.
export function CardActivitate({ a, compact = false, arataResponsabil = true }: { a: ActivitateDto; compact?: boolean; arataResponsabil?: boolean }) {
  const { deschideForm, deschideBlocaj, deschideInchidere, actiune, ocupat } = useActivitati();
  const incheiata = a.status === "finalizat" || a.status === "anulat";
  const principala: { eticheta: string; tip: Parameters<typeof actiune>[1] } | null = incheiata
    ? null
    : a.status === "de_facut" || a.status === "in_asteptare"
      ? { eticheta: "Începe", tip: "start" }
      : a.status === "in_lucru"
        ? { eticheta: "Finalizează", tip: "finalizeaza" }
        : null;

  return (
    <div className={`rounded-[var(--ci-radius-card)] border bg-[var(--ci-surface)] ${a.intarziata ? "border-[var(--ci-red)]/40" : "border-[var(--ci-border)]"} ${compact ? "p-2.5" : "p-3.5"}`}>
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={() => a.poateEdita && deschideForm(a)} disabled={!a.poateEdita} className={`min-w-0 text-left text-[13.5px] font-semibold text-[var(--ci-text)] ${a.poateEdita ? "hover:underline" : "cursor-default"} focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${incheiata ? "line-through decoration-[var(--ci-text-faint)]" : ""}`}>
          <span className="line-clamp-3">{a.titlu}</span>
        </button>
        {a.poateEdita && (
          <DropdownMenu
            align="end"
            trigger={
              <button type="button" aria-label={`Mai multe acțiuni pentru ${a.titlu}`} aria-haspopup="menu" className="rounded p-1 text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
                <MoreHorizontal className="size-4" aria-hidden />
              </button>
            }
          >
            {(inchide) => (
              <>
                <DropdownItem onClick={() => { inchide(); deschideForm(a); }}>Editează</DropdownItem>
                {!incheiata && a.status !== "blocat" && <DropdownItem onClick={() => { inchide(); deschideBlocaj({ activitateId: a.id, titlu: a.titlu }); }}>Raportează un blocaj</DropdownItem>}
                {a.status === "blocat" && a.blocaj?.poateInchide && <DropdownItem onClick={() => { inchide(); deschideInchidere(a.blocaj!); }}>Deschide blocajul</DropdownItem>}
                {a.status === "in_lucru" && <DropdownItem onClick={() => { inchide(); actiune(a, "asteptare"); }}>Pune în așteptare</DropdownItem>}
                {(a.status === "in_asteptare" || a.status === "in_lucru") && <DropdownItem onClick={() => { inchide(); actiune(a, "de_facut"); }}>Mută la „De făcut”</DropdownItem>}
                {incheiata && <DropdownItem onClick={() => { inchide(); actiune(a, "redeschide"); }}>Redeschide</DropdownItem>}
                {!incheiata && a.status !== "blocat" && <DropdownItem onClick={() => { inchide(); actiune(a, "finalizeaza"); }}>Finalizează</DropdownItem>}
                {!incheiata && <DropdownItem onClick={() => { inchide(); actiune(a, "anuleaza"); }}>Anulează</DropdownItem>}
                <DropdownItem danger onClick={() => { inchide(); actiune(a, "sterge"); }}>Șterge</DropdownItem>
              </>
            )}
          </DropdownMenu>
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <StatusActivitateBadge status={a.status} />
        <PrioritateChip prioritate={a.prioritate} />
        {a.termen && (
          <span className={`inline-flex items-center gap-1 text-[12px] ${a.intarziata ? "font-medium text-[var(--ci-red)]" : "text-[var(--ci-text-muted)]"}`}>
            <Clock className="size-3.5" aria-hidden />
            {dataScurta(a.termen)}
            {a.intarziata && " · peste termen"}
          </span>
        )}
        {a.efortOre !== null && <span className="ci-tabular text-[12px] text-[var(--ci-text-muted)]">{String(a.efortOre).replace(".", ",")} h</span>}
        {a.recurenta !== "nu" && (
          <span className="inline-flex items-center gap-1 text-[12px] text-[var(--ci-text-muted)]">
            <Repeat className="size-3.5" aria-hidden />
            {a.recurenta === "saptamanal" ? "săptămânal" : "lunar"}
          </span>
        )}
      </div>

      {!compact && (a.obiectivTitlu || a.dependeDe || a.aprobareNecesara) && (
        <ul className="mt-2 space-y-1 text-[12px] text-[var(--ci-text-muted)]">
          {a.obiectivTitlu && (
            <li className="flex items-center gap-1.5">
              <Target className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                {a.obiectivTitlu}
                {a.rezultatTitlu && ` · ${a.rezultatTitlu}`}
              </span>
            </li>
          )}
          {a.dependeDe && (
            <li className="flex items-center gap-1.5">
              <Link2 className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                Depinde de „{a.dependeDe.titlu}”{a.dependeDe.status === "finalizat" ? " (gata)" : " (încă deschisă)"}
              </span>
            </li>
          )}
          {a.aprobareNecesara && (
            <li className="flex items-center gap-1.5">
              {a.aprobata ? <ShieldCheck className="size-3.5 shrink-0 text-[var(--ci-green)]" aria-hidden /> : <ShieldAlert className="size-3.5 shrink-0 text-[var(--ci-amber)]" aria-hidden />}
              {a.aprobata ? `Aprobată${a.aprobataDeNume ? ` de ${a.aprobataDeNume}` : ""}` : "Așteaptă aprobare"}
            </li>
          )}
        </ul>
      )}

      {a.blocaj && (
        <button type="button" onClick={() => a.blocaj?.poateInchide && deschideInchidere(a.blocaj)} className="mt-2 block w-full rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-2.5 py-1.5 text-left text-[12px] text-[var(--ci-red)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
          <strong>Blocată:</strong> {a.blocaj.motiv}
          <span className="block opacity-80">
            De rezolvat de {a.blocaj.rezolvatorNume ?? "—"} · revenire {dataScurta(a.blocaj.termenRevenire)}
            {a.blocaj.intarziat && " (termen depășit)"}
          </span>
        </button>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {arataResponsabil && a.responsabilNume ? (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] text-[var(--ci-text-muted)]">
            <Avatar name={a.responsabilNume} size="sm" className="!size-5 !text-[9px]" />
            <span className="truncate">{a.responsabilNume}</span>
          </span>
        ) : (
          <span />
        )}
        <div className="flex gap-1.5">
          {a.poateAproba && (
            <button type="button" disabled={ocupat} onClick={() => actiune(a, "aproba")} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-2.5 py-1 text-[12.5px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none disabled:opacity-50">
              Aprobă
            </button>
          )}
          {a.poateEdita && principala && (
            <button type="button" disabled={ocupat} onClick={() => actiune(a, principala.tip)} className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-2.5 py-1 text-[12.5px] font-medium text-white hover:bg-[var(--ci-primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:ring-offset-1 focus-visible:outline-none disabled:opacity-50">
              {principala.eticheta}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
