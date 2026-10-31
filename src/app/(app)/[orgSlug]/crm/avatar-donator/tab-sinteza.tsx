"use client";

import { AVATAR_UI_DICT } from "@/lib/i18n/dictionaries/avatar-donator-ui";
import { checklistLoc } from "@/lib/avatar-donator/localizare";
import { playbookPeLimba, type Alocare, type Sfat } from "@/lib/avatar-donator/motor";
import { CANAL_LABEL, type AvatarData } from "@/lib/avatar-donator/tipuri";

import { Card } from "../components/ui/card";
import { useLocale } from "../lib/locale-context";

import type { Actualizeaza } from "./avatar-donator-client";
import { Rich } from "./rich";

const ROL_CLASA = {
  principal: "bg-[var(--ci-green-soft)] text-[var(--ci-green)]",
  test: "bg-[var(--ci-amber-soft)] text-[var(--ci-amber)]",
  organic: "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]",
} as const;
const NIVEL_CLASA = {
  important: "bg-[var(--ci-red-soft)] text-[var(--ci-red)]",
  recomandat: "bg-[var(--ci-blue-soft)] text-[var(--ci-blue)]",
  idee: "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]",
} as const;

export function TabSinteza({
  data,
  actualizeaza,
  alocare,
  sfaturi,
  mergiLa,
}: {
  data: AvatarData;
  actualizeaza: Actualizeaza;
  alocare: Alocare;
  sfaturi: Sfat[];
  mergiLa: (t: "buget" | "chestionar" | "profile") => void;
}) {
  const locale = useLocale();
  const d = AVATAR_UI_DICT[locale].sinteza;
  const lei = (n: number) => `${Math.round(n).toLocaleString(locale === "ro" ? "ro-RO" : "en-GB")} lei`;
  const CHECKLIST_CONFORMITATE = checklistLoc(locale);
  const PLAYBOOK = playbookPeLimba(locale);
  const top = alocare.insista;
  const cuBuget = alocare.canale.filter((c) => c.lei > 0);
  const playbookCanale = alocare.canale.filter((c) => c.rol !== "organic" || c.lei > 0);
  const bifate = CHECKLIST_CONFORMITATE.filter((c) => data.conformitate[c.key]).length;
  const toateBifate = bifate === CHECKLIST_CONFORMITATE.length;
  const totalLei = alocare.canale.reduce((a, c) => a + c.lei, 0);

  return (
    <div className="space-y-5">
      {/* Verificări obligatorii înainte de promovare plătită — mereu vizibile, înaintea alocării */}
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">{d.checklistTitlu}</h2>
          <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${toateBifate ? "bg-[var(--ci-green-soft)] text-[var(--ci-green)]" : "bg-[var(--ci-amber-soft)] text-[var(--ci-text)]"}`}>
            {d.bifate(bifate, CHECKLIST_CONFORMITATE.length)}
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {CHECKLIST_CONFORMITATE.map((c) => (
            <li key={c.key}>
              <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-[var(--ci-text)]">
                <input
                  type="checkbox"
                  checked={!!data.conformitate[c.key]}
                  onChange={(e) => actualizeaza((x) => ({ ...x, conformitate: { ...x.conformitate, [c.key]: e.target.checked } }))}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--ci-primary)]"
                />
                <span>{c.text}</span>
              </label>
            </li>
          ))}
        </ul>
        <p className={`mt-3 rounded-lg px-3 py-2 text-[12.5px] ${toateBifate ? "bg-[var(--ci-green-soft)] text-[var(--ci-text)]" : "bg-[var(--ci-amber-soft)] text-[var(--ci-text)]"}`}>
          {toateBifate ? d.toateBifate : d.nuToateBifate}
        </p>
      </Card>

      {/* Platforma pe care să insiști */}
      <Card>
        {top ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-[92px] w-[92px] shrink-0 flex-col items-center justify-center rounded-2xl bg-[var(--ci-green-soft)]">
              <span className="ci-tabular text-[34px] leading-none font-extrabold text-[var(--ci-green)]">{top.scor}</span>
              <span className="mt-1 text-[10px] font-bold tracking-wide text-[var(--ci-green)] uppercase">{d.dinSuta}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-muted)] uppercase">{d.insistaPe}</p>
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
                  {d.grupaDominanta} <b className="text-[var(--ci-text)]">{alocare.grupaDominanta}</b>.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-[var(--ci-text-muted)]">{d.completeazaBuget}</p>
        )}
        {!alocare.areDovezi && (
          <p className="mt-4 rounded-lg bg-[var(--ci-amber-soft)] px-3 py-2 text-[12.5px] text-[var(--ci-text)]">
            <Rich text={d.euristic} />{" "}
            <button type="button" onClick={() => mergiLa("buget")} className="font-semibold text-[var(--ci-primary)] underline">
              {d.adaugaDatele}
            </button>{" "}
            {d.siRecomandarea}
          </p>
        )}
      </Card>

      {/* Alocarea bugetului */}
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">{d.cumImpartesti}</h2>
          {alocare.buget != null && (
            <p className="ci-tabular text-[13px] text-[var(--ci-text-muted)]">
              <Rich text={d.sumarBuget(lei(alocare.buget), lei(alocare.principal), lei(alocare.test))} boldClassName="text-[var(--ci-text)]" />
            </p>
          )}
        </div>

        {alocare.buget == null ? (
          <p className="mt-3 text-[13px] text-[var(--ci-text-muted)]">
            {d.introduBugetPre}{" "}
            <button type="button" onClick={() => mergiLa("buget")} className="font-semibold text-[var(--ci-primary)] underline">
              {d.bugetCanale}
            </button>{" "}
            {d.introduBugetPost}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px]">
              <caption className="sr-only">{d.caption}</caption>
              <thead>
                <tr className="border-b border-[var(--ci-border)] text-left text-[12px] text-[var(--ci-text-muted)]">
                  <th scope="col" className="py-1.5 pr-3">{d.colPlatforma}</th>
                  <th scope="col" className="px-3 py-1.5">{d.colRol}</th>
                  <th scope="col" className="px-3 py-1.5 text-right">{d.colLei}</th>
                  <th scope="col" className="px-3 py-1.5 text-right">{d.colBuget}</th>
                  <th scope="col" className="py-1.5 pl-3 text-right">{d.colScor}</th>
                </tr>
              </thead>
              <tbody>
                {alocare.canale.map((c) => (
                  <tr key={c.id} className="border-b border-dashed border-[var(--ci-border)]">
                    <td className="py-2 pr-3 font-medium text-[var(--ci-text)]">{CANAL_LABEL[c.id]}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${ROL_CLASA[c.rol]}`}>{d.rol[c.rol]}</span>
                    </td>
                    <td className="ci-tabular px-3 py-2 text-right font-bold text-[var(--ci-text)]">{c.lei > 0 ? lei(c.lei) : "—"}</td>
                    <td className="ci-tabular px-3 py-2 text-right text-[var(--ci-text-muted)]">{c.lei > 0 ? `${c.procent}%` : "—"}</td>
                    <td className="ci-tabular py-2 pl-3 text-right text-[var(--ci-text-muted)]">{c.scor}</td>
                  </tr>
                ))}
                <tr className="font-bold text-[var(--ci-text)]">
                  <th scope="row" className="py-2 pr-3 text-left">{d.total}</th>
                  <td className="px-3 py-2" />
                  <td className="ci-tabular px-3 py-2 text-right">{lei(totalLei)}</td>
                  <td className="ci-tabular px-3 py-2 text-right">{alocare.buget ? `${Math.round((totalLei / alocare.buget) * 100)}%` : ""}</td>
                  <td className="py-2 pl-3" />
                </tr>
              </tbody>
            </table>
            {cuBuget.length > 0 && <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">{d.notaRoluri}</p>}
            {alocare.note.map((n) => (
              <p key={n} className="mt-1.5 text-[12px] text-[var(--ci-text-muted)]">
                ℹ {n}
              </p>
            ))}
          </div>
        )}
        <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--ci-text-faint)]">{d.notaScor(alocare.areDovezi)}</p>
      </Card>

      {/* Sfaturi de marketing */}
      <div>
        <h2 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">{d.sfaturi}</h2>
        <div className="mt-2 space-y-2">
          {sfaturi.map((s) => (
            <div key={s.titlu} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${NIVEL_CLASA[s.nivel]}`}>{d.nivel[s.nivel]}</span>
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
          <h2 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">{d.ghid}</h2>
          <div className="mt-2 space-y-2">
            {playbookCanale.map((c) => {
              const p = PLAYBOOK[c.id];
              return (
                <details key={c.id} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3.5" open={c.rol === "principal" && c.id === top?.id}>
                  <summary className="cursor-pointer text-[13.5px] font-semibold text-[var(--ci-text)]">
                    {CANAL_LABEL[c.id]} <span className="text-[12px] font-normal text-[var(--ci-text-muted)]">· {d.rol[c.rol].toLowerCase()}</span>
                  </summary>
                  <dl className="mt-2 space-y-1.5 text-[13px]">
                    {(
                      [
                        [d.pb.rol, p.rol],
                        [d.pb.continut, p.continut],
                        [d.pb.frecventa, p.frecventa],
                        [d.pb.cta, p.cta],
                        [d.pb.masoara, p.masoara],
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
          {d.poatiCompleta}{" "}
          <button type="button" onClick={() => mergiLa("chestionar")} className="font-semibold text-[var(--ci-primary)] underline">
            {d.chestionarul}
          </button>{" "}
          {d.sauImporti}
        </p>
      )}
    </div>
  );
}
