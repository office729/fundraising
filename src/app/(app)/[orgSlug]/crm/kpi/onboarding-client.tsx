"use client";

import { ArrowRight, Check, Circle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Breadcrumb } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { importaMembriiInEchipaAction, type StareOnboarding } from "./onboarding-actions";
import { seedeazaCategoriiDefaultAction } from "./library-actions";

type Pas = {
  k: string;
  titlu: string;
  descriere: string;
  gata: boolean;
  rezumat: string;
  href: string;
  eticheta: string;
  actiune?: { eticheta: string; ruleaza: () => Promise<string | void> };
};

// Configurare ghidată: 7 pași, bifați automat din ce există deja. Primul pas nefăcut e evidențiat; poți face pașii în orice ordine.
export function OnboardingClient({ orgSlug, stare, esteAdmin }: { orgSlug: string; stare: StareOnboarding; esteAdmin: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mesaj, setMesaj] = useState("");
  const [eroare, setEroare] = useState("");
  const crm = `/${orgSlug}/crm`;

  const pasi: Pas[] = [
    {
      k: "departamente",
      titlu: "Departamentele",
      descriere: "Cum e împărțită organizația ta (ex. Fundraising, Programe, Comunicare). Poți începe cu unul singur.",
      gata: stare.departamente > 0,
      rezumat: `${stare.departamente} definite`,
      href: `${crm}/organizatie`,
      eticheta: "Adaugă departamente",
    },
    {
      k: "roluri",
      titlu: "Rolurile",
      descriere: "Funcțiile din echipă (ex. Coordonator, Asistent). Un rol grupează KPI-urile care i se potrivesc.",
      gata: stare.roluri > 0,
      rezumat: `${stare.roluri} definite`,
      href: `${crm}/organizatie`,
      eticheta: "Adaugă roluri",
    },
    {
      k: "echipa",
      titlu: "Echipa",
      descriere: "Oamenii care vor avea KPI. Aduci dintr-un clic toți colegii care au deja cont pe platformă, ca să-și poată vedea „Performanța mea”.",
      gata: stare.angajati > 0 && stare.angajatiCuCont > 0,
      rezumat: `${stare.angajati} în echipă · ${stare.angajatiCuCont} cu cont legat · ${stare.membriPlatforma} membri pe platformă`,
      href: `${crm}/organizatie`,
      eticheta: "Deschide echipa",
      actiune: {
        eticheta: "Adu membrii platformei în echipă",
        ruleaza: async () => {
          const r = await importaMembriiInEchipaAction(orgSlug);
          return r.adaugati + r.legati === 0 ? "Toți membrii platformei sunt deja în echipă." : `Adăugați: ${r.adaugati}${r.legati ? ` · legați de conturi existente: ${r.legati}` : ""}.`;
        },
      },
    },
    {
      k: "manageri",
      titlu: "Cine pe cine coordonează",
      descriere: "Setează „Manager direct” pe colegi: așa apar „Echipa mea”, check-in-urile și 1:1-urile la persoana potrivită.",
      gata: stare.angajatiCuManager > 0,
      rezumat: `${stare.angajatiCuManager} cu manager setat`,
      href: `${crm}/organizatie`,
      eticheta: "Setează managerii",
    },
    {
      k: "kpi",
      titlu: "Primele KPI",
      descriere: "Alege din categoriile sugerate și creează 2–3 indicatori simpli. Mai bine puțini și clari decât mulți.",
      gata: stare.kpi > 0,
      rezumat: `${stare.kpi} în bibliotecă · ${stare.categorii} categorii`,
      href: `${crm}/kpi`,
      eticheta: "Deschide KPI Library",
      actiune:
        stare.categorii === 0
          ? {
              eticheta: "Adaugă categoriile sugerate",
              ruleaza: async () => {
                await seedeazaCategoriiDefaultAction(orgSlug);
                return "Categoriile sugerate au fost adăugate.";
              },
            }
          : undefined,
    },
    {
      k: "atribuiri",
      titlu: "Atribuie KPI",
      descriere: "Leagă fiecărei persoane KPI-urile ei, cu target și pondere. Targetul îl alegi tu — platforma nu impune niciunul.",
      gata: stare.atribuiri > 0,
      rezumat: `${stare.atribuiri} atribuiri active`,
      href: `${crm}/kpi/atribuiri`,
      eticheta: "Atribuie KPI",
    },
    {
      k: "valori",
      titlu: "Prima valoare",
      descriere: "Introdu (sau lasă să se calculeze) prima valoare. De aici apar graficele și dashboard-urile.",
      gata: stare.valori > 0,
      rezumat: `${stare.valori} valori înregistrate`,
      href: `${crm}/kpi/dashboard`,
      eticheta: "Vezi Performanța mea",
    },
  ];

  const facute = pasi.filter((p) => p.gata).length;
  const urmator = pasi.find((p) => !p.gata)?.k ?? null;

  function ruleaza(p: Pas) {
    if (!p.actiune) return;
    setMesaj("");
    setEroare("");
    start(async () => {
      try {
        const m = await p.actiune!.ruleaza();
        if (m) setMesaj(m);
        router.refresh();
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-[820px] space-y-5">
      <Breadcrumb items={[{ label: "Instrumente", href: `/${orgSlug}/crm/instrumente` }, { label: "KPI Library", href: `${crm}/kpi` }, { label: "Configurare" }]} />

      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Configurează KPI-urile organizației</h1>
        <p className="mt-0.5 max-w-xl text-[13px] text-[var(--ci-text-muted)]">
          Șapte pași scurți. Se bifează singuri pe măsură ce faci lucrurile; le poți face în orice ordine și te poți întoarce oricând.
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-[var(--ci-text)]">
            {facute === pasi.length ? "Totul e configurat" : `${facute} din ${pasi.length} pași făcuți`}
          </p>
          <span className="ci-tabular text-[12px] text-[var(--ci-text-muted)]">{Math.round((facute / pasi.length) * 100)}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--ci-surface-2)]" role="progressbar" aria-valuemin={0} aria-valuemax={pasi.length} aria-valuenow={facute}>
          <div className="h-full rounded-full bg-[var(--ci-primary)] transition-[width] duration-300" style={{ width: `${(facute / pasi.length) * 100}%` }} />
        </div>
      </Card>

      {!esteAdmin && <p className="rounded-lg bg-[var(--ci-amber-soft)] px-3.5 py-2.5 text-[13px] text-[var(--ci-amber)]">Configurarea o fac administratorii organizației. Aici poți vedea cât s-a făcut până acum.</p>}
      {mesaj && <p className="text-[13px] text-[var(--ci-green)]">{mesaj}</p>}
      {eroare && <p className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}

      <ol className="space-y-3">
        {pasi.map((p, i) => {
          const esteUrmatorul = p.k === urmator;
          return (
            <li key={p.k}>
              <Card className={esteUrmatorul ? "ring-2 ring-[var(--ci-primary)]" : ""}>
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${p.gata ? "bg-[var(--ci-green)] text-white" : esteUrmatorul ? "bg-[var(--ci-primary)] text-white" : "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]"}`}
                  >
                    {p.gata ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-[14px] font-bold text-[var(--ci-text)]">{p.titlu}</h2>
                      <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${p.gata ? "text-[var(--ci-green)]" : "text-[var(--ci-text-faint)]"}`}>
                        {!p.gata && <Circle className="h-3 w-3" />} {p.rezumat}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">{p.descriere}</p>
                    {esteAdmin && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {p.actiune && (
                          <Button variant="primary" size="sm" onClick={() => ruleaza(p)} disabled={pending}>
                            {p.actiune.eticheta}
                          </Button>
                        )}
                        <Link
                          prefetch={false}
                          href={p.href}
                          className="inline-flex min-h-8 items-center gap-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-[12px] font-semibold text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
                        >
                          {p.eticheta} <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}