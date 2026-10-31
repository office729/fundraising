"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { SETARI_PROSPECTARE_UI_DICT } from "@/lib/i18n/dictionaries/setari-prospectare-ui";
import { NUME_CONECTOR, type Conector, type ElementWaalaxy } from "@/lib/prospectare/motor";
import { WaalaxyWebhookCard } from "./waalaxy-webhook-card";

import { creditePrelucrare } from "../crm/companii/[id]/prospectare-actions";
import { useLocale } from "../crm/lib/locale-context";
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

const AJUTOR: Record<Conector, { link: string; recomandat?: boolean }> = {
  apollo: { link: "https://app.apollo.io/", recomandat: true },
  prospeo: { link: "https://app.prospeo.io/" },
  hunter: { link: "https://hunter.io/api-keys" },
  lusha: { link: "https://dashboard.lusha.com/" },
  waalaxy: { link: "https://app.waalaxy.com/" },
};

const ROLURI: RolCampanie[] = ["decident", "buget", "csr"];

export function ProspectareSection({ orgSlug, stare, limitaZilnica }: { orgSlug: string; stare: StareChei; limitaZilnica: number }) {
  const router = useRouter();
  const locale = useLocale();
  const d = SETARI_PROSPECTARE_UI_DICT[locale];
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
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(locale === "ro" ? "ro-RO" : "en-GB", { day: "2-digit", month: "short", year: "numeric" });
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
      if (r.error) setEroare({ furnizor, mesaj: inlocuiesteCheia && conectat(furnizor as Conector) ? `${r.error} ${d.veche}` : r.error });
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
    for (const r of ROLURI) {
      const c = gaseste(campaniiRol[r]);
      if (c) rol[r] = { id: c.id, nume: c.nume };
    }
    ruleaza("waalaxy-lista", () => salveazaAlegereWaalaxy(orgSlug, { listaId: lista.id, listaNume: lista.nume, campanieId: campanie?.id ?? "", campanieNume: campanie?.nume ?? "", campaniiRol: rol }), d.alegereSalvata);
  };

  const deschideExcluderi = () => {
    if (excluderi) return;
    listaExcluderiProspectare(orgSlug).then(setExcluderi);
  };

  return (
    <section id="prospectare" className="mt-8 scroll-mt-4 rounded-xl border border-line bg-panel p-5">
      <h2 className="font-medium text-ink">{d.titlu}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        {d.intro1} {d.intro2}
      </p>

      <ol className="mt-3 space-y-1.5 rounded-lg bg-panel-2 p-3 text-xs leading-relaxed text-ink">
        <li>
          <strong>1.</strong> {d.pas1}
        </li>
        <li>
          <strong>2.</strong> {d.pas2}
        </li>
        <li>
          <strong>3.</strong> {d.pas3}
        </li>
      </ol>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        <strong className="text-ink">{d.unSingur}</strong> {d.explicatie(limitaZilnica)}
      </p>
      {!stare.criptareActiva && <p role="alert" className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900">{d.faraCriptare}</p>}

      <div className="mt-4 space-y-3">
        {ORDINE.map((f) => {
          const salvata = conectat(f);
          const respinsa = Boolean(salvata && respinse[f]);
          const confirmaStergere = deSters === f;
          return (
            <details key={f} open={Boolean(salvata) || eroare?.furnizor === f || undefined} className="group rounded-lg border border-line p-3">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm font-semibold text-ink">
                <span>
                  {NUME_CONECTOR[f]} <span className="ml-1 text-xs font-normal text-muted">{d.ajutor[f].rol}</span>
                  {AJUTOR[f].recomandat && <span className="ml-2 rounded-full bg-brand-green/10 px-2 py-0.5 text-xs font-medium text-brand-green">{d.bunInceput}</span>}
                </span>
                {salvata ? (
                  respinsa ? (
                    <span className="text-xs font-medium text-red-700">{d.respinsa}</span>
                  ) : (
                    <span className="text-xs font-medium text-brand-green">
                      {d.conectat(salvata.amprenta, fmt(salvata.adaugatLa))}
                    </span>
                  )
                ) : (
                  <span className="text-xs font-normal text-muted">{d.neconectat}</span>
                )}
              </summary>

              <p className="mt-2 text-xs leading-relaxed text-muted">
                {d.ajutor[f].unde}{" "}
                <a href={AJUTOR[f].link} target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline">
                  {d.deschideContul(NUME_CONECTOR[f])}
                </a>
                .
              </p>
              <p className="text-xs leading-relaxed text-muted">{d.ajutor[f].plan}</p>
              <p className="text-xs leading-relaxed text-muted">{d.ajutor[f].cost}</p>

              <form
                className="mt-2 flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if ((valori[f] ?? "").trim() && stare.criptareActiva && !pending) ruleaza(f, () => salveazaCheieProspectare(orgSlug, f, valori[f] ?? ""), d.conectatOk(NUME_CONECTOR[f]), true);
                }}
              >
                <label className="min-w-0 flex-1 text-xs text-muted sm:min-w-[16rem]">
                  {d.cheiaApi(NUME_CONECTOR[f])}
                  <input
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={valori[f] ?? ""}
                    onChange={(e) => setValori((v) => ({ ...v, [f]: e.target.value }))}
                    placeholder={salvata ? d.inlocuieste : d.lipeste}
                    className="mt-1 h-10 w-full rounded-md border border-line bg-panel px-2.5 text-sm text-ink"
                  />
                </label>
                <button
                  type="submit"
                  disabled={pending || !(valori[f] ?? "").trim() || !stare.criptareActiva}
                  className="h-10 rounded-md bg-brand-green px-3 text-sm font-semibold text-white transition hover:bg-brand-green-hover disabled:opacity-50"
                >
                  {lucreaza === f ? d.seVerifica : d.salveazaVerifica}
                </button>
                {salvata && !confirmaStergere && (
                  <button type="button" disabled={pending} onClick={() => setDeSters(f)} className="h-10 rounded-md border border-line px-3 text-sm font-medium text-ink hover:bg-panel-2 disabled:opacity-50">
                    {d.stergeCheia}
                  </button>
                )}
              </form>
              {f === "waalaxy" && salvata && <p className="mt-1 text-xs text-muted">{d.waalaxyInlocuire}</p>}

              {confirmaStergere && (
                <div role="alertdialog" aria-label={d.confirmaStergere(NUME_CONECTOR[f])} className="mt-2 rounded-md bg-panel-2 p-3 text-xs text-ink">
                  <p>
                    {d.confirmaStergere(NUME_CONECTOR[f])} {f === "waalaxy" ? d.stergiWaalaxy : d.stergiAlt(NUME_CONECTOR[f])} {d.ramaneActiva(NUME_CONECTOR[f])}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setDeSters(null);
                        ruleaza(f, () => stergeCheieProspectare(orgSlug, f), d.stearsa(NUME_CONECTOR[f]));
                      }}
                      className="h-9 rounded-md bg-red-700 px-3 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                    >
                      {d.sterge}
                    </button>
                    <button type="button" onClick={() => setDeSters(null)} className="h-9 rounded-md border border-line px-3 text-sm font-medium text-ink hover:bg-panel">
                      {d.renunta}
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
              {(stare.apeluri30Zile[f] ?? 0) > 0 && <p className="mt-1.5 text-xs text-muted">{d.ultimele30(stare.apeluri30Zile[f])}</p>}

              {f === "waalaxy" && salvata && (
                <div className="mt-3 rounded-md bg-panel-2 p-3">
                  <p className="text-xs font-medium text-ink">{d.unde}</p>
                  {stare.waalaxy ? (
                    <p className="mt-1 text-xs text-muted">
                      {d.lista} <strong className="text-ink">{stare.waalaxy.listaNume || stare.waalaxy.listaId}</strong>
                      {stare.waalaxy.campanieId ? (
                        <>
                          {" "}
                          · {d.campGenerala} <strong className="text-ink">{stare.waalaxy.campanieNume || stare.waalaxy.campanieId}</strong>
                        </>
                      ) : (
                        d.faraCampGenerala
                      )}
                      {ROLURI.filter((r) => stare.waalaxy?.campaniiRol[r]).map((r) => (
                        <span key={r} className="block">
                          {d.roluri[r]}: <strong className="text-ink">{stare.waalaxy?.campaniiRol[r]?.nume || stare.waalaxy?.campaniiRol[r]?.id}</strong>
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-amber-800">{d.alegeLista}</p>
                  )}
                  {!liste ? (
                    <button type="button" disabled={pending} onClick={incarcaListe} className="mt-2 h-10 rounded-md border border-line bg-panel px-3 text-sm font-medium text-ink hover:bg-panel-2 disabled:opacity-50">
                      {lucreaza === "waalaxy-liste" ? d.seCitesc : stare.waalaxy ? d.schimba : d.alegeListaBtn}
                    </button>
                  ) : (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <label className="text-xs text-muted">
                        {d.listaWaalaxy}
                        <select value={listaAleasa} onChange={(e) => setListaAleasa(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-panel px-2 text-sm text-ink">
                          <option value="">{d.alegeListaOpt}</option>
                          {liste.liste.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.nume}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-muted">
                        {d.campGeneralaOpt}
                        <select value={campanieAleasa} onChange={(e) => setCampanieAleasa(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-panel px-2 text-sm text-ink">
                          <option value="">{d.faraCampanie}</option>
                          {liste.campanii.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nume}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="text-xs leading-relaxed text-muted sm:col-span-2">
                        {d.explicatieCampanii}
                      </p>
                      {ROLURI.map((rol) => (
                        <label key={rol} className="text-xs text-muted">
                          {d.campaniePentru} {d.roluri[rol]}
                          <select value={campaniiRol[rol]} onChange={(e) => setCampaniiRol((v) => ({ ...v, [rol]: e.target.value }))} className="mt-1 h-10 w-full rounded-md border border-line bg-panel px-2 text-sm text-ink">
                            <option value="">{d.laFelCaGenerala}</option>
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
                          {d.salveazaAlegerea}
                        </button>
                      </div>
                      {liste.liste.length === 0 && (
                        <p className="text-xs text-muted sm:col-span-2">
                          {d.nuAmGasitLista}{" "}
                          <a href={AJUTOR.waalaxy.link} target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline">
                            Waalaxy
                          </a>{" "}
                          {d.sireincarca}
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
          <strong className="text-ink">{d.dupaAprobare}</strong> {d.dupaAprobareText}
        </p>
        <details onToggle={(e) => e.currentTarget.open && deschideExcluderi()}>
          <summary className="cursor-pointer font-medium text-ink">
            {d.excluse(stare.suprimate)}
          </summary>
          <p className="mt-1">{d.exclusePar}</p>
          {excluderi === null ? (
            <p className="mt-2">{d.seIncarca}</p>
          ) : excluderi.length === 0 ? (
            <p className="mt-2">{d.nicioExclusa}</p>
          ) : (
            <ul className="mt-2 divide-y divide-line rounded-md border border-line">
              {excluderi.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0 break-all text-ink">
                    <span className="mr-2 rounded bg-panel-2 px-1.5 py-0.5 text-xs text-muted">{d.tipExcludere[x.tip] ?? x.tip}</span>
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
                        {d.scoate}
                      </button>
                      <button type="button" onClick={() => setDeScosExcludere(null)} className="h-9 rounded-md border border-line px-3 text-xs font-medium text-ink hover:bg-panel-2">
                        {d.renunta}
                      </button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setDeScosExcludere(x.id)} className="h-9 rounded-md border border-line px-3 text-xs font-medium text-ink hover:bg-panel-2">
                      {d.scoate}
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
