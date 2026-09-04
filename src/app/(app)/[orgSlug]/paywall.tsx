"use client";

import { useState, useTransition } from "react";

import { PACKAGE_LIMITS, PACKAGE_PRICE_ANUAL, type OrgPackage } from "@/lib/billing/packages";

import { choosePackageAction } from "./billing-actions";
import { logoutAction } from "./actions";

const PACHETE: { key: Exclude<OrgPackage, "trial">; nume: string; popular?: boolean }[] = [
  { key: "start", nume: "START" },
  { key: "crestere", nume: "CREȘTERE", popular: true },
  { key: "impact", nume: "IMPACT" },
];

function limiteText(pkg: Exclude<OrgPackage, "trial">): string[] {
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

export function Paywall({
  orgSlug,
  orgName,
  status,
  pachetAles,
}: {
  orgSlug: string;
  orgName: string;
  status: string;
  pachetAles: OrgPackage;
}) {
  const [pending, startTransition] = useTransition();
  const [alegere, setAlegere] = useState<Exclude<OrgPackage, "trial"> | null>(
    pachetAles === "trial" ? null : (pachetAles as Exclude<OrgPackage, "trial">),
  );
  const [trimis, setTrimis] = useState(status === "incomplete");

  function alege(pkg: Exclude<OrgPackage, "trial">) {
    setAlegere(pkg);
    startTransition(async () => {
      await choosePackageAction(orgSlug, pkg);
      setTrimis(true);
    });
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <span className="font-display text-base font-semibold text-brand-blue">{orgName}</span>
          <form action={logoutAction}>
            <button type="submit" className="text-[13px] font-medium text-muted transition hover:text-brand-blue">
              Deconectare
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-14">
        <div className="mx-auto max-w-xl text-center">
          <span className="inline-block rounded-full bg-brand-amber-soft px-3.5 py-1.5 text-xs font-bold tracking-wide text-brand-amber uppercase">
            Perioada de probă s-a încheiat
          </span>
          <h1 className="font-display mt-4 text-3xl font-bold text-ink">Alege pachetul organizației tale</h1>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Cele 14 zile gratuite pentru <strong>{orgName}</strong> s-au terminat. Alege un pachet ca să continui să
            folosești Fundraising Academy — accesul deplin se reactivează după confirmarea plății.
          </p>
        </div>

        {trimis && (
          <div className="mx-auto mt-8 max-w-xl rounded-xl border border-brand-green bg-brand-green-soft p-5 text-center">
            <p className="font-medium text-ink">
              Am înregistrat alegerea ta{alegere ? ` (${PACHETE.find((p) => p.key === alegere)?.nume})` : ""} —
              te contactăm în scurt timp la adresa contului pentru finalizarea plății și reactivarea accesului.
            </p>
            <p className="mt-2 text-sm text-muted">
              Ai nevoie urgent de acces? Scrie-ne direct la{" "}
              <a href="mailto:vlad.placinta@fundrasingacademy.ro" className="font-medium text-brand-green">
                vlad.placinta@fundrasingacademy.ro
              </a>
              .
            </p>
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PACHETE.map((p) => {
            const l = PACKAGE_LIMITS[p.key];
            const activ = alegere === p.key;
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
                    activ
                      ? "bg-brand-green text-white"
                      : "border border-brand-blue text-brand-blue hover:bg-brand-blue-soft"
                  }`}
                >
                  {activ && trimis ? "Pachet ales" : `Alege ${p.nume}`}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
