"use client";

import { useEffect, useState, useTransition } from "react";

import { trackEvent } from "@/lib/analytics";
import { dateFacturareComplete } from "@/lib/billing/date-facturare";
import { telefonPlataValid } from "@/lib/billing/date-antifraud";
import { areModul, LUNI_ACCES_ANUAL, MAX_UTILIZATORI_SUPLIMENTARI, PACKAGE_LIMITS, PRET_UTILIZATOR_SUPLIMENTAR, pretLunarPachet, pretPerioadaPachet, type Facturare, type ModulPachet, type OrgPackage } from "@/lib/billing/packages";
import type { Locale } from "@/lib/i18n/config";
import { ABONAMENT_DICT } from "@/lib/i18n/dictionaries/abonament";
import { JUDETE } from "@/lib/judete";

import { citesteDateFacturareAction, salveazaDateFacturareAction, startCheckoutAction } from "./billing-actions";
import { CustomPlanBuilder } from "./custom-plan-builder";
import { RecomandarePachet } from "./recomandare-pachet";

// Planul personalizat (la cartă) e ascuns, la fel ca pe pagina publică de prețuri (hub/page.tsx). Codul rămâne; pune true ca să reapară.
const AFISEAZA_PLAN_PERSONALIZAT = false;

const PACHETE: { key: Exclude<OrgPackage, "trial" | "custom">; nume: string; popular?: boolean }[] = [
  { key: "start", nume: "START" },
  { key: "crestere", nume: "CREȘTERE", popular: true },
  { key: "impact", nume: "IMPACT" },
];

function limiteText(pkg: Exclude<OrgPackage, "trial" | "custom">, locale: Locale, extra = 0): string[] {
  const l = PACKAGE_LIMITS[pkg];
  const ro = locale === "ro";
  const loc = ro ? "ro-RO" : "en-US";
  const nr = (n: number) => n.toLocaleString(loc);
  const utilizatori = l.utilizatori! + extra;
  const campanii = l.campaniiActive;
  const conturi = l.conturi230;
  const modul = (m: ModulPachet) => areModul(pkg, m);
  const [programLucru, kpi, design, voluntari, presa, analiza, granturi, calendar, analizaDonator, prioritizareFirme, caiCalde, prospectareMulti] = ["program-lucru", "kpi", "instrumente-design", "voluntari", "comunicat-presa", "analiza-baze", "granturi", "calendar", "analiza-donator", "prioritizare-firme", "cai-calde", "prospectare-multi"].map((m) => modul(m as ModulPachet));
  // Aceeași listă ca pe pagina publică de prețuri (hub.ts).
  return ro
    ? [
        `${utilizatori} ${utilizatori === 1 ? "utilizator" : "utilizatori"}`,
        `CRM persoane fizice — ${nr(l.contactePf!)} contacte`,
        `CRM persoane juridice — ${nr(l.companiiPj!)} contacte`,
        campanii == null ? "Campanii de strângere de fonduri — nelimitate" : `Campanii de strângere de fonduri — ${campanii} ${campanii === 1 ? "campanie activă" : "campanii active"}`,
        conturi == null ? "Formular 230 — conturi nelimitate" : `Formular 230 — ${conturi} ${conturi === 1 ? "cont" : "conturi"}`,
        ...(presa ? ["Comunicat de presă"] : []),
        ...(programLucru ? ["Program de lucru"] : []),
        ...(kpi ? ["KPI"] : []),
        ...(design ? ["Instrumente de design"] : []),
        ...(voluntari ? ["CRM voluntari"] : []),
        ...(analiza ? ["Analiza bazei de date persoane fizice"] : []),
        ...(granturi ? ["Granturi"] : []),
        ...(calendar ? ["Calendar de fundraising"] : []),
        ...(analizaDonator ? ["Analiza donatorilor: risc de pierdere, ritm, valoare estimată"] : []),
        ...(prioritizareFirme ? ["Prioritizarea firmelor pe benzi A/B/C"] : []),
        ...(caiCalde ? ["Căi calde către firme"] : []),
        ...(prospectareMulti ? ["Prospectare de decidenți, cu cheile tale la Lusha, Apollo, Prospeo, Hunter și Waalaxy"] : []),
        "Centrul de inovare: propui idei, votezi și vezi noutățile",
        pkg === "impact" ? "Suport prin e-mail și telefon" : "Suport prin e-mail",
      ]
    : [
        `${utilizatori} ${utilizatori === 1 ? "user" : "users"}`,
        `Individual CRM — ${nr(l.contactePf!)} contacts`,
        `Company CRM — ${nr(l.companiiPj!)} contacts`,
        campanii == null ? "Fundraising campaigns — unlimited" : `Fundraising campaigns — ${campanii} active ${campanii === 1 ? "campaign" : "campaigns"}`,
        conturi == null ? "Form 230 — unlimited accounts" : `Form 230 — ${conturi} ${conturi === 1 ? "account" : "accounts"}`,
        ...(presa ? ["Press release"] : []),
        ...(programLucru ? ["Work schedule"] : []),
        ...(kpi ? ["KPIs"] : []),
        ...(design ? ["Design tools"] : []),
        ...(voluntari ? ["Volunteer CRM"] : []),
        ...(analiza ? ["Individual database analysis"] : []),
        ...(granturi ? ["Grants"] : []),
        ...(calendar ? ["Fundraising calendar"] : []),
        "Innovation center: suggest ideas, vote and see what's new",
        pkg === "impact" ? "Email and phone support" : "Email support",
      ];
}

// Grila de pachete + planul à la carte — folosită atât pe ecranul de blocare
// (paywall.tsx, după expirarea probei), cât și din Setări (abonament-section.tsx,
// disponibilă oricând, ca un ONG recomandat să-și poată revendica reducerea de
// 50% imediat, nu abia peste 14 zile). La alegere, pornește o sesiune Stripe
// Checkout reală și redirecționează — nu doar înregistrează intenția.
type DateFacturare = { cif: string | null; adresaSediu: string | null; judet: string | null; telefon: string | null };

// Date de facturare cerute ÎNAINTE de prima plată (factura Oblio nu poate pleca
// fără CIF și adresă). Formularul e aici, nu doar în Setări: un cont cu proba
// expirată vede doar paywall-ul și nu poate ajunge în Setări.
function DateFacturareForm({ orgSlug, initial, onSaved, locale }: { orgSlug: string; initial: DateFacturare; onSaved: (d: DateFacturare) => void; locale: Locale }) {
  const t = ABONAMENT_DICT[locale].facturare;
  const [cif, setCif] = useState(initial.cif ?? "");
  const [adresa, setAdresa] = useState(initial.adresaSediu ?? "");
  const [judet, setJudet] = useState(initial.judet ?? "");
  // Telefonul plătitorului: câmpul apare doar când organizația nu are deja unul valid (altfel rămâne cel salvat la înscriere).
  const cereTelefon = !telefonPlataValid(initial.telefon);
  const [telefon, setTelefon] = useState("");
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function salveaza(e: React.FormEvent) {
    e.preventDefault();
    setEroare(null);
    startTransition(async () => {
      try {
        const r = await salveazaDateFacturareAction(orgSlug, { cif, adresaSediu: adresa, judet, ...(cereTelefon ? { telefon } : {}) });
        if (r.error) setEroare(r.error);
        else onSaved({ cif: cif.trim(), adresaSediu: adresa.trim(), judet, telefon: cereTelefon ? telefon.trim() : initial.telefon });
      } catch {
        setEroare(t.eroare);
      }
    });
  }

  const camp = "mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink";
  return (
    <form onSubmit={salveaza} className="mx-auto mb-6 max-w-xl rounded-xl border border-line bg-panel p-5">
      <p className="text-sm font-bold text-ink">{t.titlu}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{t.desc}</p>
      <div className="mt-3 flex flex-col gap-3">
        <label className="text-sm font-medium text-ink">
          {t.cif}
          <input value={cif} onChange={(e) => setCif(e.target.value)} placeholder={t.cifPlaceholder} className={camp} />
        </label>
        <label className="text-sm font-medium text-ink">
          {t.adresa}
          <input value={adresa} onChange={(e) => setAdresa(e.target.value)} placeholder={t.adresaPlaceholder} className={camp} />
        </label>
        <label className="text-sm font-medium text-ink">
          {t.judet}
          <select value={judet} onChange={(e) => setJudet(e.target.value)} className={camp}>
            <option value="">{t.alegeJudet}</option>
            {JUDETE.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </label>
        {cereTelefon && (
          <label className="text-sm font-medium text-ink">
            {t.telefon}
            <input value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder={t.telefonPlaceholder} inputMode="tel" autoComplete="tel" className={camp} />
          </label>
        )}
      </div>
      {eroare && <p className="mt-3 text-sm text-red-600">{eroare}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-md bg-brand-green px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-green-hover disabled:opacity-60"
      >
        {t.salveaza}
      </button>
    </form>
  );
}

// `pachetAles`: planul ales la înscriere (/signup?plan=…); se marchează pe card, dar nu schimbă prețul sau alegerea.
export function PackagePicker({ orgSlug, locale, extraInitial = 0, pachetAles }: { orgSlug: string; locale: Locale; extraInitial?: number; pachetAles?: OrgPackage }) {
  const t = ABONAMENT_DICT[locale].picker;
  const [date, setDate] = useState<DateFacturare | null>(null);
  useEffect(() => {
    let anulat = false;
    citesteDateFacturareAction(orgSlug)
      .then((d) => {
        if (!anulat) setDate(d);
      })
      .catch(() => {
        // Fără citire reușită rămân butoanele blocate; reîncărcarea paginii reia.
      });
    return () => {
      anulat = true;
    };
  }, [orgSlug]);
  const dateOk = date !== null && dateFacturareComplete(date) && telefonPlataValid(date.telefon);
  // Acord explicit pentru taxarea automată lunară (cerut de rețelele de carduri pentru plățile inițiate de comerciant):
  // butoanele de plată (pachete și plan personalizat) rămân blocate până e bifat.
  const [acord, setAcord] = useState(false);
  // Utilizatori plătiți în plus peste START (15 lei/lună fiecare) — prețul se recalculează oricum pe server.
  const [extra, setExtra] = useState(Math.min(MAX_UTILIZATORI_SUPLIMENTARI, Math.max(0, extraInitial)));
  // Anual = 12 luni de acces, 10 plătite. Suma exactă care se taxează acum apare pe buton.
  const [facturare, setFacturare] = useState<Facturare>("anual");
  const anual = facturare === "anual";
  const fmt = (n: number) => n.toLocaleString(locale === "ro" ? "ro-RO" : "en-US", { maximumFractionDigits: 0 });

  const [pending, startTransition] = useTransition();
  const [seLncarca, setSeIncarca] = useState<Exclude<OrgPackage, "trial"> | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);

  function alege(pkg: Exclude<OrgPackage, "trial" | "custom">) {
    setEroare(null);
    setSeIncarca(pkg);
    startTransition(async () => {
      try {
        const rezultat = await startCheckoutAction(orgSlug, pkg, acord, pkg === "start" ? extra : 0, facturare);
        if (rezultat.blocat !== undefined) {
          setEroare(rezultat.blocat);
          setSeIncarca(null);
          return;
        }
        const { url } = rezultat;
        trackEvent("begin_checkout", {
          currency: "RON",
          value: pretPerioadaPachet(pkg, pkg === "start" ? extra : 0, facturare) ?? undefined,
          items: [{ item_name: `Pachet ${PACHETE.find((p) => p.key === pkg)?.nume ?? pkg}`, quantity: 1 }],
          transport_type: "beacon",
        });
        window.location.href = url;
      } catch {
        setEroare(t.eroarePlata);
        setSeIncarca(null);
      }
    });
  }

  return (
    <div>
      {/* Disclosure ÎNAINTE de plată, nu doar în Setări după — reînnoirea
          automată pornește implicit dacă banca permite salvarea cardului (vezi
          netopia-confirm.ts), deci clientul trebuie să știe asta dinainte, nu
          să afle abia la a doua taxare. */}
      <RecomandarePachet orgSlug={orgSlug} locale={locale} />
      <div className="mx-auto mb-5 flex max-w-xl flex-col items-center gap-2.5">
        <p className="text-[13px] font-semibold text-muted">{t.facturareTitlu}</p>
        <div role="group" aria-label={t.facturareTitlu} className="inline-flex rounded-full border border-line bg-panel p-1">
          <button
            type="button"
            onClick={() => setFacturare("lunar")}
            aria-pressed={!anual}
            className={`rounded-full px-5 py-2 text-sm font-bold transition ${anual ? "text-muted hover:text-ink" : "bg-brand-blue text-white"}`}
          >
            {t.facturareLunar}
          </button>
          <button
            type="button"
            onClick={() => setFacturare("anual")}
            aria-pressed={anual}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition ${anual ? "bg-brand-blue text-white" : "text-muted hover:text-ink"}`}
          >
            {t.facturareAnual}
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${anual ? "bg-white/20 text-white" : "bg-brand-green-soft text-brand-green"}`}>{t.facturareReducere}</span>
          </button>
        </div>
      </div>
      <p className="mx-auto mb-4 max-w-xl text-center text-[12.5px] leading-relaxed text-muted-2">{anual ? t.recurentAnual : t.recurent}</p>
      {eroare && <p className="mx-auto mb-4 max-w-xl text-center text-sm text-red-600">{eroare}</p>}
      {date && !dateOk && <DateFacturareForm orgSlug={orgSlug} initial={date} onSaved={setDate} locale={locale} />}
      <label className="mx-auto mb-5 flex max-w-xl items-start gap-2.5 text-[13px] leading-relaxed text-ink">
        <input type="checkbox" checked={acord} onChange={(e) => setAcord(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 rounded border-line" />
        <span>
          {anual ? t.acordAnual : t.acord}{" "}
          <a href="/termeni" target="_blank" rel="noopener" className="font-medium underline">
            {t.acordTermeni}
          </a>
          .
        </span>
      </label>
      <fieldset disabled={!dateOk || !acord} className={dateOk && acord ? "" : "opacity-50"}>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {PACHETE.map((p) => {
          const activ = seLncarca === p.key;
          return (
            <div
              key={p.key}
              className={`relative flex flex-col gap-3 rounded-2xl border bg-panel p-6 ${
                p.popular ? "border-2 border-brand-green" : "border-line"
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-green px-3.5 py-1 text-[11px] font-extrabold tracking-wide whitespace-nowrap text-white">
                  RECOMANDAT
                </div>
              )}
              <h3 className="font-display text-lg font-bold text-ink">{p.nume}</h3>
              {pachetAles === p.key && <p className="-mt-2 text-[12px] font-medium text-brand-green">{locale === "ro" ? "Ales la înscriere" : "Chosen at sign-up"}</p>}
              <div>
                <p className="text-2xl font-extrabold text-ink">
                  {fmt(pretPerioadaPachet(p.key, p.key === "start" ? extra : 0, facturare) ?? 0)} lei<span className="text-sm font-medium text-muted">{anual ? t.pePerAn : t.pePerLuna}</span>
                </p>
                {anual && (
                  <p className="mt-0.5 text-[12px] text-muted">
                    {t.echivalentLunar(fmt(Math.round(((pretPerioadaPachet(p.key, p.key === "start" ? extra : 0, facturare) ?? 0) / LUNI_ACCES_ANUAL) * 10) / 10))}
                  </p>
                )}
              </div>
              {p.key === "start" && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink">{t.utilizatoriSuplimentari}</p>
                    <p className="text-[11.5px] text-muted-2">{t.utilizatoriSuplimentariDesc(PRET_UTILIZATOR_SUPLIMENTAR, MAX_UTILIZATORI_SUPLIMENTARI)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      aria-label={t.scadeUtilizator}
                      disabled={extra <= 0}
                      onClick={() => setExtra((n) => Math.max(0, n - 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-base font-bold text-ink transition hover:bg-brand-blue-soft disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-bold tabular-nums text-ink" aria-live="polite">
                      {extra}
                    </span>
                    <button
                      type="button"
                      aria-label={t.cresteUtilizator}
                      disabled={extra >= MAX_UTILIZATORI_SUPLIMENTARI}
                      onClick={() => setExtra((n) => Math.min(MAX_UTILIZATORI_SUPLIMENTARI, n + 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-base font-bold text-ink transition hover:bg-brand-blue-soft disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-1.5 border-t border-line pt-3">
                {limiteText(p.key, locale, p.key === "start" ? extra : 0).map((linie) => (
                  <div key={linie} className="flex gap-2 text-[13px] text-body">
                    <span className="text-brand-green">✓</span>
                    {linie}
                  </div>
                ))}
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => alege(p.key)}
                className={`mt-2 rounded-md py-2.5 text-center text-sm font-bold transition disabled:opacity-60 ${
                  activ ? "bg-brand-green text-white" : "border border-brand-blue text-brand-blue hover:bg-brand-blue-soft"
                }`}
              >
                {activ ? t.seRedirectioneaza : anual ? t.alegeAnual(p.nume, fmt(pretPerioadaPachet(p.key, p.key === "start" ? extra : 0, facturare) ?? 0)) : t.alege(p.nume)}
              </button>
            </div>
          );
        })}
      </div>

      {AFISEAZA_PLAN_PERSONALIZAT && (
        <div className="mt-5">
          <CustomPlanBuilder orgSlug={orgSlug} locale={locale} acord={acord} />
        </div>
      )}
      </fieldset>
    </div>
  );
}
