"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DONATORI_UI_DICT } from "@/lib/i18n/dictionaries/donatori-ui";

import { NotaCrm } from "../components/nota-crm";
import { useLocale } from "../lib/locale-context";

const FILE = [{ sub: "" }, { sub: "/acasa" }, { sub: "/proiecte" }, { sub: "/rapoarte" }, { sub: "/analize" }, { sub: "/importuri" }, { sub: "/dubluri" }, { sub: "/parcursuri" }];

// Vederile CRM Persoane fizice: lista, tabloul de bord, raportul pe proiecte, rapoartele salvate, analizele și importurile.
export function PfNav({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname() ?? "";
  const dict = DONATORI_UI_DICT[useLocale()].nav;
  const baza = `/${orgSlug}/crm/donatori`;
  return (
    <>
    <NotaCrm id="persoane-fizice" />
    <nav aria-label={dict.aria} className="ci-scrollbar flex gap-1 overflow-x-auto rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1">
      {FILE.map((t) => {
        const href = `${baza}${t.sub}`;
        const activ = t.sub === "" ? pathname === baza : pathname.startsWith(href);
        return (
          <Link
            key={t.sub}
            href={href}
            prefetch={false}
            aria-current={activ ? "page" : undefined}
            className={`shrink-0 rounded-[calc(var(--ci-radius-card)-4px)] px-3.5 py-1.5 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${
              activ ? "bg-[var(--ci-primary)] text-white" : "text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
            }`}
          >
            {dict.tabs[t.sub]}
          </Link>
        );
      })}
    </nav>
    </>
  );
}
