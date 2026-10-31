import Link from "next/link";

import { segmentFirma } from "@/lib/id-scurt";
import type { ListeUrmarire, PalnieOutreach, RandUrmarire } from "@/lib/waalaxy-server";
import type { Locale } from "@/lib/i18n/config";
import { DECIDENTI_UI_DICT } from "@/lib/i18n/dictionaries/decidenti-ui";
import { intlLocale } from "@/lib/i18n/dictionaries/companii-ui";

// „LinkedIn” din Decidenți: pâlnia trimiși → conectați → răspunsuri (din care refuzuri) și două liste de urmărit, pe toate firmele: cei care ți-au acceptat invitația și n-au fost contactați,
// și cei invitați de mai mult de 14 zile fără să accepte. Datele vin din Waalaxy prin webhook (Setări → Prospectare) și din trimiterile făcute din Alexandrit.
const procent = (parte: number, total: number) => (total > 0 ? `${Math.round((parte / total) * 100)}%` : "—");

function Pas({ eticheta, valoare, nota, locale }: { eticheta: string; valoare: number; nota?: string; locale: Locale }) {
  return (
    <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
      <p className="text-[12px] font-semibold text-[var(--ci-text-muted)]">{eticheta}</p>
      <p className="ci-display ci-tabular mt-1 text-2xl font-bold text-[var(--ci-text)]">{valoare.toLocaleString(intlLocale(locale))}</p>
      {nota && <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">{nota}</p>}
    </div>
  );
}

function Lista({ orgSlug, titlu, descriere, randuri, gol, sufixZile, locale }: { orgSlug: string; titlu: string; descriere: string; randuri: RandUrmarire[]; gol: string; sufixZile: string; locale: Locale }) {
  const ui = DECIDENTI_UI_DICT[locale].linkedin;
  return (
    <section className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
      <h2 className="text-[14px] font-bold text-[var(--ci-text)]">
        {titlu} <span className="ml-1 rounded-full bg-[var(--ci-surface-2)] px-2 py-0.5 text-xs font-normal tabular-nums">{randuri.length}</span>
      </h2>
      <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">{descriere}</p>
      {randuri.length === 0 ? (
        <p className="mt-3 text-[13px] text-[var(--ci-text-muted)]">{gol}</p>
      ) : (
        <ul className="mt-2 divide-y divide-[var(--ci-border)]">
          {randuri.map((r) => (
            <li key={r.contactId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[13px]">
              <div className="min-w-0">
                <Link prefetch={false} href={`/${orgSlug}/crm/companii/${segmentFirma(r.firma, r.companyId)}?tab=contacte`} className="font-semibold text-[var(--ci-text)] hover:underline">
                  {r.nume}
                </Link>
                <span className="text-[var(--ci-text-muted)]">
                  {r.rol ? ` · ${r.rol}` : ""} · {r.firma}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {r.linkedin && /^https?:\/\//i.test(r.linkedin) && (
                  <a href={r.linkedin} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium text-[var(--ci-primary)] hover:underline">
                    {ui.linkedin}
                  </a>
                )}
                <span className="ci-tabular text-[12px] text-[var(--ci-text-muted)]">
                  {ui.zile(r.zile)} {sufixZile}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function UrmarireLinkedin({ orgSlug, palnie, liste, locale }: { orgSlug: string; palnie: PalnieOutreach; liste: ListeUrmarire; locale: Locale }) {
  const ui = DECIDENTI_UI_DICT[locale].linkedin;
  const bazaConectati = palnie.invitati || palnie.conectati;
  const bazaRaspunsuri = palnie.conectati || palnie.invitati;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Pas locale={locale} eticheta={ui.invitati} valoare={palnie.invitati} nota={ui.invitatiNota} />
        <Pas locale={locale} eticheta={ui.conectati} valoare={palnie.conectati} nota={ui.dinInvitati(procent(palnie.conectati, bazaConectati))} />
        <Pas locale={locale} eticheta={ui.auRaspuns} valoare={palnie.raspunsuri} nota={ui.dinConectati(procent(palnie.raspunsuri, bazaRaspunsuri))} />
        <Pas locale={locale} eticheta={ui.refuzuri} valoare={palnie.refuzuri} nota={ui.dinRaspunsuri(procent(palnie.refuzuri, palnie.raspunsuri))} />
      </div>
      {palnie.invitati + palnie.conectati + palnie.raspunsuri === 0 && (
        <p className="rounded-lg bg-[var(--ci-surface-2)] px-3 py-2 text-[13px] text-[var(--ci-text-muted)]">
          {ui.faraEvenimente}
        </p>
      )}
      <Lista
        orgSlug={orgSlug}
        locale={locale}
        titlu={ui.conectatiTitlu}
        descriere={ui.conectatiDescriere}
        randuri={liste.conectatiNecontactati}
        gol={ui.conectatiGol}
        sufixZile={ui.conectatiSufix}
      />
      <Lista
        orgSlug={orgSlug}
        locale={locale}
        titlu={ui.invitatiTitlu}
        descriere={ui.invitatiDescriere}
        randuri={liste.invitatiFaraAccept}
        gol={ui.invitatiGol}
        sufixZile={ui.invitatiSufix}
      />
    </div>
  );
}
