"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { Locale } from "@/lib/i18n/config";
import { DURATE_SUPORT_ZILE } from "@/lib/suport/date-personale";

import { acordaSuportAction, retrageSuportAction, type StareSuport } from "./suport-actions";

const T = {
  ro: {
    titlu: "Acces suport",
    desc: "Dacă ai nevoie de ajutor, poți permite temporar echipei Alexandrit să vadă „Diagnoza contului”: configurarea, modulele active, numărul de înregistrări și erorile recente. Nu vede conținutul CRM (nume, e-mailuri, sume, notițe). Accesul expiră singur și îl poți retrage oricând.",
    nuVede: "Echipa nu vede: donatori, companii, contacte, sume, notițe sau documente.",
    activPana: (data: string) => `Acces activ până la ${data}.`,
    inactiv: "Echipa Alexandrit nu are acces în acest moment.",
    durata: "Pentru",
    zile: (n: number) => (n === 1 ? "1 zi" : `${n} zile`),
    permite: "Permite accesul",
    retrage: "Retrage accesul",
    seSalveaza: "Se salvează...",
    jurnalTitlu: "Jurnal de acces",
    jurnalGol: "Nimic încă.",
    acordat: "Acces acordat",
    retras: "Acces retras",
    vizualizata: (cine: string | null) => `Diagnoza a fost deschisă${cine ? ` de ${cine}` : ""}`,
  },
  en: {
    titlu: "Support access",
    desc: "If you need help, you can temporarily allow the Alexandrit team to see the “Account diagnostics”: configuration, active modules, record counts and recent errors. They cannot see CRM content (names, e-mails, amounts, notes). Access expires on its own and you can withdraw it at any time.",
    nuVede: "The team does not see: donors, companies, contacts, amounts, notes or documents.",
    activPana: (data: string) => `Access active until ${data}.`,
    inactiv: "The Alexandrit team has no access right now.",
    durata: "For",
    zile: (n: number) => (n === 1 ? "1 day" : `${n} days`),
    permite: "Allow access",
    retrage: "Withdraw access",
    seSalveaza: "Saving...",
    jurnalTitlu: "Access log",
    jurnalGol: "Nothing yet.",
    acordat: "Access granted",
    retras: "Access withdrawn",
    vizualizata: (cine: string | null) => `Diagnostics opened${cine ? ` by ${cine}` : ""}`,
  },
} as const;

export function SuportSection({ orgSlug, locale, stare }: { orgSlug: string; locale: Locale; stare: StareSuport }) {
  const t = T[locale];
  const router = useRouter();
  const [zile, setZile] = useState<number>(7);
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fmt = (iso: string) => new Date(iso).toLocaleString(locale === "ro" ? "ro-RO" : "en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const ruleaza = (f: () => Promise<{ error: string | null }>) =>
    startTransition(async () => {
      setEroare(null);
      const r = await f();
      if (r.error) setEroare(r.error);
      else router.refresh();
    });

  return (
    <section id="suport" className="mt-8 scroll-mt-4 rounded-xl border border-line bg-panel p-5">
      <h2 className="font-medium text-ink">{t.titlu}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">{t.desc}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{t.nuVede}</p>

      {stare.activ ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-brand-green">✓ {t.activPana(fmt(stare.activ.expiraLa))}</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => ruleaza(() => retrageSuportAction(orgSlug))}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-panel-2 disabled:opacity-50"
          >
            {pending ? t.seSalveaza : t.retrage}
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted">{t.inactiv}</p>
          <label className="flex items-center gap-2 text-sm text-body">
            {t.durata}
            <select value={zile} onChange={(e) => setZile(Number(e.target.value))} className="h-9 rounded-md border border-line bg-panel px-2 text-sm text-ink">
              {DURATE_SUPORT_ZILE.map((n) => (
                <option key={n} value={n}>
                  {t.zile(n)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() => ruleaza(() => acordaSuportAction(orgSlug, zile))}
            className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-green-hover disabled:opacity-50"
          >
            {pending ? t.seSalveaza : t.permite}
          </button>
        </div>
      )}
      {eroare && <p className="mt-2 text-sm text-red-600">{eroare}</p>}

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">{t.jurnalTitlu}</h3>
      {stare.jurnal.length === 0 ? (
        <p className="mt-1 text-xs text-muted">{t.jurnalGol}</p>
      ) : (
        <ul className="mt-1 space-y-1 text-xs text-body">
          {stare.jurnal.map((j, i) => (
            <li key={i}>
              <span className="text-muted">{fmt(j.la)}</span> ·{" "}
              {j.actiune === "suport_acces_acordat" ? t.acordat : j.actiune === "suport_acces_retras" ? t.retras : t.vizualizata(j.de)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
