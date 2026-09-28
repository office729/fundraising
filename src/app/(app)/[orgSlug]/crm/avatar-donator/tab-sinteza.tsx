"use client";

import { PLAYBOOK, type Alocare, type Sfat } from "@/lib/avatar-donator/motor";
import { CANAL_LABEL, type AvatarData } from "@/lib/avatar-donator/tipuri";

import { Card } from "../components/ui/card";

const ROL_ETICHETA = { principal: "Principal", test: "Test", organic: "Doar organic" } as const;
const ROL_CLASA = {
  principal: "bg-[var(--ci-green-soft)] text-[var(--ci-green)]",
  test: "bg-[var(--ci-amber-soft)] text-[var(--ci-amber)]",
  organic: "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]",
} as const;
const NIVEL_ETICHETA = { important: "Important", recomandat: "Recomandat", idee: "Idee" } as const;
const NIVEL_CLASA = {
  important: "bg-[var(--ci-red-soft)] text-[var(--ci-red)]",
  recomandat: "bg-[var(--ci-blue-soft)] text-[var(--ci-blue)]",
  idee: "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]",
} as const;

const lei = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} lei`;

export function TabSinteza({
  data,
  alocare,
  sfaturi,
  mergiLa,
}: {
  data: AvatarData;
  alocare: Alocare;
  sfaturi: Sfat[];
  mergiLa: (t: "buget" | "chestionar" | "profile") => void;
}) {
  const top = alocare.insista;
  const cuBuget = alocare.canale.filter((c) => c.lei > 0);
  const playbookCanale = alocare.canale.filter((c) => c.rol !== "organic");

  return (
    <div className="space-y-5">
      {/* Platforma pe care să insiști */}
      <Card>
        {top ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-[92px] w-[92px] shrink-0 flex-col items-center justify-center rounded-2xl bg-[var(--ci-green-soft)]">
              <span className="ci-tabular text-[34px] leading-none font-extrabold text-[var(--ci-green)]">{top.scor}</span>
              <span className="mt-1 text-[10px] font-bold tracking-wide text-[var(--ci-green)] uppercase">din 100</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-muted)] uppercase">Insistă pe</p>
              <h2 className="ci-display text-[22px] font-bold text-[var(--ci-text)]">{CANAL_LABEL[top.id]}</h2>
              <ul className="mt-2 space-y-1">
                {top.motive.map((m) => (
                  <li key={m} className="text-[13px] text-[var(--ci-text-muted)]">
                    • {m}
                  </li>
                ))}
              </ul>
              {alocare.grupaDominanta && (
                <p className="mt-2 text-[12.5px] text-[var(--ci-text-muted)]">
                  Grupa de vârstă dominantă a donatorilor tăi: <b className="text-[var(--ci-text)]">{alocare.grupaDominanta}</b>.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-[var(--ci-text-muted)]">Completează datele din „Buget &amp; canale” ca să afli pe ce platformă să insiști.</p>
        )}
        {!alocare.areDovezi && (
          <p className="mt-4 rounded-lg bg-[var(--ci-amber-soft)] px-3 py-2 text-[12.5px] text-[var(--ci-text)]">
            <b>Recomandare bazată pe euristici.</b> Nu ai introdus încă sursa reală a donatorilor noi și costul real per donator pe fiecare canal.{" "}
            <button type="button" onClick={() => mergiLa("buget")} className="font-semibold text-[var(--ci-primary)] underline">
              Adaugă datele reale
            </button>{" "}
            și recomandarea va conta pe ele.
          </p>
        )}
      </Card>

      {/* Alocarea bugetului */}
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">Cum să-ți împarți bugetul de promovare</h2>
          {alocare.buget != null && (
            <p className="ci-tabular text-[13px] text-[var(--ci-text-muted)]">
              {lei(alocare.buget)}/lună · din care <b className="text-[var(--ci-text)]">{lei(alocare.principal)}</b> pe canale principale și <b className="text-[var(--ci-text)]">{lei(alocare.test)}</b> pentru teste
            </p>
          )}
        </div>

        {alocare.buget == null ? (
          <p className="mt-3 text-[13px] text-[var(--ci-text-muted)]">
            Introdu bugetul lunar de promovare în{" "}
            <button type="button" onClick={() => mergiLa("buget")} className="font-semibold text-[var(--ci-primary)] underline">
              Buget &amp; canale
            </button>{" "}
            și îți spun exact câți lei merg pe fiecare platformă.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead>
                <tr className="border-b border-[var(--ci-border)] text-left text-[12px] text-[var(--ci-text-muted)]">
                  <th className="py-1.5 pr-3">Platformă</th>
                  <th className="px-3 py-1.5">Rol</th>
                  <th className="px-3 py-1.5 text-right">Lei / lună</th>
                  <th className="px-3 py-1.5 text-right">Din buget</th>
                  <th className="py-1.5 pl-3 text-right">Scor</th>
                </tr>
              </thead>
              <tbody>
                {alocare.canale.map((c) => (
                  <tr key={c.id} className="border-b border-dashed border-[var(--ci-border)]">
                    <td className="py-2 pr-3 font-medium text-[var(--ci-text)]">{CANAL_LABEL[c.id]}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${ROL_CLASA[c.rol]}`}>{ROL_ETICHETA[c.rol]}</span>
                    </td>
                    <td className="ci-tabular px-3 py-2 text-right font-bold text-[var(--ci-text)]">{c.lei > 0 ? lei(c.lei) : "—"}</td>
                    <td className="ci-tabular px-3 py-2 text-right text-[var(--ci-text-muted)]">{c.lei > 0 ? `${c.procent}%` : "—"}</td>
                    <td className="ci-tabular py-2 pl-3 text-right text-[var(--ci-text-muted)]">{c.scor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cuBuget.length > 0 && (
              <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">
                „Test” = bugetul de învățare, pentru un canal-provocator sau pentru variante de creativ. „Doar organic” = nu merită bani plătiți acum; folosește-l cu conținut fără reclame.
              </p>
            )}
            {alocare.note.map((n) => (
              <p key={n} className="mt-1.5 text-[12px] text-[var(--ci-text-muted)]">
                ℹ {n}
              </p>
            ))}
          </div>
        )}
        <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--ci-text-faint)]">
          Scorul = potrivirea platformei cu vârstele donatorilor tăi și cu tipul de venit vizat (priori euristici, nu statistici măsurate){alocare.areDovezi ? ", plus datele tale reale — care au jumătate din pondere" : ""}. Facebook și Instagram se cumpără împreună în Meta Ads Manager.
        </p>
      </Card>

      {/* Sfaturi de marketing */}
      <div>
        <h2 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">Sfaturi de marketing pentru organizația ta</h2>
        <div className="mt-2 space-y-2">
          {sfaturi.map((s) => (
            <div key={s.titlu} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${NIVEL_CLASA[s.nivel]}`}>{NIVEL_ETICHETA[s.nivel]}</span>
                <p className="text-[13.5px] font-semibold text-[var(--ci-text)]">{s.titlu}</p>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ci-text-muted)]">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Playbook pe platformă */}
      {playbookCanale.length > 0 && (
        <div>
          <h2 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">Ghid pe platformă</h2>
          <div className="mt-2 space-y-2">
            {playbookCanale.map((c) => {
              const p = PLAYBOOK[c.id];
              return (
                <details key={c.id} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3.5" open={c.rol === "principal" && c.id === top?.id}>
                  <summary className="cursor-pointer text-[13.5px] font-semibold text-[var(--ci-text)]">
                    {CANAL_LABEL[c.id]} <span className="text-[12px] font-normal text-[var(--ci-text-muted)]">· {ROL_ETICHETA[c.rol].toLowerCase()}</span>
                  </summary>
                  <dl className="mt-2 space-y-1.5 text-[13px]">
                    {(
                      [
                        ["Rol", p.rol],
                        ["Conținut", p.continut],
                        ["Frecvență", p.frecventa],
                        ["Îndemn (CTA)", p.cta],
                        ["Ce măsori", p.masoara],
                      ] as const
                    ).map(([k, v]) => (
                      <div key={k} className="grid gap-x-3 sm:grid-cols-[110px_1fr]">
                        <dt className="font-semibold text-[var(--ci-text)]">{k}</dt>
                        <dd className="text-[var(--ci-text-muted)]">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              );
            })}
          </div>
        </div>
      )}

      {Object.values(data.raspunsuri).filter((r) => r.text || r.variante).length === 0 && (
        <p className="text-[12.5px] text-[var(--ci-text-muted)]">
          Poți completa și{" "}
          <button type="button" onClick={() => mergiLa("chestionar")} className="font-semibold text-[var(--ci-primary)] underline">
            chestionarul de 100 de întrebări
          </button>{" "}
          — sau îl imporți din exportul .txt, cu butonul din dreapta sus.
        </p>
      )}
    </div>
  );
}
