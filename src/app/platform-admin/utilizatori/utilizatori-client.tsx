"use client";

import { useMemo, useState } from "react";

import type { RandUtilizator } from "@/lib/suport/utilizatori-admin";
import { ETICHETE_STARE, ZILE_ACTIV, type StareUtilizator } from "@/lib/utilizatori/activitate";

const FUSUL = "Europe/Bucharest";
const dataOra = (d: Date | null) =>
  d ? new Date(d).toLocaleString("ro-RO", { timeZone: FUSUL, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const CLASE_STARE: Record<StareUtilizator, string> = {
  activ: "bg-brand-green-soft text-brand-green",
  inactiv: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  niciodata: "bg-panel-2 text-muted",
};

const ROL: Record<string, string> = { owner: "Proprietar", admin: "Administrator", member: "Membru" };

type Filtru = "toti" | StareUtilizator;

function vechime(zile: number | null): string {
  if (zile === null) return "";
  if (zile === 0) return "azi";
  if (zile === 1) return "acum 1 zi";
  return `acum ${zile} zile`;
}

export function UtilizatoriClient({ initial }: { initial: RandUtilizator[] }) {
  const [filtru, setFiltru] = useState<Filtru>("toti");
  const [cauta, setCauta] = useState("");

  const numere = useMemo(() => {
    const n: Record<StareUtilizator, number> = { activ: 0, inactiv: 0, niciodata: 0 };
    for (const u of initial) n[u.stare] += 1;
    return n;
  }, [initial]);

  const vizibili = useMemo(() => {
    const q = cauta.trim().toLowerCase();
    return initial.filter((u) => (filtru === "toti" || u.stare === filtru) && (!q || [u.email, u.nume, u.orgNume].some((x) => x?.toLowerCase().includes(q))));
  }, [initial, filtru, cauta]);

  const butoane: { cheie: Filtru; eticheta: string; nr: number }[] = [
    { cheie: "toti", eticheta: "Toți", nr: initial.length },
    { cheie: "activ", eticheta: "Activi", nr: numere.activ },
    { cheie: "inactiv", eticheta: "Inactivi", nr: numere.inactiv },
    { cheie: "niciodata", eticheta: "Fără activitate înregistrată", nr: numere.niciodata },
  ];

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-2">
        {butoane.map((b) => (
          <button
            key={b.cheie}
            type="button"
            onClick={() => setFiltru(b.cheie)}
            aria-pressed={filtru === b.cheie}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${filtru === b.cheie ? "border-brand-blue bg-brand-blue text-white" : "border-line bg-panel text-body hover:border-brand-blue"}`}
          >
            {b.eticheta} <span className="opacity-80">({b.nr})</span>
          </button>
        ))}
        <input
          value={cauta}
          onChange={(e) => setCauta(e.target.value)}
          placeholder="Caută după nume, e-mail sau organizație"
          aria-label="Caută utilizator"
          className="ml-auto min-w-[16rem] rounded-lg border border-line bg-panel px-3 py-1.5 text-[13px] text-ink"
        />
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-panel">
        <table className="w-full min-w-[56rem] text-left text-[13px]">
          <thead className="border-b border-line bg-panel-2 text-xs text-muted">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Utilizator</th>
              <th className="px-3 py-2.5 font-semibold">Organizație</th>
              <th className="px-3 py-2.5 font-semibold">Prima intrare</th>
              <th className="px-3 py-2.5 font-semibold">Ultima autentificare</th>
              <th className="px-3 py-2.5 font-semibold">Ultima pagină în CRM</th>
              <th className="px-3 py-2.5 font-semibold">Ultima lucrare</th>
              <th className="px-3 py-2.5 font-semibold">Stare</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {vizibili.map((u) => (
              <tr key={`${u.id}-${u.orgSlug ?? "fara"}`} className="align-top">
                <td className="px-3 py-2.5">
                  <div className="font-medium text-ink">{u.nume || u.email}</div>
                  {u.nume ? <div className="text-xs text-muted">{u.email}</div> : null}
                </td>
                <td className="px-3 py-2.5">
                  {u.orgNume ? (
                    <>
                      <div className="text-ink">{u.orgNume}</div>
                      <div className="text-xs text-muted">{u.rol ? (ROL[u.rol] ?? u.rol) : ""}</div>
                    </>
                  ) : (
                    <span className="text-muted">{u.tipCont === "beneficiar" ? "Beneficiar" : "—"}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-body">
                  {dataOra(u.primaIntrare)}
                  {u.primaIntrareEstimata ? <div className="text-xs text-muted" title="Cont mai vechi, dinainte de notarea primei autentificări: data creării contului">≈ data creării contului</div> : null}
                </td>
                <td className="px-3 py-2.5 text-body">{dataOra(u.ultimaAutentificare)}</td>
                <td className="px-3 py-2.5 text-body">{dataOra(u.ultimaVizita)}</td>
                <td className="px-3 py-2.5 text-body">{dataOra(u.ultimaLucrare)}</td>
                <td className="px-3 py-2.5">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${CLASE_STARE[u.stare]}`}>{ETICHETE_STARE[u.stare]}</span>
                  {u.zileDeLaUltimulSemn !== null ? <div className="mt-0.5 text-xs text-muted">ultimul semn: {vechime(u.zileDeLaUltimulSemn)}</div> : null}
                </td>
              </tr>
            ))}
            {vizibili.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted">
                  Niciun utilizator pentru filtrul ales.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">
        „Ultima pagină în CRM” și „Ultima lucrare” se notează de acum încolo, cel mult o dată la 5 minute; până când utilizatorul deschide din nou CRM-ul, rămân goale. „Fără activitate înregistrată” înseamnă că nu avem încă nicio autentificare sau vizită notată (conturile mai vechi nu aveau autentificarea notată dacă s-au conectat prin linkul din email sau cu Google). Activ = un semn de viață în ultimele {ZILE_ACTIV} zile
        (autentificare, pagină deschisă sau acțiune).
      </p>
    </div>
  );
}
