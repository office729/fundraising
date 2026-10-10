"use client";

import { useEffect, useState, useTransition } from "react";

import { trackEvent } from "@/lib/analytics";
import { dateFacturareComplete } from "@/lib/billing/date-facturare";
import { PACKAGE_LIMITS, type OrgPackage } from "@/lib/billing/packages";
import type { Locale } from "@/lib/i18n/config";
import { ABONAMENT_DICT } from "@/lib/i18n/dictionaries/abonament";
import { JUDETE } from "@/lib/judete";

import { citesteDateFacturareAction, salveazaDateFacturareAction, startCheckoutAction } from "./billing-actions";
import { CustomPlanBuilder } from "./custom-plan-builder";

// Planul personalizat (la cartă) e ascuns, la fel ca pe pagina publică de prețuri (hub/page.tsx). Codul rămâne; pune true ca să reapară.
const AFISEAZA_PLAN_PERSONALIZAT = false;

const PACHETE: { key: Exclude<OrgPackage, "trial" | "custom">; nume: string; popular?: boolean }[] = [
  { key: "start", nume: "START" },
  { key: "crestere", nume: "CREȘTERE", popular: true },
  { key: "impact", nume: "IMPACT" },
];

function limiteText(pkg: Exclude<OrgPackage, "trial" | "custom">, locale: Locale): string[] {
  const l = PACKAGE_LIMITS[pkg];
  const t = ABONAMENT_DICT[locale].picker;
  const loc = locale === "ro" ? "ro-RO" : "en-US";
  return [
    `${l.utilizatori} ${l.utilizatori === 1 ? t.utilizator : t.utilizatori}`,
    `${l.contactePf!.toLocaleString(loc)} ${t.contactePf}`,
    `${l.companiiPj!.toLocaleString(loc)} ${t.companii}`,
    l.contracteSponsorizarePeLuna == null ? t.contracteNelimitate : t.contracte(l.contracteSponsorizarePeLuna),
    ...(locale === "ro"
      ? [
          l.campaniiActive == null ? "Campanii active nelimitate" : `${l.campaniiActive} ${l.campaniiActive === 1 ? "campanie activă" : "campanii active"}`,
          l.conturi230 == null ? "Conturi Formular 230 nelimitate" : `${l.conturi230} ${l.conturi230 === 1 ? "cont" : "conturi"} Formular 230`,
          l.voluntariActivitati ? "Voluntari: sarcini online și activități pe teren" : "Voluntari: sarcini online",
        ]
      : [
          l.campaniiActive == null ? "Unlimited active campaigns" : `${l.campaniiActive} active ${l.campaniiActive === 1 ? "campaign" : "campaigns"}`,
          l.conturi230 == null ? "Unlimited Form 230 accounts" : `${l.conturi230} Form 230 ${l.conturi230 === 1 ? "account" : "accounts"}`,
          l.voluntariActivitati ? "Volunteers: online tasks and on-site activities" : "Volunteers: online tasks",
        ]),
  ];
}

// Grila de pachete + planul à la carte — folosită atât pe ecranul de blocare
// (paywall.tsx, după expirarea probei), cât și din Setări (abonament-section.tsx,
// disponibilă oricând, ca un ONG recomandat să-și poată revendica reducerea de
// 50% imediat, nu abia peste 14 zile). La alegere, pornește o sesiune Stripe
// Checkout reală și redirecționează — nu doar înregistrează intenția.
type DateFacturare = { cif: string | null; adresaSediu: string | null; judet: string | null };

// Date de facturare cerute ÎNAINTE de prima plată (factura Oblio nu poate pleca
// fără CIF și adresă). Formularul e aici, nu doar în Setări: un cont cu proba
// expirată vede doar paywall-ul și nu poate ajunge în Setări.
function DateFacturareForm({ orgSlug, initial, onSaved, locale }: { orgSlug: string; initial: DateFacturare; onSaved: (d: DateFacturare) => void; locale: Locale }) {
  const t = ABONAMENT_DICT[locale].facturare;
  const [cif, setCif] = useState(initial.cif ?? "");
  const [adresa, setAdresa] = useState(initial.adresaSediu ?? "");
  const [judet, setJudet] = useState(initial.judet ?? "");
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function salveaza(e: React.FormEvent) {
    e.preventDefault();
    setEroare(null);
    startTransition(async () => {
      try {
        const r = await salveazaDateFacturareAction(orgSlug, { cif, adresaSediu: adresa, judet });
        if (r.error) setEroare(r.error);
        else onSaved({ cif: cif.trim(), adresaSediu: adresa.trim(), judet });
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

export function PackagePicker({ orgSlug, locale }: { orgSlug: string; locale: Locale }) {
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
  const dateOk = date !== null && dateFacturareComplete(date);
  // Acord explicit pentru taxarea automată lunară (cerut de rețelele de carduri pentru plățile inițiate de comerciant):
  // butoanele de plată (pachete și plan personalizat) rămân blocate până e bifat.
  const [acord, setAcord] = useState(false);

  const [pending, startTransition] = useTransition();
  const [seLncarca, setSeIncarca] = useState<Exclude<OrgPackage, "trial"> | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);

  function alege(pkg: Exclude<OrgPackage, "trial" | "custom">) {
    setEroare(null);
    setSeIncarca(pkg);
    startTransition(async () => {
      try {
        const { url } = await startCheckoutAction(orgSlug, pkg, acord);
        trackEvent("begin_checkout", {
          currency: "RON",
          value: PACKAGE_LIMITS[pkg].pretLunar ?? undefined,
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
      <p className="mx-auto mb-4 max-w-xl text-center text-[12.5px] leading-relaxed text-muted-2">{t.recurent}</p>
      {eroare && <p className="mx-auto mb-4 max-w-xl text-center text-sm text-red-600">{eroare}</p>}
      {date && !dateOk && <DateFacturareForm orgSlug={orgSlug} initial={date} onSaved={setDate} locale={locale} />}
      <label className="mx-auto mb-5 flex max-w-xl items-start gap-2.5 text-[13px] leading-relaxed text-ink">
        <input type="checkbox" checked={acord} onChange={(e) => setAcord(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 rounded border-line" />
        <span>
          {t.acord}{" "}
          <a href="/termeni" target="_blank" rel="noopener" className="font-medium underline">
            {t.acordTermeni}
          </a>
          .
        </span>
      </label>
      <fieldset disabled={!dateOk || !acord} className={dateOk && acord ? "" : "opacity-50"}>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {PACHETE.map((p) => {
          const l = PACKAGE_LIMITS[p.key];
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
                  CEL MAI POPULAR
                </div>
              )}
              <h3 className="font-display text-lg font-bold text-ink">{p.nume}</h3>
              <p className="text-2xl font-extrabold text-ink">
                {l.pretLunar} lei<span className="text-sm font-medium text-muted">{t.pePerLuna}</span>
              </p>
              <div className="flex flex-col gap-1.5 border-t border-line pt-3">
                {limiteText(p.key, locale).map((linie) => (
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
                {activ ? t.seRedirectioneaza : t.alege(p.nume)}
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
