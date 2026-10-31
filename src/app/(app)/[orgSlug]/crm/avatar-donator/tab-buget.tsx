"use client";

import { ExternalLink } from "lucide-react";

import { AVATAR_UI_DICT } from "@/lib/i18n/dictionaries/avatar-donator-ui";
import { conversiiLoc, statisticiImplicitEticheta } from "@/lib/avatar-donator/localizare";
import { cpaMaxim, parseNum, PRAG_BUGET_UN_CANAL, type Alocare } from "@/lib/avatar-donator/motor";
import {
  CANALE,
  CANAL_LABEL,
  CANAL_STATISTICI_IMPLICIT,
  VARSTE_ETICHETE,
  type AvatarData,
  type CanalDate,
  type CanalId,
  type Conversie,
  type StatisticiPlatforma,
  type Varste,
} from "@/lib/avatar-donator/tipuri";

import { Card } from "../components/ui/card";
import { Input, Select } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";

import { Camp, TotalProcente } from "./camp";
import type { Actualizeaza } from "./avatar-donator-client";
import { Rich } from "./rich";

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

function LinkExtern({ href, children, sr }: { href: string; children: React.ReactNode; sr: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-2.5 py-1 text-[12px] font-medium text-[var(--ci-primary)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none"
    >
      {children}
      <span className="sr-only">{sr}</span>
      <ExternalLink className="h-3 w-3" aria-hidden="true" />
    </a>
  );
}

export function TabBuget({
  data,
  actualizeaza,
  alocare,
  stat,
  continua,
}: {
  data: AvatarData;
  actualizeaza: Actualizeaza;
  alocare: Alocare;
  stat: StatisticiPlatforma | null;
  continua: () => void;
}) {
  const locale = useLocale();
  const d = AVATAR_UI_DICT[locale].buget;
  const fl = locale === "ro" ? "ro-RO" : "en-GB";
  const lei = (n: number) => `${Math.round(n).toLocaleString(fl)} lei`;
  const cpa = cpaMaxim(data, locale);
  const setBuget = (k: keyof AvatarData["buget"], v: string) => actualizeaza((d) => ({ ...d, buget: { ...d.buget, [k]: v } }));
  const setMix = (k: keyof AvatarData["mix"], v: string) => actualizeaza((d) => ({ ...d, mix: { ...d.mix, [k]: v } }));
  const setVarsta = (k: keyof Varste, v: string) => actualizeaza((d) => ({ ...d, varste: { ...d.varste, [k]: v } }));
  const setCanal = (id: CanalId, k: keyof CanalDate, v: string) =>
    actualizeaza((d) => ({ ...d, canale: { ...d.canale, [id]: { ...d.canale[id], [k]: v } } }));

  const sumaMix = (["individual", "recurent", "companii", "altele"] as const).reduce((a, k) => a + (parseNum(data.mix[k]) ?? 0), 0);
  const sumaVarste = (Object.keys(VARSTE_ETICHETE) as (keyof Varste)[]).reduce((a, k) => a + (parseNum(data.varste[k]) ?? 0), 0);
  const testPct = parseNum(data.buget.testPct);
  const testInvalid = testPct != null && (testPct < 0 || testPct > 60);
  const btnMic = "rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-2 py-0.5 font-medium text-[var(--ci-primary)] hover:bg-[var(--ci-surface)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none";

  return (
    <div className="space-y-5">
      {/* Buget și cost maxim */}
      <Card>
        <h2 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">{d.s1}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Camp label={d.lunar}>
            <Input inputMode="decimal" value={data.buget.lunar} onChange={(e) => setBuget("lunar", e.target.value)} placeholder={d.lunarEx} />
          </Camp>
          <Camp label={d.testPct}>
            <Input inputMode="decimal" value={data.buget.testPct} onChange={(e) => setBuget("testPct", e.target.value)} placeholder="20" aria-invalid={testInvalid} />
          </Camp>
          <div className="self-end text-[12px] text-[var(--ci-text-muted)]">
            {testInvalid ? <span className="text-[var(--ci-red)]">{d.testInvalid}</span> : d.testHint(PRAG_BUGET_UN_CANAL.toLocaleString(fl))}
          </div>
          <Camp label={d.donatieUnica}>
            <Input inputMode="decimal" value={data.buget.donatieUnica} onChange={(e) => setBuget("donatieUnica", e.target.value)} placeholder={d.donatieUnicaEx} />
          </Camp>
          <Camp label={d.repetare}>
            <Input inputMode="decimal" value={data.buget.repetare} onChange={(e) => setBuget("repetare", e.target.value)} placeholder={d.repetareEx} />
          </Camp>
          <Camp label={d.donatieLunara}>
            <Input inputMode="decimal" value={data.buget.donatieLunara} onChange={(e) => setBuget("donatieLunara", e.target.value)} placeholder={d.donatieLunaraEx} />
          </Camp>
          <Camp label={d.luni}>
            <Input inputMode="decimal" value={data.buget.luniRecuperare} onChange={(e) => setBuget("luniRecuperare", e.target.value)} placeholder="3" />
          </Camp>
          <Camp label={d.esantion}>
            <Input inputMode="numeric" value={data.buget.esantion} onChange={(e) => setBuget("esantion", e.target.value)} placeholder={d.esantionEx} />
          </Camp>
        </div>
        <p className="mt-3 text-[13px] text-[var(--ci-text-muted)]" role="status" aria-live="polite">
          {cpa.valoare != null ? (
            <>
              {d.cpaPre} <b className="text-[var(--ci-text)]">{lei(cpa.valoare)}</b> — {cpa.explicatie}.
            </>
          ) : (
            d.cpaGol
          )}
        </p>
        {stat && (
          <div className="mt-3 space-y-2 rounded-lg bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] text-[var(--ci-text-muted)]">
            {stat.donatii > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span>
                  <Rich text={d.statUnice(stat.donatii, lei(stat.medieUnica), lei(stat.medianaUnica))} boldClassName="text-[var(--ci-text)]" />
                </span>
                <button type="button" onClick={() => setBuget("donatieUnica", String(stat.medianaUnica))} className={btnMic}>
                  {d.folosesteMediana}
                </button>
              </div>
            )}
            {stat.incasariRecurente > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span>
                  <Rich text={d.statRecurent(stat.abonamenteActive, lei(stat.medianaLunara), stat.procentRecurent)} boldClassName="text-[var(--ci-text)]" />
                </span>
                <button type="button" onClick={() => setBuget("donatieLunara", String(stat.medianaLunara))} className={btnMic}>
                  {d.folosesteLunar}
                </button>
              </div>
            )}
          </div>
        )}
        {alocare.buget != null && <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">{d.impartirea}</p>}
      </Card>

      {/* Public și obiectiv */}
      <Card>
        <h2 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">{d.s2}</h2>
        <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">{d.s2Sub}</p>

        <p className="mt-4 text-[13px] font-semibold text-[var(--ci-text)]">
          {d.varsta}
          <TotalProcente total={sumaVarste} />
        </p>
        <div className="mt-1.5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(Object.keys(VARSTE_ETICHETE) as (keyof Varste)[]).map((k) => (
            <Camp key={k} label={d.varstaCamp(VARSTE_ETICHETE[k])}>
              <Input inputMode="decimal" value={data.varste[k]} onChange={(e) => setVarsta(k, e.target.value)} placeholder="%" />
            </Camp>
          ))}
        </div>

        <p className="mt-4 text-[13px] font-semibold text-[var(--ci-text)]">
          {d.sursaVenit}
          <TotalProcente total={sumaMix} />
        </p>
        <div className="mt-1.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["individual", "recurent", "companii", "altele"] as const).map((k) => (
            <Camp key={k} label={d.mix[k]}>
              <Input inputMode="decimal" value={data.mix[k]} onChange={(e) => setMix(k, e.target.value)} placeholder="%" />
            </Camp>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Camp label={d.conversiaPrincipala}>
            <Select value={data.conversie} onChange={(e) => actualizeaza((d) => ({ ...d, conversie: e.target.value as Conversie }))}>
              <option value="">{d.alege}</option>
              {conversiiLoc(locale).map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Camp>
          <Camp label={d.digital}>
            <Select value={data.digital} onChange={(e) => actualizeaza((d) => ({ ...d, digital: e.target.value }))}>
              <option value="">{d.alege}</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </Select>
          </Camp>
        </div>
      </Card>

      {/* Canale + linkuri statistici */}
      <Card>
        <h2 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">{d.s3}</h2>
        <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">{d.s3Sub}</p>
        <div className="mt-4 space-y-4">
          {CANALE.map((id) => {
            const c = data.canale[id];
            const profil = urlSigur(c.profil);
            const statisticiUrl = urlSigur(c.statistici);
            const profilInvalid = c.profil.trim() !== "" && !profil;
            const statisticiInvalid = c.statistici.trim() !== "" && !statisticiUrl;
            const implicit = CANAL_STATISTICI_IMPLICIT[id];
            return (
              <div key={id} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[14px] font-bold text-[var(--ci-text)]">{CANAL_LABEL[id]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profil && <LinkExtern href={profil} sr={d.sr}>{d.deschideProfilul}</LinkExtern>}
                    {statisticiUrl ? <LinkExtern href={statisticiUrl} sr={d.sr}>{d.deschideStatisticile}</LinkExtern> : <LinkExtern href={implicit.url} sr={d.sr}>{d.panouImplicit(statisticiImplicitEticheta(id, locale))}</LinkExtern>}
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Camp label={d.linkProfil(CANAL_LABEL[id])}>
                      <Input value={c.profil} onChange={(e) => setCanal(id, "profil", e.target.value)} placeholder="https://…" aria-invalid={profilInvalid} />
                    </Camp>
                    {profilInvalid && <p className="mt-1 text-[12px] text-[var(--ci-red)]">{d.linkInvalid}</p>}
                  </div>
                  <div>
                    <Camp label={d.linkStatistici(CANAL_LABEL[id])}>
                      <Input value={c.statistici} onChange={(e) => setCanal(id, "statistici", e.target.value)} placeholder="https://…" aria-invalid={statisticiInvalid} />
                    </Camp>
                    {statisticiInvalid && <p className="mt-1 text-[12px] text-[var(--ci-red)]">{d.linkInvalid}</p>}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <Camp label={d.urmaritori}>
                    <Input inputMode="numeric" value={c.urmaritori} onChange={(e) => setCanal(id, "urmaritori", e.target.value)} />
                  </Camp>
                  <Camp label={d.reach}>
                    <Input inputMode="numeric" value={c.reach30} onChange={(e) => setCanal(id, "reach30", e.target.value)} />
                  </Camp>
                  <Camp label={d.engagement}>
                    <Input inputMode="decimal" value={c.engagement} onChange={(e) => setCanal(id, "engagement", e.target.value)} />
                  </Camp>
                  <Camp label={d.donatoriNoi}>
                    <Input inputMode="decimal" value={c.donatoriNoiPct} onChange={(e) => setCanal(id, "donatoriNoiPct", e.target.value)} />
                  </Camp>
                  <Camp label={d.cpa}>
                    <Input inputMode="decimal" value={c.cpa} onChange={(e) => setCanal(id, "cpa", e.target.value)} />
                  </Camp>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--ci-text-muted)]">{d.notaLinkuri}</p>
      </Card>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={continua}
          className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--ci-primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {d.continua}
        </button>
      </div>
    </div>
  );
}
