"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CONECTORI, NUME_CONECTOR, type Conector, type ElementWaalaxy } from "@/lib/prospectare/motor";

import { optiuniWaalaxy, salveazaAlegereWaalaxy, salveazaCheieProspectare, stergeCheieProspectare, type StareChei } from "./prospectare-actions";

// Cheile organizației la Lusha, Apollo, Prospeo, Hunter și Waalaxy: criptate, verificate la furnizor înainte de salvare, afișate doar ca amprentă.
const AJUTOR: Record<Conector, { rol: string; unde: string; cost: string }> = {
  lusha: {
    rol: "Date de contact",
    unde: "Lusha: contul tău → Integrations / API → cheia API (accesul la API depinde de planul tău Lusha).",
    cost: "Căutarea și obținerea e-mailului consumă credite din contul tău Lusha.",
  },
  apollo: {
    rol: "Date de contact",
    unde: "Apollo: Settings → Integrations → API → creează o cheie („master key” sau cu acces la People Search și People Match).",
    cost: "Căutarea persoanelor nu consumă credite; obținerea e-mailului consumă credite din contul tău.",
  },
  prospeo: {
    rol: "Date de contact",
    unde: "Prospeo: contul tău → API (cheia API).",
    cost: "Căutarea consumă 1 credit pe pagină cu rezultate; e-mailul, câte 1 credit pe adresă găsită.",
  },
  hunter: {
    rol: "E-mailuri și verificare",
    unde: "Hunter: Dashboard → API → cheia ta.",
    cost: "Fiecare căutare pe domeniu, găsire de e-mail și verificare consumă câte un credit din contul tău.",
  },
  waalaxy: {
    rol: "Abordare pe LinkedIn",
    unde: "Waalaxy: Setări → cheie API / integrări (disponibilă conform planului tău Waalaxy).",
    cost: "Nu caută date. Trimite persoanele aprobate (cu profil LinkedIn) în lista și campania pe care le alegi mai jos; răspunsurile le vezi în Waalaxy.",
  },
};

export function ProspectareSection({ orgSlug, stare, limitaZilnica }: { orgSlug: string; stare: StareChei; limitaZilnica: number }) {
  const router = useRouter();
  const [valori, setValori] = useState<Record<string, string>>({});
  const [eroare, setEroare] = useState<{ furnizor: string; mesaj: string } | null>(null);
  const [lucreaza, setLucreaza] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [liste, setListe] = useState<{ liste: ElementWaalaxy[]; campanii: ElementWaalaxy[] } | null>(null);
  const [listaAleasa, setListaAleasa] = useState(stare.waalaxy?.listaId ?? "");
  const [campanieAleasa, setCampanieAleasa] = useState(stare.waalaxy?.campanieId ?? "");
  const [notaWaalaxy, setNotaWaalaxy] = useState<string | null>(null);
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });

  const ruleaza = (furnizor: string, f: () => Promise<{ error: string | null }>) =>
    startTransition(async () => {
      setEroare(null);
      setNotaWaalaxy(null);
      setLucreaza(furnizor);
      const r = await f();
      setLucreaza(null);
      if (r.error) setEroare({ furnizor, mesaj: r.error });
      else {
        setValori((v) => ({ ...v, [furnizor]: "" }));
        if (furnizor === "waalaxy") setListe(null);
        router.refresh();
      }
    });

  const incarcaListe = () =>
    startTransition(async () => {
      setEroare(null);
      setNotaWaalaxy(null);
      setLucreaza("waalaxy-liste");
      const r = await optiuniWaalaxy(orgSlug);
      setLucreaza(null);
      if (r.error) setEroare({ furnizor: "waalaxy", mesaj: r.error });
      else setListe({ liste: r.liste, campanii: r.campanii });
    });

  const salveazaAlegerea = () => {
    const lista = liste?.liste.find((l) => l.id === listaAleasa);
    const campanie = liste?.campanii.find((c) => c.id === campanieAleasa);
    if (!lista) return;
    ruleaza("waalaxy", async () => {
      const r = await salveazaAlegereWaalaxy(orgSlug, { listaId: lista.id, listaNume: lista.nume, campanieId: campanie?.id ?? "", campanieNume: campanie?.nume ?? "" });
      if (!r.error) setNotaWaalaxy("Alegerea a fost salvată.");
      return r;
    });
  };

  return (
    <section id="prospectare" className="mt-8 scroll-mt-4 rounded-xl border border-line bg-panel p-5">
      <h2 className="font-medium text-ink">Prospectare: cheile tale la furnizori</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Alexandrit caută decidenți pentru firmele din CRM folosind contul TĂU la Lusha, Apollo, Prospeo și/sau Hunter, iar cu Waalaxy îi poți trimite apoi la abordare pe LinkedIn. Cheile se salvează criptat și nu mai apar niciodată pe ecran. Apelurile și creditele se consumă din
        contul tău la furnizor: Alexandrit nu le plătește și nu le refacturează. Limita este de {limitaZilnica} de apeluri pe zi pentru organizație.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Ordinea căutării: începe cu furnizorii gratuiți sau mai ieftini (Apollo, apoi Prospeo și Hunter, la urmă Lusha) și se oprește când sunt destui candidați potriviți. E-mailul se caută doar pentru persoanele alese. Poți conecta oricâți, nu e nevoie de toți.
      </p>
      {!stare.criptareActiva && <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900">Salvarea cheilor nu e activată pe această platformă (lipsește cheia de criptare). Scrie-ne ca s-o activăm.</p>}

      <div className="mt-4 space-y-4">
        {CONECTORI.map((f) => {
          const salvata = stare.chei.find((c) => c.furnizor === f);
          return (
            <div key={f} className="rounded-lg border border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">
                  {NUME_CONECTOR[f]} <span className="ml-1 text-[11px] font-normal text-muted">{AJUTOR[f].rol}</span>
                </p>
                {salvata ? (
                  <span className="text-xs font-medium text-brand-green">
                    ✓ conectat · cheia {salvata.amprenta} · {fmt(salvata.adaugatLa)}
                  </span>
                ) : (
                  <span className="text-xs text-muted">neconectat</span>
                )}
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{AJUTOR[f].unde}</p>
              <p className="text-[11.5px] leading-relaxed text-muted">{AJUTOR[f].cost}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={valori[f] ?? ""}
                  onChange={(e) => setValori((v) => ({ ...v, [f]: e.target.value }))}
                  placeholder={salvata ? "Înlocuiește cheia" : "Lipește cheia API"}
                  aria-label={`Cheia API ${NUME_CONECTOR[f]}`}
                  className="h-9 min-w-[16rem] flex-1 rounded-md border border-line bg-panel px-2.5 text-sm text-ink"
                />
                <button
                  type="button"
                  disabled={pending || !(valori[f] ?? "").trim() || !stare.criptareActiva}
                  onClick={() => ruleaza(f, () => salveazaCheieProspectare(orgSlug, f, valori[f] ?? ""))}
                  className="h-9 rounded-md bg-brand-green px-3 text-sm font-semibold text-white transition hover:bg-brand-green-hover disabled:opacity-50"
                >
                  {lucreaza === f ? "Se verifică…" : "Salvează și verifică"}
                </button>
                {salvata && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => ruleaza(f, () => stergeCheieProspectare(orgSlug, f))}
                    className="h-9 rounded-md border border-line px-3 text-sm font-medium text-ink hover:bg-panel-2 disabled:opacity-50"
                  >
                    Șterge cheia
                  </button>
                )}
              </div>
              {eroare?.furnizor === f && <p className="mt-2 text-sm text-red-600">{eroare.mesaj}</p>}
              {(stare.apeluri30Zile[f] ?? 0) > 0 && <p className="mt-1.5 text-[11.5px] text-muted">Ultimele 30 de zile: {stare.apeluri30Zile[f]} apeluri făcute cu cheia aceasta.</p>}

              {f === "waalaxy" && salvata && (
                <div className="mt-3 rounded-md bg-panel-2 p-3">
                  <p className="text-xs font-medium text-ink">Unde trimitem persoanele aprobate</p>
                  {stare.waalaxy ? (
                    <p className="mt-1 text-[11.5px] text-muted">
                      Listă: <strong className="text-ink">{stare.waalaxy.listaNume || stare.waalaxy.listaId}</strong>
                      {stare.waalaxy.campanieId ? (
                        <>
                          {" "}
                          · campanie: <strong className="text-ink">{stare.waalaxy.campanieNume || stare.waalaxy.campanieId}</strong>
                        </>
                      ) : (
                        " · fără campanie (doar adăugare în listă)"
                      )}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11.5px] text-amber-800">Alege o listă; până atunci opțiunea „Trimite și în Waalaxy” nu apare pe fișa firmei.</p>
                  )}
                  {!liste ? (
                    <button type="button" disabled={pending} onClick={incarcaListe} className="mt-2 h-9 rounded-md border border-line bg-panel px-3 text-sm font-medium text-ink hover:bg-panel-2 disabled:opacity-50">
                      {lucreaza === "waalaxy-liste" ? "Se citesc listele…" : stare.waalaxy ? "Schimbă lista sau campania" : "Alege lista și campania"}
                    </button>
                  ) : (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <label className="text-[11.5px] text-muted">
                        Lista Waalaxy
                        <select value={listaAleasa} onChange={(e) => setListaAleasa(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-line bg-panel px-2 text-sm text-ink">
                          <option value="">Alege lista…</option>
                          {liste.liste.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.nume}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-[11.5px] text-muted">
                        Campania (opțional)
                        <select value={campanieAleasa} onChange={(e) => setCampanieAleasa(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-line bg-panel px-2 text-sm text-ink">
                          <option value="">Fără campanie</option>
                          {liste.campanii.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nume}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="sm:col-span-2">
                        <button
                          type="button"
                          disabled={pending || !listaAleasa}
                          onClick={salveazaAlegerea}
                          className="h-9 rounded-md bg-brand-green px-3 text-sm font-semibold text-white transition hover:bg-brand-green-hover disabled:opacity-50"
                        >
                          Salvează alegerea
                        </button>
                        {liste.liste.length === 0 && <span className="ml-3 text-[11.5px] text-muted">Nu am găsit nicio listă în Waalaxy; creeaz-o acolo și reîncarcă.</span>}
                      </div>
                    </div>
                  )}
                  {notaWaalaxy && <p className="mt-2 text-[11.5px] font-medium text-brand-green">{notaWaalaxy}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11.5px] leading-relaxed text-muted">
        Date personale: persoanele găsite stau în lista „De aprobat” a firmei până le aprobă cineva din echipă. Când adaugi o persoană ca contact, datele ei vin de la un terț: informeaz-o în cel mult 30 de zile despre prelucrare (art. 14 GDPR) și respectă
        cererile de ștergere. Trimiterea în Waalaxy se face doar la cererea ta, pentru fiecare persoană aprobată. La respingere poți alege „nu o mai propune deloc”; acum sunt {stare.suprimate} {stare.suprimate === 1 ? "persoană" : "persoane"} în lista de excluderi.
      </p>
    </section>
  );
}
