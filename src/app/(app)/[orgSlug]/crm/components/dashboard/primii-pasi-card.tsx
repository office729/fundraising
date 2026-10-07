"use client";

import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";

export type PrimiiPasi = { logo: boolean; pagina: boolean; donatori: boolean; echipa: boolean };

// Lista „Primii pași” pentru o organizație nou-venită: pe pagina principală stau, alături, datele demonstrative și cele reale, iar
// un utilizator fără experiență nu știe de unde să înceapă. Se bifează singură pe baza datelor reale și dispare când totul e făcut.
export function PrimiiPasiCard({ orgSlug, ro, pasi }: { orgSlug: string; ro: boolean; pasi: PrimiiPasi | null }) {
  if (!pasi) return null;
  const items = [
    {
      key: "logo",
      done: pasi.logo,
      label: ro ? "Adaugă sigla organizației" : "Add your organization's logo",
      hint: ro ? "Apare pe paginile publice și în documente." : "It appears on your public pages and documents.",
      href: `/${orgSlug}/setari`,
    },
    {
      key: "pagina",
      done: pasi.pagina,
      label: ro ? "Creează prima pagină de strângere de fonduri" : "Create your first fundraising page",
      hint: ro ? "O pagină publică unde oamenii pot dona direct." : "A public page where people can donate directly.",
      href: `/${orgSlug}/crm/strangere-fonduri`,
    },
    {
      key: "donatori",
      done: pasi.donatori,
      label: ro ? "Primește prima donație" : "Receive your first donation",
      hint: ro
        ? "Donatorii apar singuri în „Persoane fizice” după ce cineva donează pe pagina ta de campanie."
        : "Donors appear on their own under “Individuals” once someone donates on your campaign page.",
      href: `/${orgSlug}/crm/donatori`,
    },
    {
      key: "echipa",
      done: pasi.echipa,
      label: ro ? "Invită un coleg în echipă" : "Invite a teammate",
      hint: ro ? "Opțional — poți lucra și singur(ă)." : "Optional — you can also work alone.",
      href: `/${orgSlug}/echipa`,
    },
  ];
  const facute = items.filter((i) => i.done).length;
  if (facute === items.length) return null;

  return (
    <section
      aria-labelledby="primii-pasi-titlu"
      className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4 shadow-[var(--ci-card-shadow)]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="primii-pasi-titlu" className="text-[15px] font-bold text-[var(--ci-text)]">
          {ro ? "Primii pași în platformă" : "Getting started"}
        </h2>
        <p className="text-[12px] text-[var(--ci-text-muted)]">
          {ro ? `${facute} din ${items.length} făcuți` : `${facute} of ${items.length} done`}
        </p>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.key}>
            <Link
              prefetch={false}
              href={i.href}
              className="flex items-start gap-2.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-2.5 transition-colors hover:bg-[var(--ci-surface-2)]"
            >
              {i.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ci-green)]" aria-label={ro ? "Făcut" : "Done"} />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ci-text-faint)]" aria-hidden />
              )}
              <span className="min-w-0">
                <span className={`block text-[13px] font-semibold ${i.done ? "text-[var(--ci-text-muted)] line-through" : "text-[var(--ci-text)]"}`}>{i.label}</span>
                <span className="block text-[12px] text-[var(--ci-text-muted)]">{i.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
