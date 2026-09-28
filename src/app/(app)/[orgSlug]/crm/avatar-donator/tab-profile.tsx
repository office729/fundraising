"use client";

import { calculeazaMaturitate, scorSegment } from "@/lib/avatar-donator/motor";
import { NR_SEGMENTE, PROFILE, REZUMAT_CAMPURI, type AvatarData, type ProfilId } from "@/lib/avatar-donator/tipuri";

import { Card } from "../components/ui/card";
import { Input, Textarea } from "../components/ui/input";

import type { Actualizeaza } from "./avatar-donator-client";
import { Camp } from "./camp";

function culoare(pct: number): string {
  if (pct >= 70) return "var(--ci-green)";
  if (pct >= 40) return "var(--ci-amber)";
  return "var(--ci-red)";
}

export function TabProfile({ data, actualizeaza }: { data: AvatarData; actualizeaza: Actualizeaza }) {
  const maturitate = calculeazaMaturitate(data);

  const setNume = (p: ProfilId, i: number, v: string) =>
    actualizeaza((d) => ({ ...d, profile: { ...d.profile, [p]: d.profile[p].map((s, j) => (j === i ? { ...s, nume: v } : s)) } }));
  const setCriteriu = (p: ProfilId, i: number, key: string, v: string) => {
    const n = v === "" ? undefined : Math.min(100, Math.max(0, Number(v)));
    actualizeaza((d) => ({
      ...d,
      profile: {
        ...d.profile,
        [p]: d.profile[p].map((s, j) => {
          if (j !== i) return s;
          const criterii = { ...s.criterii };
          if (n === undefined || Number.isNaN(n)) delete criterii[key];
          else criterii[key] = n;
          return { ...s, criterii };
        }),
      },
    }));
  };

  return (
    <div className="space-y-5">
      {/* Profiluri */}
      <div>
        <h2 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">Scor de potrivire pe segmente</h2>
        <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">
          Pentru fiecare tip de donator, definește până la 3 segmente și notează cât de bine îndeplinește fiecare criteriu (0–100%). Segmentul cu scorul cel mai mare, validat prin interviuri, devine „donatorul ideal”.
        </p>
      </div>
      {PROFILE.map((profil) => (
        <Card key={profil.id}>
          <h3 className="text-[14px] font-bold text-[var(--ci-text)]">{profil.titlu}</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b border-[var(--ci-border)] text-[12px] text-[var(--ci-text-muted)]">
                  <th className="py-1.5 pr-3 text-left">Criteriu</th>
                  {Array.from({ length: NR_SEGMENTE }, (_, i) => (
                    <th key={i} className="px-2 py-1.5">
                      <Input value={data.profile[profil.id][i].nume} onChange={(e) => setNume(profil.id, i, e.target.value)} className="h-8 text-center text-[12px]" aria-label={`Nume segment ${i + 1}`} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profil.criterii.map((c) => (
                  <tr key={c.key} className="border-b border-dashed border-[var(--ci-border)]">
                    <td className="py-1.5 pr-3 text-[var(--ci-text)]">
                      {c.label} <span className="text-[11px] text-[var(--ci-text-faint)]">(max {c.max})</span>
                    </td>
                    {Array.from({ length: NR_SEGMENTE }, (_, i) => (
                      <td key={i} className="px-2 py-1.5">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={data.profile[profil.id][i].criterii[c.key] ?? ""}
                          onChange={(e) => setCriteriu(profil.id, i, c.key, e.target.value)}
                          placeholder="%"
                          aria-label={`${c.label} — ${data.profile[profil.id][i].nume} (procent 0–100)`}
                          className="ci-tabular h-8 text-center text-[12.5px]"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="py-2 pr-3 font-bold text-[var(--ci-text)]">TOTAL / 100</td>
                  {Array.from({ length: NR_SEGMENTE }, (_, i) => {
                    const t = scorSegment(profil.id, data.profile[profil.id][i]).total;
                    return (
                      <td key={i} className="ci-tabular px-2 py-2 text-center text-[16px] font-extrabold" style={{ color: culoare(t) }}>
                        {t}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {/* Maturitate */}
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">Scorul de maturitate al organizației</h2>
          <p className="ci-tabular text-[20px] font-extrabold" style={{ color: culoare(maturitate.total) }}>
            {maturitate.total}
            <span className="text-[13px] font-normal text-[var(--ci-text-muted)]"> / 100</span>
          </p>
        </div>
        <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">Calculat din răspunsurile la chestionar: o întrebare completată cu date măsurate contează integral, o estimare 60%, o ipoteză 30%.</p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {maturitate.dimensiuni.map((dim) => (
            <div key={dim.key}>
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="text-[var(--ci-text)]">{dim.label}</span>
                <span className="ci-tabular font-semibold" style={{ color: culoare(dim.scor * 10) }}>
                  {dim.scor}/10
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--ci-surface-2)]">
                <div className="h-full rounded-full" style={{ width: `${dim.scor * 10}%`, background: culoare(dim.scor * 10) }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Rezumat */}
      <Card>
        <h2 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">Rezumat final — donatorul ideal realist</h2>
        <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">Completează după ce ai validat segmentul câștigător prin interviuri și un test pilot (întrebarea 100).</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {REZUMAT_CAMPURI.map((c) => (
            <Camp key={c.key} label={c.label} className={c.key === "nume" ? "sm:col-span-2" : ""}>
              {c.key === "nume" ? (
                <Input value={data.rezumat[c.key] ?? ""} onChange={(e) => actualizeaza((d) => ({ ...d, rezumat: { ...d.rezumat, [c.key]: e.target.value } }))} />
              ) : (
                <Textarea rows={3} value={data.rezumat[c.key] ?? ""} onChange={(e) => actualizeaza((d) => ({ ...d, rezumat: { ...d.rezumat, [c.key]: e.target.value } }))} />
              )}
            </Camp>
          ))}
        </div>
      </Card>
    </div>
  );
}
