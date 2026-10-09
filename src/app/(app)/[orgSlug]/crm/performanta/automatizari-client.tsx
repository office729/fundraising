"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { RezultatRulare, SetariAutomatizari } from "@/lib/performanta-automatizari";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input, Label, Select } from "../components/ui/input";
import { ruleazaAcumAction, salveazaSetariAction } from "./automatizari-actions";
import { dataOra } from "./ui-comune";

type Cheie = "termene" | "blocaje" | "actualizari" | "rezumat" | "riscManager" | "multumire" | "raportSponsor";

const REGULI: { cheie: Cheie; titlu: string; ce: string; cine: string; repetari: string }[] = [
  { cheie: "termene", titlu: "Termene care se apropie sau au trecut", ce: "O notificare grupată cu activitățile care au termen până la următoarea zi lucrătoare și cu cele al căror termen a trecut ieri.", cine: "Responsabilul fiecărei activități.", repetari: "O dată înainte și o dată după termen; o singură notificare pe zi, cu toate activitățile." },
  { cheie: "blocaje", titlu: "Blocaje", ce: "Anunță un blocaj nou care cere decizie, ziua de revenire și prima zi după ea.", cine: "Cel care îl poate rezolva, cel care l-a raportat și, după termen, managerul lui.", repetari: "Fiecare etapă se trimite o singură dată pe blocaj." },
  { cheie: "actualizari", titlu: "Cereri de actualizare", ce: "Reamintește rezultatele-cheie introduse manual care nu mai sunt la zi sau n-au nicio valoare după prima săptămână.", cine: "Cel care actualizează rezultatul.", repetari: "Cel mult o notificare pe săptămână, pe persoană." },
  { cheie: "rezumat", titlu: "Rezumatul săptămânii", ce: "Activități cu termen în săptămână, restanțe și obiective în risc; managerii primesc și starea echipei.", cine: "Toți cei cu cont, în ziua aleasă.", repetari: "O dată pe săptămână; nu se trimite dacă nu e nimic de spus." },
  { cheie: "riscManager", titlu: "Obiectiv în risc", ce: "Anunță managerul când un obiectiv al unui om din echipa lui ajunge „în risc” sau „întârziat”.", cine: "Managerul direct al responsabilului.", repetari: "O dată pe lună pentru fiecare obiectiv și fiecare stare." },
  { cheie: "multumire", titlu: "Sarcină de mulțumire după o donație", ce: "Creează o sarcină „Mulțumește lui …” pentru fiecare donație online confirmată, peste un prag, al cărei donator nu a fost încă mulțumit.", cine: "Persoana aleasă mai jos.", repetari: "O sarcină pe donație, niciodată dublată." },
  { cheie: "raportSponsor", titlu: "Sarcină de raport pentru sponsor", ce: "Creează o sarcină de raport când se înregistrează o sponsorizare în CRM Companii, cu termen propus la 30 de zile.", cine: "Persoana aleasă mai jos.", repetari: "O sarcină pe sponsorizare, niciodată dublată." },
];

const ZILE = ["Luni", "Marți", "Miercuri", "Joi", "Vineri"];

export function AutomatizariClient({ orgSlug, setari, angajati, admin }: { orgSlug: string; setari: SetariAutomatizari; angajati: { id: string; nume: string }[]; admin: boolean }) {
  const router = useRouter();
  const [s, setS] = useState<SetariAutomatizari>(setari);
  const [mesaj, setMesaj] = useState<{ t: string; eroare: boolean } | null>(null);
  const [rezultat, setRezultat] = useState<RezultatRulare | null>(null);
  const [pending, tr] = useTransition();
  const [rulare, trRulare] = useTransition();
  const set = <K extends keyof SetariAutomatizari>(k: K, v: SetariAutomatizari[K]) => setS((x) => ({ ...x, [k]: v }));

  function salveaza() {
    setMesaj(null);
    tr(async () => {
      const r = await salveazaSetariAction(orgSlug, { ...s });
      if (!r.ok) return setMesaj({ t: r.eroare, eroare: true });
      setMesaj({ t: "Setările au fost salvate.", eroare: false });
      router.refresh();
    });
  }

  const ru = setari.ultimaRulare;
  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-[13px] text-[var(--ci-text-muted)]">
        Automatizările rulează în zilele lucrătoare, dimineața. Notificările apar în aplicație (fila „Notificări”), nu pe email. Nimic nu e decis de un model: fiecare mesaj spune ce l-a declanșat. Valorile din CRM nu au nevoie de automatizare, pentru că rezultatele-cheie legate de CRM se calculează la fiecare citire, din datele validate.
        {!admin && " Setările le schimbă un administrator."}
      </p>

      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {REGULI.map((r) => (
          <li key={r.cheie}>
            <Card className="h-full">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" className="mt-1 size-4" disabled={!admin} checked={s[r.cheie]} onChange={(e) => set(r.cheie, e.target.checked)} />
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-[var(--ci-text)]">{r.titlu}</span>
                  <span className="mt-0.5 block text-[13px] text-[var(--ci-text-muted)]">{r.ce}</span>
                </span>
              </label>
              <dl className="mt-2.5 space-y-1 pl-7 text-[12px] text-[var(--ci-text-muted)]">
                <div>
                  <dt className="inline font-medium text-[var(--ci-text)]">Cine primește: </dt>
                  <dd className="inline">{r.cine}</dd>
                </div>
                <div>
                  <dt className="inline font-medium text-[var(--ci-text)]">Fără repetări: </dt>
                  <dd className="inline">{r.repetari}</dd>
                </div>
              </dl>
              {r.cheie === "rezumat" && (
                <div className="mt-3 pl-7">
                  <Label htmlFor="a-zi">Ziua rezumatului</Label>
                  <Select id="a-zi" className="!w-auto min-w-36" disabled={!admin} value={s.ziRezumat} onChange={(e) => set("ziRezumat", Number(e.target.value))}>
                    {ZILE.map((z, i) => (
                      <option key={z} value={i + 1}>
                        {z}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {r.cheie === "multumire" && (
                <div className="mt-3 grid gap-2 pl-7 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="a-prag">Pragul donației (lei)</Label>
                    <Input id="a-prag" type="number" min={1} disabled={!admin} value={s.pragMultumire} onChange={(e) => set("pragMultumire", Number(e.target.value))} />
                  </div>
                  <div>
                    <Label htmlFor="a-rm">Cine mulțumește</Label>
                    <Select id="a-rm" disabled={!admin} value={s.responsabilMultumireId ?? ""} onChange={(e) => set("responsabilMultumireId", e.target.value || null)}>
                      <option value="">Alege…</option>
                      {angajati.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nume}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}
              {r.cheie === "raportSponsor" && (
                <div className="mt-3 pl-7">
                  <Label htmlFor="a-rr">Cine pregătește rapoartele</Label>
                  <Select id="a-rr" className="!w-auto min-w-52" disabled={!admin} value={s.responsabilRaportId ?? ""} onChange={(e) => set("responsabilRaportId", e.target.value || null)}>
                    <option value="">Alege…</option>
                    {angajati.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nume}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        {admin && (
          <>
            <Button variant="primary" loading={pending} onClick={salveaza}>
              Salvează setările
            </Button>
            <Button
              loading={rulare}
              onClick={() =>
                trRulare(async () => {
                  setMesaj(null);
                  const r = await ruleazaAcumAction(orgSlug);
                  if (!r.ok) return setMesaj({ t: r.eroare, eroare: true });
                  setRezultat(r.rezultat);
                  router.refresh();
                })
              }
            >
              Rulează acum
            </Button>
          </>
        )}
        <p role="status" aria-live="polite" className={mesaj ? `text-[13px] ${mesaj.eroare ? "rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[var(--ci-red)]" : "text-[var(--ci-green)]"}` : "sr-only"}>
          {mesaj?.t ?? ""}
        </p>
      </div>
      {admin && <p className="text-[12px] text-[var(--ci-text-muted)]">„Rulează acum” aplică regulile salvate. Ce a fost deja trimis nu se trimite din nou. Salvează întâi dacă ai schimbat ceva.</p>}

      {(rezultat || ru) && (
        <Card>
          <h3 className="ci-display text-[14px] font-semibold text-[var(--ci-text)]">Ultima rulare{ru ? ` · ${dataOra(ru.la)}` : ""}</h3>
          {(() => {
            const r = rezultat ?? ru!.rezumat;
            return (
              <ul className="mt-2 grid gap-x-6 gap-y-1 text-[13px] text-[var(--ci-text-muted)] sm:grid-cols-2">
                <li>Notificări de termene: <strong className="text-[var(--ci-text)]">{r.termene}</strong></li>
                <li>Notificări de blocaje: <strong className="text-[var(--ci-text)]">{r.blocaje}</strong></li>
                <li>Cereri de actualizare: <strong className="text-[var(--ci-text)]">{r.actualizari}</strong></li>
                <li>Rezumate săptămânale: <strong className="text-[var(--ci-text)]">{r.rezumat}</strong></li>
                <li>Obiective în risc anunțate: <strong className="text-[var(--ci-text)]">{r.risc}</strong></li>
                <li>Sarcini de mulțumire create: <strong className="text-[var(--ci-text)]">{r.multumiri}</strong></li>
                <li>Sarcini de raport create: <strong className="text-[var(--ci-text)]">{r.rapoarte}</strong></li>
              </ul>
            );
          })()}
        </Card>
      )}
    </div>
  );
}
