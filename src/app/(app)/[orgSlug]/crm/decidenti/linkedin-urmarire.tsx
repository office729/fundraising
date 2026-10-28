import Link from "next/link";

import { segmentFirma } from "@/lib/id-scurt";
import type { ListeUrmarire, PalnieOutreach, RandUrmarire } from "@/lib/waalaxy-server";

// „LinkedIn” din Decidenți: pâlnia trimiși → conectați → răspunsuri (din care refuzuri) și două liste de urmărit, pe toate firmele: cei care ți-au acceptat invitația și n-au fost contactați,
// și cei invitați de mai mult de 14 zile fără să accepte. Datele vin din Waalaxy prin webhook (Setări → Prospectare) și din trimiterile făcute din Alexandrit.
const procent = (parte: number, total: number) => (total > 0 ? `${Math.round((parte / total) * 100)}%` : "—");

function Pas({ eticheta, valoare, nota }: { eticheta: string; valoare: number; nota?: string }) {
  return (
    <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
      <p className="text-[12px] font-semibold text-[var(--ci-text-muted)]">{eticheta}</p>
      <p className="ci-display ci-tabular mt-1 text-2xl font-bold text-[var(--ci-text)]">{valoare.toLocaleString("ro-RO")}</p>
      {nota && <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">{nota}</p>}
    </div>
  );
}

function Lista({ orgSlug, titlu, descriere, randuri, gol, sufixZile }: { orgSlug: string; titlu: string; descriere: string; randuri: RandUrmarire[]; gol: string; sufixZile: string }) {
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
                    LinkedIn
                  </a>
                )}
                <span className="ci-tabular text-[12px] text-[var(--ci-text-muted)]">
                  {r.zile} {r.zile === 1 ? "zi" : "zile"} {sufixZile}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function UrmarireLinkedin({ orgSlug, palnie, liste }: { orgSlug: string; palnie: PalnieOutreach; liste: ListeUrmarire }) {
  const bazaConectati = palnie.invitati || palnie.conectati;
  const bazaRaspunsuri = palnie.conectati || palnie.invitati;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Pas eticheta="Invitați" valoare={palnie.invitati} nota="persoane unice, din Alexandrit și din Waalaxy" />
        <Pas eticheta="Conectați" valoare={palnie.conectati} nota={`${procent(palnie.conectati, bazaConectati)} din invitați`} />
        <Pas eticheta="Au răspuns" valoare={palnie.raspunsuri} nota={`${procent(palnie.raspunsuri, bazaRaspunsuri)} din conectați`} />
        <Pas eticheta="Dintre ei, refuzuri" valoare={palnie.refuzuri} nota={`${procent(palnie.refuzuri, palnie.raspunsuri)} din răspunsuri`} />
      </div>
      {palnie.invitati + palnie.conectati + palnie.raspunsuri === 0 && (
        <p className="rounded-lg bg-[var(--ci-surface-2)] px-3 py-2 text-[13px] text-[var(--ci-text-muted)]">
          Încă nu sunt evenimente. Trimite persoane aprobate în Waalaxy și conectează webhook-ul (Setări → Prospectare), ca acceptările și răspunsurile să apară aici.
        </p>
      )}
      <Lista
        orgSlug={orgSlug}
        titlu="Conectați, încă necontactați"
        descriere="Au acceptat invitația, dar nu există nicio notă pe firmă după acel moment. Momentul cel mai cald: scrie-le acum."
        randuri={liste.conectatiNecontactati}
        gol="Nimeni nu așteaptă un mesaj de la tine."
        sufixZile="de la conectare"
      />
      <Lista
        orgSlug={orgSlug}
        titlu="Invitați fără răspuns de peste 14 zile"
        descriere="Invitația n-a fost acceptată. Poți încerca alt canal (e-mail sau telefon) sau lăsa persoana în pace."
        randuri={liste.invitatiFaraAccept}
        gol="Nicio invitație fără răspuns mai veche de 14 zile."
        sufixZile="de la invitație"
      />
    </div>
  );
}
