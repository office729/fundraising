"use client";

import { BadgeCheck, CalendarClock, HandCoins, Mail, MailX, MessageSquareText, Phone, Send, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

import type { EvenimentCronologie, TipEveniment, TonEveniment } from "@/lib/cronologie-donator";
import { DONATORI_UI2_DICT } from "@/lib/i18n/dictionaries/donatori-ui-2";

import { EmptyState } from "../../../components/ui/states";
import { useLocale } from "../../../lib/locale-context";

// Cronologia donatorului: tot ce s-a întâmplat cu el, cele mai noi întâi, pe luni. Filtre simple după fel de eveniment.
const ICOANE: Record<TipEveniment, LucideIcon> = {
  donatie: HandCoins,
  donatie_importata: HandCoins,
  nota: MessageSquareText,
  apel: Phone,
  intalnire: Users,
  email_echipa: Send,
  parcurs: Mail,
  acord_email: BadgeCheck,
  dezabonare: MailX,
  adresa: MailX,
  marcaj: CalendarClock,
};
const CULOARE: Record<TonEveniment, string> = {
  verde: "bg-[var(--ci-green-soft)] text-[#17602f]",
  albastru: "bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]",
  galben: "bg-[var(--ci-amber-soft)] text-[#7a3e00]",
  rosu: "bg-[var(--ci-red-soft)] text-[#9b1c1c]",
  neutru: "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]",
};
const FILTRE: { cheie: string; tipuri: TipEveniment[] | null }[] = [
  { cheie: "toate", tipuri: null },
  { cheie: "donatii", tipuri: ["donatie", "donatie_importata"] },
  { cheie: "echipa", tipuri: ["nota", "apel", "intalnire", "email_echipa", "marcaj"] },
  { cheie: "emailuri", tipuri: ["parcurs", "acord_email", "dezabonare", "adresa"] },
];

// Evenimentele vin din lib/cronologie-donator.ts (construite pe server în limba curentă): se afișează ca atare.
// Grupare pe luni, pentru titluri de secțiune („octombrie 2026” / „October 2026”), în ordinea primită.
function grupeaza(evenimente: readonly EvenimentCronologie[], tag: string): { luna: string; evenimente: EvenimentCronologie[] }[] {
  const grupuri: { luna: string; evenimente: EvenimentCronologie[] }[] = [];
  for (const e of evenimente) {
    const luna = new Date(e.la).toLocaleDateString(tag, { timeZone: "Europe/Bucharest", month: "long", year: "numeric" });
    const ultimul = grupuri[grupuri.length - 1];
    if (ultimul && ultimul.luna === luna) ultimul.evenimente.push(e);
    else grupuri.push({ luna, evenimente: [e] });
  }
  return grupuri;
}

export function CronologiePanel({ evenimente }: { evenimente: EvenimentCronologie[] }) {
  const locale = useLocale();
  const t = DONATORI_UI2_DICT[locale].cronologie;
  const tag = locale === "ro" ? "ro-RO" : "en-GB";
  const dataOra = (iso: string) => new Date(iso).toLocaleString(tag, { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const [filtru, setFiltru] = useState("toate");
  const vizibile = useMemo(() => {
    const tipuri = FILTRE.find((f) => f.cheie === filtru)?.tipuri;
    return tipuri ? evenimente.filter((e) => tipuri.includes(e.tip)) : evenimente;
  }, [evenimente, filtru]);
  const grupuri = useMemo(() => grupeaza(vizibile, tag), [vizibile, tag]);

  if (evenimente.length === 0) return <EmptyState title={t.emptyTitlu} description={t.emptyDescriere} />;
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label={t.filtreaza}>
        {FILTRE.map((f) => (
          <button
            key={f.cheie}
            type="button"
            aria-pressed={filtru === f.cheie}
            onClick={() => setFiltru(f.cheie)}
            className={`min-h-10 rounded-full border px-3.5 text-[13px] font-semibold transition focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${filtru === f.cheie ? "border-[var(--ci-primary)] bg-[var(--ci-primary)] text-white" : "border-[var(--ci-border)] bg-[var(--ci-surface)] text-[var(--ci-text)] hover:border-[var(--ci-primary)]"}`}
          >
            {t.filtre[f.cheie]}
          </button>
        ))}
      </div>
      {vizibile.length === 0 ? (
        <p className="text-[13px] text-[var(--ci-text-muted)]">{t.nimic}</p>
      ) : (
        <div className="space-y-5">
          {grupuri.map((g) => (
            <section key={g.luna} aria-label={g.luna}>
              <h3 className="mb-2 text-[12px] font-semibold tracking-wide text-[var(--ci-text-muted)] uppercase">{g.luna}</h3>
              <ol className="space-y-2">
                {g.evenimente.map((e) => {
                  const Icoana = ICOANE[e.tip];
                  const tr = { titlu: e.titlu, detaliu: e.detaliu ?? null };
                  return (
                    <li key={e.id} className="flex gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3">
                      <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${CULOARE[e.ton]}`} aria-hidden>
                        <Icoana className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-semibold text-[var(--ci-text)]">{tr.titlu}</p>
                        {tr.detaliu && <p className="mt-0.5 text-[13px] whitespace-pre-wrap text-[var(--ci-text)]">{tr.detaliu}</p>}
                        <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">
                          <time dateTime={e.la}>{dataOra(e.la)}</time>
                          {e.autor ? ` · ${e.autor}` : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
