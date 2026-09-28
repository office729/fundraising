"use client";

import { ExternalLink } from "lucide-react";

import { cpaMaxim, parseNum, type Alocare } from "@/lib/avatar-donator/motor";
import {
  CANALE,
  CANAL_LABEL,
  CANAL_STATISTICI_IMPLICIT,
  CONVERSII,
  VARSTE_ETICHETE,
  type AvatarData,
  type CanalDate,
  type CanalId,
  type Conversie,
  type StatisticiPlatforma,
  type Varste,
} from "@/lib/avatar-donator/tipuri";

import { Card } from "../components/ui/card";
import { Input, Label, Select } from "../components/ui/input";

import type { Actualizeaza } from "./avatar-donator-client";

const lei = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} lei`;

// Acceptă doar linkuri http(s) — un link salvat de un membru nu trebuie să poată rula cod (ex. javascript:).
function urlSigur(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function LinkExtern({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-2.5 py-1 text-[12px] font-medium text-[var(--ci-primary)] hover:bg-[var(--ci-surface-2)]"
    >
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export function TabBuget({ data, actualizeaza, alocare, stat }: { data: AvatarData; actualizeaza: Actualizeaza; alocare: Alocare; stat: StatisticiPlatforma | null }) {
  const cpa = cpaMaxim(data);
  const setBuget = (k: keyof AvatarData["buget"], v: string) => actualizeaza((d) => ({ ...d, buget: { ...d.buget, [k]: v } }));
  const setMix = (k: keyof AvatarData["mix"], v: string) => actualizeaza((d) => ({ ...d, mix: { ...d.mix, [k]: v } }));
  const setVarsta = (k: keyof Varste, v: string) => actualizeaza((d) => ({ ...d, varste: { ...d.varste, [k]: v } }));
  const setCanal = (id: CanalId, k: keyof CanalDate, v: string) =>
    actualizeaza((d) => ({ ...d, canale: { ...d.canale, [id]: { ...d.canale[id], [k]: v } } }));

  const sumaMix = (["individual", "recurent", "companii", "altele"] as const).reduce((a, k) => a + (parseNum(data.mix[k]) ?? 0), 0);
  const sumaVarste = (Object.keys(VARSTE_ETICHETE) as (keyof Varste)[]).reduce((a, k) => a + (parseNum(data.varste[k]) ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* Buget și cost maxim */}
      <Card>
        <h2 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">Buget de promovare și cost maxim per donator</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label>Buget lunar de promovare (lei)</Label>
            <Input inputMode="decimal" value={data.buget.lunar} onChange={(e) => setBuget("lunar", e.target.value)} placeholder="ex. 1500" />
          </div>
          <div>
            <Label>Din el, pentru teste (%)</Label>
            <Input inputMode="decimal" value={data.buget.testPct} onChange={(e) => setBuget("testPct", e.target.value)} placeholder="20" />
          </div>
          <div />
          <div>
            <Label>Donația medie unică (lei)</Label>
            <Input inputMode="decimal" value={data.buget.donatieUnica} onChange={(e) => setBuget("donatieUnica", e.target.value)} placeholder="ex. 60" />
          </div>
          <div>
            <Label>Donația lunară medie, recurent (lei)</Label>
            <Input inputMode="decimal" value={data.buget.donatieLunara} onChange={(e) => setBuget("donatieLunara", e.target.value)} placeholder="ex. 30" />
          </div>
          <div>
            <Label>Recuperare cost în (luni)</Label>
            <Input inputMode="decimal" value={data.buget.luniRecuperare} onChange={(e) => setBuget("luniRecuperare", e.target.value)} placeholder="3" />
          </div>
        </div>
        <p className="mt-3 text-[13px] text-[var(--ci-text-muted)]">
          {cpa.valoare != null ? (
            <>
              Cost maxim acceptabil per donator nou: <b className="text-[var(--ci-text)]">{lei(cpa.valoare)}</b> — {cpa.explicatie}.
            </>
          ) : (
            "Completează donația medie (unică sau lunară) ca să calculez costul maxim pe care ți-l permiți per donator nou."
          )}
        </p>
        {stat && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] text-[var(--ci-text-muted)]">
            <span>
              Din platformă: {stat.donatii} donații online reușite, medie <b className="text-[var(--ci-text)]">{lei(stat.medie)}</b>, mediană {lei(stat.mediana)}.
            </span>
            <button
              type="button"
              onClick={() => setBuget("donatieUnica", String(stat.medie))}
              className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-2 py-0.5 font-medium text-[var(--ci-primary)] hover:bg-[var(--ci-surface)]"
            >
              Folosește media
            </button>
          </div>
        )}
        {alocare.buget != null && (
          <p className="mt-2 text-[12px] text-[var(--ci-text-faint)]">
            Împărțirea pe platforme o vezi în „Sinteză &amp; recomandări”.
          </p>
        )}
      </Card>

      {/* Public și obiectiv */}
      <Card>
        <h2 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">Donatorii tăi și obiectivul de venit</h2>
        <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">Vârstele decid ce platforme ajung la ei; tipul de venit decide ce platforme merită banii tăi.</p>

        <p className="mt-4 text-[13px] font-semibold text-[var(--ci-text)]">Vârsta donatorilor (% din total) <span className={`ml-2 text-[12px] font-normal ${sumaVarste > 0 && Math.round(sumaVarste) !== 100 ? "text-[var(--ci-amber)]" : "text-[var(--ci-text-muted)]"}`}>total {Math.round(sumaVarste)}%</span></p>
        <div className="mt-1.5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(Object.keys(VARSTE_ETICHETE) as (keyof Varste)[]).map((k) => (
            <div key={k}>
              <Label>{VARSTE_ETICHETE[k]}</Label>
              <Input inputMode="decimal" value={data.varste[k]} onChange={(e) => setVarsta(k, e.target.value)} placeholder="%" />
            </div>
          ))}
        </div>

        <p className="mt-4 text-[13px] font-semibold text-[var(--ci-text)]">Sursa venitului țintă (% din obiectiv) <span className={`ml-2 text-[12px] font-normal ${sumaMix > 0 && Math.round(sumaMix) !== 100 ? "text-[var(--ci-amber)]" : "text-[var(--ci-text-muted)]"}`}>total {Math.round(sumaMix)}%</span></p>
        <div className="mt-1.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["individual", "Donații individuale"],
              ["recurent", "Donații recurente"],
              ["companii", "Companii / sponsori"],
              ["altele", "SMS, granturi, evenimente"],
            ] as const
          ).map(([k, label]) => (
            <div key={k}>
              <Label>{label}</Label>
              <Input inputMode="decimal" value={data.mix[k]} onChange={(e) => setMix(k, e.target.value)} placeholder="%" />
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Conversia principală urmărită</Label>
            <Select value={data.conversie} onChange={(e) => actualizeaza((d) => ({ ...d, conversie: e.target.value as Conversie }))}>
              <option value="">— alege —</option>
              {CONVERSII.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Cât de ușor plătesc online donatorii (1 = greu, 5 = foarte ușor)</Label>
            <Select value={data.digital} onChange={(e) => actualizeaza((d) => ({ ...d, digital: e.target.value }))}>
              <option value="">— alege —</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {/* Canale + linkuri statistici */}
      <Card>
        <h2 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">Canale și statistici din social media</h2>
        <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">
          Lipește linkul profilului și al panoului de statistici, apoi notează lunar cifrele. „% din donatorii noi” și „cost real / donator” sunt cele mai valoroase: ele decid alocarea bugetului.
        </p>
        <div className="mt-4 space-y-4">
          {CANALE.map((id) => {
            const c = data.canale[id];
            const profil = urlSigur(c.profil);
            const statisticiUrl = urlSigur(c.statistici);
            const implicit = CANAL_STATISTICI_IMPLICIT[id];
            return (
              <div key={id} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[14px] font-bold text-[var(--ci-text)]">{CANAL_LABEL[id]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profil && <LinkExtern href={profil}>Deschide profilul</LinkExtern>}
                    {statisticiUrl ? (
                      <LinkExtern href={statisticiUrl}>Deschide statisticile</LinkExtern>
                    ) : (
                      <LinkExtern href={implicit.url}>{implicit.eticheta}</LinkExtern>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Link profil / pagină</Label>
                    <Input value={c.profil} onChange={(e) => setCanal(id, "profil", e.target.value)} placeholder="https://…" />
                  </div>
                  <div>
                    <Label>Link către statistici (analytics)</Label>
                    <Input value={c.statistici} onChange={(e) => setCanal(id, "statistici", e.target.value)} placeholder="https://…" />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <div>
                    <Label>Urmăritori</Label>
                    <Input inputMode="numeric" value={c.urmaritori} onChange={(e) => setCanal(id, "urmaritori", e.target.value)} />
                  </div>
                  <div>
                    <Label>Reach 30 zile</Label>
                    <Input inputMode="numeric" value={c.reach30} onChange={(e) => setCanal(id, "reach30", e.target.value)} />
                  </div>
                  <div>
                    <Label>Engagement (%)</Label>
                    <Input inputMode="decimal" value={c.engagement} onChange={(e) => setCanal(id, "engagement", e.target.value)} />
                  </div>
                  <div>
                    <Label>% din donatorii noi</Label>
                    <Input inputMode="decimal" value={c.donatoriNoiPct} onChange={(e) => setCanal(id, "donatoriNoiPct", e.target.value)} />
                  </div>
                  <div>
                    <Label>Cost real / donator (lei)</Label>
                    <Input inputMode="decimal" value={c.cpa} onChange={(e) => setCanal(id, "cpa", e.target.value)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--ci-text-faint)]">
          Linkurile deschid panourile platformelor în contul tău (trebuie să fii autentificat acolo). Cifrele le copiezi tu lunar — nu există încă o conectare automată la conturile de social media. Facebook și Instagram folosesc același panou Meta.
        </p>
      </Card>
    </div>
  );
}
