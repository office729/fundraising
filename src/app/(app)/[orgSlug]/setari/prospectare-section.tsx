"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { NUME_CONECTOR, type Conector, type ElementWaalaxy } from "@/lib/prospectare/motor";
import { WaalaxyWebhookCard } from "./waalaxy-webhook-card";

import { creditePrelucrare } from "../crm/companii/[id]/prospectare-actions";
import {
  listaExcluderiProspectare,
  optiuniWaalaxy,
  salveazaAlegereWaalaxy,
  salveazaCheieProspectare,
  scoateExcludereProspectare,
  stergeCheieProspectare,
  type Excludere,
  type RolCampanie,
  type SetariWaalaxy,
  type StareChei,
} from "./prospectare-actions";

// Cheile organizației la instrumentele de prospectare: criptate, verificate înainte de salvare, afișate doar ca amprentă.
// Ordinea: cele gratuite sau ieftine întâi (Apollo, Prospeo, Hunter), apoi Lusha (cea mai scumpă), apoi Waalaxy (abordare pe LinkedIn, nu caută date).
const ORDINE: readonly Conector[] = ["apollo", "prospeo", "hunter", "lusha", "waalaxy"];

const AJUTOR: Record<Conector, { rol: string; unde: string; plan: string; cost: string; link: string; recomandat?: boolean }> = {
  apollo: {
    rol: "Date de contact",
    unde: "În contul Apollo: Settings → Integrations → API → creează o cheie („master key” sau cu acces la People Search și People Match).",
    plan: "Funcționează și cu planul gratuit, cu limite.",
    cost: "Căutarea persoanelor nu consumă credite; obținerea e-mailului consumă credite din contul tău.",
    link: "https://app.apollo.io/",
    recomandat: true,
  },
  prospeo: {
    rol: "Date de contact",
    unde: "În contul Prospeo: secțiunea API → cheia API.",
    plan: "Verifică în contul tău că planul include accesul API.",
    cost: "Căutarea consumă 1 credit pe pagină cu rezultate; e-mailul, câte 1 credit pe adresă găsită.",
    link: "https://app.prospeo.io/",
  },
  hunter: {
    rol: "E-mailuri și verificare",
    unde: "În contul Hunter: Dashboard → API → cheia ta.",
    plan: "Funcționează și cu planul gratuit, cu puține credite.",
    cost: "Fiecare căutare pe domeniu, găsire de e-mail și verificare consumă câte un credit din contul tău.",
    link: "https://hunter.io/api-keys",
  },
  lusha: {
    rol: "Date de contact",
    unde: "În contul Lusha: Integrations / API → cheia API.",
    plan: "Accesul la API depinde de planul tău Lusha; dacă nu apare cheia, scrie-le să-l activeze.",
    cost: "Căutarea și obținerea e-mailului consumă credite din contul tău Lusha (e cea mai scumpă dintre ele, de aceea e ultima folosită).",
    link: "https://dashboard.lusha.com/",
  },
  waalaxy: {
    rol: "Abordare pe LinkedIn",
    unde: "În Waalaxy: Setări → cheie API / integrări.",
    plan: "Disponibilă doar pe planurile Waalaxy cu acces la API; verifică în contul tău.",
    cost: "Nu caută date. Trimite persoanele aprobate (cu profil LinkedIn) în lista și campania pe care le alegi mai jos; răspunsurile le vezi în Waalaxy.",
    link: "https://app.waalaxy.com/",
  },
};

const ROLURI: { rol: RolCampanie; eticheta: string }[] = [
  { rol: "decident", eticheta: "Decident final (administrator, CEO)" },
  { rol: "buget", eticheta: "Decide bugetul (director financiar)" },
  { rol: "csr", eticheta: "CSR / marketing" },
];

export function ProspectareSection({ orgSlug, stare, limitaZilnica }: { orgSlug: string; stare: StareChei; limitaZilnica: number }) {
  const router = useRouter();
  const [valori, setValori] = useState<Record<string, string>>({});
  const [eroare, setEroare] = useState<{ furnizor: string; mesaj: string } | null>(null);
  const [reusit, setReusit] = useState<{ furnizor: string; mesaj: string } | null>(null);
  const [lucreaza, setLucreaza] = useState<string | null>(null);
  const [deSters, setDeSters] = useState<string | null>(null);
  const [respinse, setRespinse] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();
  const [liste, setListe] = useState<{ liste: ElementWaalaxy[]; campanii: ElementWaalaxy[] } | null>(null);
  const [listaAleasa, setListaAleasa] = useState(stare.waalaxy?.listaId ?? "");
  const [campanieAleasa, setCampanieAleasa] = useState(stare.waalaxy?.campanieId ?? "");
  const [campaniiRol, setCampaniiRol] = useState<Record<RolCampanie, string>>({
    decident: stare.waalaxy?.campaniiRol.decident?.id ?? "",
    buget: stare.waalaxy?.campaniiRol.buget?.id ?? "",
    csr: stare.waalaxy?.campaniiRol.csr?.id ?? "",
  });
  const [excluderi, setExcluderi] = useState<Excludere[] | null>(null);
  const [deScosExcludere, setDeScosExcludere] = useState<string | null>(null);
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });
  const conectat = (f: Conector) => stare.chei.find((c) => c.furnizor === f);
  const waalaxyConectat = Boolean(conectat("waalaxy"));

  // Cheile respinse ulterior de furnizor (revocate, expirate) se văd și aici, nu doar pe fișa firmei.
  useEffect(() => {
    let activ = true;
    creditePrelucrare(orgSlug).then((r) => {
      if (activ) setRespinse(Object.fromEntries(r.filter((x) => x.conectat && x.eroare).map((x) => [x.furnizor, true])));
    });
    return () => {
      activ = false;
    };
  }, [orgSlug, stare.chei]);

  // Mesajul de reușită dispare singur.
  useEffect(() => {
    if (!reusit) return;
    const t = setTimeout(() => setReusit(null), 6000);
    return () => clearTimeout(t);
  }, [reusit]);

  const incarcaListe = () =>
    startTransition(async () => {
      setLucreaza("waalaxy-liste");
      const r = await optiuniWaalaxy(orgSlug);
      setLucreaza(null);
      if (r.error) setEroare({ furnizor: "waalaxy", mesaj: r.error });
      else setListe({ liste: r.liste, campanii: r.campanii });
    });

  // După ce cheia Waalaxy e acceptată (sau dacă e conectată dar fără listă aleasă), listele se încarcă singure.
  useEffect(() => {
    if (!waalaxyConectat || stare.waalaxy || liste) return;
    let activ = true;
    optiuniWaalaxy(orgSlug).then((r) => {
      if (activ && !r.error) setListe({ liste: r.liste, campanii: r.campanii });
    });
    return () => {
      activ = false;
    };
  }, [waalaxyConectat, stare.waalaxy, liste, orgSlug]);

  const ruleaza = (furnizor: string, f: () => Promise<{ error: string | null }>, mesajReusit?: string, inlocuiesteCheia = false) =>
    startTransition(async () => {
      setEroare(null);
      setReusit(null);
      setLucreaza(furnizor);
      const r = await f();
      setLucreaza(null);
      if (r.error) setEroare({ furnizor, mesaj: inlocuiesteCheia && conectat(furnizor as Conector) ? `${r.error} Cheia veche a rămas activă.` : r.error });
      else {
        setValori((v) => ({ ...v, [furnizor]: "" }));
        if (mesajReusit) setReusit({ furnizor, mesaj: mesajReusit });
        router.refresh();
      }
    });

  const salveazaAlegerea = () => {
    const lista = liste?.liste.find((l) => l.id === listaAleasa);
    if (!lista) return;
    const gaseste = (id: string) => liste?.campanii.find((c) => c.id === id);
    const campanie = gaseste(campanieAleasa);
    const rol: SetariWaalaxy["campaniiRol"] = {};
    for (const { rol: r } of ROLURI) {
      const c = gaseste(campaniiRol[r]);
      if (c) rol[r] = { id: c.id, nume: c.nume };
    }
    ruleaza("waalaxy-lista", () => salveazaAlegereWaalaxy(orgSlug, { listaId: lista.id, listaNume: lista.nume, campanieId: campanie?.id ?? "", campanieNume: campanie?.nume ?? "", campaniiRol: rol }), "Alegerea a fost salvată.");
  };

  const deschideExcluderi = () => {
    if (excluderi) return;
    listaExcluderiProspectare(orgSlug).then(setExcluderi);
  };

  return (
    <section id="prospectare" className="mt-8 scroll-mt-4 rounded-xl border border-line bg-panel p-5">
      <h2 className="font-medium text-ink">Prospectare: conectează-ți conturile la instrumente</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Pe fișa fiecărei firme, Alexandrit poate căuta persoanele care decid sponsorizările (administrator, director financiar, CSR…), cu e-mail verificat, folosind contul TĂU la unul sau mai multe instrumente de date de contact. Cheile se salvează criptat și nu mai apar niciodată pe ecran.
        Creditele se consumă din contul tău la instrument: Alexandrit nu le plătește și nu le refacturează.
      </p>

      <ol className="mt-3 space-y-1.5 rounded-lg bg-panel-2 p-3 text-xs leading-relaxed text-ink">
        <li>
          <strong>1.</strong> Ai (sau creezi) un cont la unul dintre instrumentele de mai jos.
        </li>
        <li>
          <strong>2.</strong> În contul lui copiezi „cheia API”: un cod lung, care îi permite CRM-ului să caute în numele tău.
        </li>
        <li>
          <strong>3.</strong> O lipești în caseta instrumentului și apeși „Salvează și verifică”. O poți șterge de aici oricând (și o poți anula și din contul instrumentului). Nu o da nimănui altcuiva.
        </li>
      </ol>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        <strong className="text-ink">Nu trebuie să le conectezi pe toate: un singur instrument e suficient ca să începi.</strong> Apoi, pe fișa oricărei firme apare „Decidenți găsiți”, cu persoanele propuse, rolul fiecăreia și e-mailul. Căutarea începe cu instrumentele gratuite sau mai
        ieftine (Apollo, apoi Prospeo și Hunter, la urmă Lusha) și se oprește când a găsit decidentul și omul de la finanțe. E-mailul se caută doar pentru primele persoane. Limita este de {limitaZilnica} de apeluri pe zi pentru organizație.
      </p>
      {!stare.criptareActiva && <p role="alert" className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900">Salvarea cheilor nu e activată pe această platformă (lipsește cheia de criptare). Scrie-ne ca s-o activăm.</p>}

      <div className="mt-4 space-y-3">
        {ORDINE.map((f) => {
          const salvata = conectat(f);
          const respinsa = Boolean(salvata && respinse[f]);
          const confirmaStergere = deSters === f;
          return (
            <details key={f} open={Boolean(salvata) || eroare?.furnizor === f || undefined} className="group rounded-lg border border-line p-3">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm font-semibold text-ink">
                <span>
                  {NUME_CONECTOR[f]} <span className="ml-1 text-xs font-normal text-muted">{AJUTOR[f].rol}</span>
                  {AJUTOR[f].recomandat && <span className="ml-2 rounded-full bg-brand-green/10 px-2 py-0.5 text-xs font-medium text-brand-green">Bun pentru început</span>}
                </span>
                {salvata ? (
                  respinsa ? (
                    <span className="text-xs font-medium text-red-700">cheia a fost respinsă de instrument: înlocuiește-o</span>
                  ) : (
                    <span className="text-xs font-medium text-brand-green">
                      ✓ conectat · cheia {salvata.amprenta} · {fmt(salvata.adaugatLa)}
                    </span>
                  )
                ) : (
                  <span className="text-xs font-normal text-muted">neconectat</span>
                )}
              </summary>

              <p className="mt-2 text-xs leading-relaxed text-muted">
                {AJUTOR[f].unde}{" "}
                <a href={AJUTOR[f].link} target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline">
                  Deschide contul {NUME_CONECTOR[f]}
                </a>
                .
              </p>
              <p className="text-xs leading-relaxed text-muted">{AJUTOR[f].plan}</p>
              <p className="text-xs leading-relaxed text-muted">{AJUTOR[f].cost}</p>

              <form
                className="mt-2 flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if ((valori[f] ?? "").trim() && stare.criptareActiva && !pending) ruleaza(f, () => salveazaCheieProspectare(orgSlug, f, valori[f] ?? ""), `${NUME_CONECTOR[f]} conectat. Cheia a fost acceptată.`, true);
                }}
              >
                <label className="min-w-0 flex-1 text-xs text-muted sm:min-w-[16rem]">
                  Cheia API {NUME_CONECTOR[f]}
                  <input
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={valori[f] ?? ""}
                    onChange={(e) => setValori((v) => ({ ...v, [f]: e.target.value }))}
                    placeholder={salvata ? "Înlocuiește cheia" : "Lipește cheia API"}
                    className="mt-1 h-10 w-full rounded-md border border-line bg-panel px-2.5 text-sm text-ink"
                  />
                </label>
                <button
                  type="submit"
                  disabled={pending || !(valori[f] ?? "").trim() || !stare.criptareActiva}
                  className="h-10 rounded-md bg-brand-green px-3 text-sm font-semibold text-white transition hover:bg-brand-green-hover disabled:opacity-50"
                >
                  {lucreaza === f ? "Se verifică…" : "Salvează și verifică"}
                </button>
                {salvata && !confirmaStergere && (
                  <button type="button" disabled={pending} onClick={() => setDeSters(f)} className="h-10 rounded-md border border-line px-3 text-sm font-medium text-ink hover:bg-panel-2 disabled:opacity-50">
                    Șterge cheia
                  </button>
                )}
              </form>
              {f === "waalaxy" && salvata && <p className="mt-1 text-xs text-muted">Dacă înlocuiești cheia Waalaxy, trebuie să alegi din nou lista și campaniile.</p>}

              {confirmaStergere && (
                <div role="alertdialog" aria-label={`Ștergi cheia ${NUME_CONECTOR[f]}?`} className="mt-2 rounded-md bg-panel-2 p-3 text-xs text-ink">
                  <p>
                    Ștergi cheia {NUME_CONECTOR[f]}? {f === "waalaxy" ? "Trimiterea în Waalaxy se oprește și lista aleasă se pierde." : `Căutarea cu ${NUME_CONECTOR[f]} se oprește.`} Cheia rămâne activă în contul tău {NUME_CONECTOR[f]} până o anulezi acolo.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setDeSters(null);
                        ruleaza(f, () => stergeCheieProspectare(orgSlug, f), `Cheia ${NUME_CONECTOR[f]} a fost ștearsă.`);
                      }}
                      className="h-9 rounded-md bg-red-700 px-3 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                    >
                      Șterge
                    </button>
                    <button type="button" onClick={() => setDeSters(null)} className="h-9 rounded-md border border-line px-3 text-sm font-medium text-ink hover:bg-panel">
                      Renunță
                    </button>
                  </div>
                </div>
              )}

              {eroare?.furnizor === f && (
                <p role="alert" className="mt-2 text-sm text-red-700">
                  {eroare.mesaj}
                </p>
              )}
              {reusit?.furnizor === f && (
                <p role="status" className="mt-2 text-sm font-medium text-brand-green">
                  {reusit.mesaj}
                </p>
              )}
              {(stare.apeluri30Zile[f] ?? 0) > 0 && <p className="mt-1.5 text-xs text-muted">Ultimele 30 de zile: {stare.apeluri30Zile[f]} apeluri făcute cu cheia aceasta.</p>}

              {f === "waalaxy" && salvata && (
                <div className="mt-3 rounded-md bg-panel-2 p-3">
                  <p className="text-xs font-medium text-ink">Unde trimitem persoanele aprobate</p>
                  {stare.waalaxy ? (
                    <p className="mt-1 text-xs text-muted">
                      Listă: <strong className="text-ink">{stare.waalaxy.listaNume || stare.waalaxy.listaId}</strong>
                      {stare.waalaxy.campanieId ? (
                        <>
                          {" "}
                          · campanie generală: <strong className="text-ink">{stare.waalaxy.campanieNume || stare.waalaxy.campanieId}</strong>
                        </>
                      ) : (
                        " · fără campanie generală"
                      )}
                      {ROLURI.filter((r) => stare.waalaxy?.campaniiRol[r.rol]).map((r) => (
                        <span key={r.rol} className="block">
                          {r.eticheta}: <strong className="text-ink">{stare.waalaxy?.campaniiRol[r.rol]?.nume || stare.waalaxy?.campaniiRol[r.rol]?.id}</strong>
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-amber-800">Alege o listă. Până atunci, bifa „trimite și în Waalaxy” nu apare pe fișa firmei.</p>
                  )}
                  {!liste ? (
                    <button type="button" disabled={pending} onClick={incarcaListe} className="mt-2 h-10 rounded-md border border-line bg-panel px-3 text-sm font-medium text-ink hover:bg-panel-2 disabled:opacity-50">
                      {lucreaza === "waalaxy-liste" ? "Se citesc listele…" : stare.waalaxy ? "Schimbă lista sau campaniile" : "Alege lista și campaniile"}
                    </button>
                  ) : (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <label className="text-xs text-muted">
                        Lista Waalaxy
                        <select value={listaAleasa} onChange={(e) => setListaAleasa(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-panel px-2 text-sm text-ink">
                          <option value="">Alege lista…</option>
                          {liste.liste.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.nume}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-muted">
                        Campania generală (opțional)
                        <select value={campanieAleasa} onChange={(e) => setCampanieAleasa(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-panel px-2 text-sm text-ink">
                          <option value="">Fără campanie</option>
                          {liste.campanii.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nume}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="text-xs leading-relaxed text-muted sm:col-span-2">
                        Campania e secvența de mesaje LinkedIn din Waalaxy. Fără campanie, persoanele doar intră în listă, iar tu pornești abordarea din Waalaxy. Poți alege și o campanie diferită pentru fiecare rol (mesajul pentru un administrator nu e cel pentru un director
                        financiar); rolurile fără campanie proprie folosesc campania generală.
                      </p>
                      {ROLURI.map(({ rol, eticheta }) => (
                        <label key={rol} className="text-xs text-muted">
                          Campanie pentru: {eticheta}
                          <select value={campaniiRol[rol]} onChange={(e) => setCampaniiRol((v) => ({ ...v, [rol]: e.target.value }))} className="mt-1 h-10 w-full rounded-md border border-line bg-panel px-2 text-sm text-ink">
                            <option value="">La fel ca cea generală</option>
                            {liste.campanii.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nume}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                      <div className="sm:col-span-2">
                        <button type="button" disabled={pending || !listaAleasa} onClick={salveazaAlegerea} className="h-10 rounded-md bg-brand-green px-3 text-sm font-semibold text-white transition hover:bg-brand-green-hover disabled:opacity-50">
                          Salvează alegerea
                        </button>
                      </div>
                      {liste.liste.length === 0 && (
                        <p className="text-xs text-muted sm:col-span-2">
                          Nu am găsit nicio listă în Waalaxy. Creează una în contul tău{" "}
                          <a href={AJUTOR.waalaxy.link} target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline">
                            Waalaxy
                          </a>{" "}
                          și reîncarcă această pagină.
                        </p>
                      )}
                    </div>
                  )}
                  {reusit?.furnizor === "waalaxy-lista" && (
                    <p role="status" className="mt-2 text-sm font-medium text-brand-green">
                      {reusit.mesaj}
                    </p>
                  )}
                  {eroare?.furnizor === "waalaxy-lista" && (
                    <p role="alert" className="mt-2 text-sm text-red-700">
                      {eroare.mesaj}
                    </p>
                  )}
                </div>
              )}
            </details>
          );
        })}
      </div>

      {waalaxyConectat && <WaalaxyWebhookCard orgSlug={orgSlug} />}

      <div className="mt-4 space-y-2 text-xs leading-relaxed text-muted">
        <p>
          <strong className="text-ink">După aprobare.</strong> Persoanele găsite stau în „De aprobat” până le aprobă cineva din echipă. Când adaugi o persoană ca contact, datele ei vin de la un terț: informează-o despre prelucrare cât mai repede și în cel mult 30 de zile (art. 14 GDPR). Trimiterea în
          Waalaxy se face doar la cererea ta, pentru fiecare persoană.
        </p>
        <details onToggle={(e) => e.currentTarget.open && deschideExcluderi()}>
          <summary className="cursor-pointer font-medium text-ink">
            Excluse de la prospectare ({stare.suprimate} {stare.suprimate === 1 ? "persoană" : "persoane"})
          </summary>
          <p className="mt-1">Persoanele care au cerut să nu mai fie contactate nu mai sunt propuse niciodată pentru nicio firmă. Dacă ai exclus pe cineva din greșeală, o poți scoate din listă.</p>
          {excluderi === null ? (
            <p className="mt-2">Se încarcă…</p>
          ) : excluderi.length === 0 ? (
            <p className="mt-2">Nicio persoană exclusă.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line rounded-md border border-line">
              {excluderi.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0 break-all text-ink">
                    <span className="mr-2 rounded bg-panel-2 px-1.5 py-0.5 text-xs text-muted">{x.tip === "email" ? "e-mail" : x.tip === "linkedin" ? "LinkedIn" : "nume"}</span>
                    {x.valoare}
                    <span className="ml-2 text-muted">
                      {x.motiv ? `${x.motiv} · ` : ""}
                      {fmt(x.la)}
                    </span>
                  </span>
                  {deScosExcludere === x.id ? (
                    <span className="flex gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const r = await scoateExcludereProspectare(orgSlug, x.id);
                            setDeScosExcludere(null);
                            if (!r.error) {
                              setExcluderi((l) => (l ? l.filter((y) => y.id !== x.id) : l));
                              router.refresh();
                            }
                          })
                        }
                        className="h-9 rounded-md bg-red-700 px-3 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                      >
                        Scoate din listă
                      </button>
                      <button type="button" onClick={() => setDeScosExcludere(null)} className="h-9 rounded-md border border-line px-3 text-xs font-medium text-ink hover:bg-panel-2">
                        Renunță
                      </button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setDeScosExcludere(x.id)} className="h-9 rounded-md border border-line px-3 text-xs font-medium text-ink hover:bg-panel-2">
                      Scoate din listă
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </details>
      </div>
    </section>
  );
}
