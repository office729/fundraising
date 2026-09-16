"use client";

import { useState, useTransition } from "react";

import { PACKAGE_LIMITS, PACKAGE_PRICE_ANUAL, type OrgPackage } from "@/lib/billing/packages";

import { startCheckoutAction } from "./billing-actions";
import { CustomPlanBuilder } from "./custom-plan-builder";

const PACHETE: { key: Exclude<OrgPackage, "trial" | "custom">; nume: string; popular?: boolean }[] = [
  { key: "start", nume: "START" },
  { key: "crestere", nume: "CREȘTERE", popular: true },
  { key: "impact", nume: "IMPACT" },
];

function limiteText(pkg: Exclude<OrgPackage, "trial" | "custom">): string[] {
  const l = PACKAGE_LIMITS[pkg];
  return [
    `${l.utilizatori} ${l.utilizatori === 1 ? "utilizator" : "utilizatori"}`,
    `${l.contactePf!.toLocaleString("ro-RO")} contacte persoane fizice`,
    `${l.companiiPj!.toLocaleString("ro-RO")} companii`,
    l.contracteSponsorizarePeLuna == null
      ? "Contracte 20% și D177 nelimitate"
      : `${l.contracteSponsorizarePeLuna} contracte 20% + D177 / lună`,
  ];
}

// Grila de pachete + planul à la carte — folosită atât pe ecranul de blocare
// (paywall.tsx, după expirarea probei), cât și din Setări (abonament-section.tsx,
// disponibilă oricând, ca un ONG recomandat să-și poată revendica reducerea de
// 50% imediat, nu abia peste 14 zile). La alegere, pornește o sesiune Stripe
// Checkout reală și redirecționează — nu doar înregistrează intenția.
export function PackagePicker({ orgSlug }: { orgSlug: string }) {
  const [pending, startTransition] = useTransition();
  const [seLncarca, setSeIncarca] = useState<Exclude<OrgPackage, "trial"> | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);

  function alege(pkg: Exclude<OrgPackage, "trial" | "custom">) {
    setEroare(null);
    setSeIncarca(pkg);
    startTransition(async () => {
      try {
        const { url } = await startCheckoutAction(orgSlug, pkg);
        window.location.href = url;
      } catch {
        setEroare("Nu am putut porni plata — încearcă din nou sau scrie-ne la vlad.placinta@fundrasingacademy.ro.");
        setSeIncarca(null);
      }
    });
  }

  return (
    <div>
      {eroare && <p className="mx-auto mb-4 max-w-xl text-center text-sm text-red-600">{eroare}</p>}
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
                {l.pretLunar} lei<span className="text-sm font-medium text-muted">/lună</span>
              </p>
              <p className="text-[12.5px] text-muted-2">{PACKAGE_PRICE_ANUAL[p.key].toLocaleString("ro-RO")} lei/an (2 luni gratuite)</p>
              <div className="flex flex-col gap-1.5 border-t border-line pt-3">
                {limiteText(p.key).map((t) => (
                  <div key={t} className="flex gap-2 text-[13px] text-body">
                    <span className="text-brand-green">✓</span>
                    {t}
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
                {activ ? "Se redirecționează..." : `Alege ${p.nume}`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <CustomPlanBuilder orgSlug={orgSlug} />
      </div>
    </div>
  );
}
