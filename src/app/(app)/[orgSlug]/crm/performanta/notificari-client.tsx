"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { PERFORMANTA_UI2_DICT } from "@/lib/i18n/dictionaries/performanta-ui-2";
import type { NotificareDto } from "@/lib/performanta-automatizari";

import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/states";
import { useLocale } from "../lib/locale-context";
import { marcheazaCititeAction } from "./automatizari-actions";
import { dataOra } from "./ui-comune";

export function NotificariClient({ orgSlug, notificari, necitite }: { orgSlug: string; notificari: NotificareDto[]; necitite: number }) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI2_DICT[locale].notificari;
  const router = useRouter();
  const [pending, tr] = useTransition();
  const citeste = (ids: string[] | "toate") =>
    tr(async () => {
      await marcheazaCititeAction(orgSlug, ids);
      router.refresh();
    });

  if (notificari.length === 0) return <EmptyState icon={Bell} title={dict.golTitlu} description={dict.golDescriere} />;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] text-[var(--ci-text-muted)]">{necitite > 0 ? dict.necitite(necitite) : dict.toateCitite}</p>
        {necitite > 0 && (
          <Button size="sm" loading={pending} onClick={() => citeste("toate")}>
            {dict.marcheazaToate}
          </Button>
        )}
      </div>
      <ul className="divide-y divide-[var(--ci-border)] overflow-hidden rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
        {notificari.map((n) => (
          <li key={n.id} className={n.citit ? "" : "bg-[var(--ci-primary)]/5"}>
            <div className="flex items-start gap-3 px-4 py-3">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.citit ? "bg-transparent" : "bg-[var(--ci-primary)]"}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-[var(--ci-text)]">
                  {!n.citit && <span className="sr-only">{dict.necititaPrefix}</span>}
                  {n.titlu}
                  <span className="rounded-full bg-[var(--ci-surface-2)] px-2 py-px text-[11px] font-medium text-[var(--ci-text-muted)]">{dict.tip[n.tip] ?? n.tip}</span>
                </p>
                {n.continut && <p className="mt-1 text-[13px] whitespace-pre-line text-[var(--ci-text-muted)]">{n.continut}</p>}
                <p className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-[var(--ci-text-muted)]">
                  {dataOra(n.creatLa, locale)}
                  {n.link && (
                    <Link href={n.link} onClick={() => !n.citit && citeste([n.id])} className="font-medium text-[var(--ci-blue)] hover:underline">
                      {dict.deschide}
                    </Link>
                  )}
                  {!n.citit && (
                    <button type="button" onClick={() => citeste([n.id])} className="font-medium text-[var(--ci-blue)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
                      {dict.marcheazaCitita}
                    </button>
                  )}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
