"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { buildNav } from "@/app/(app)/[orgSlug]/crm/shell";
import { CAMPAIGN_TEMPLATES, type DomeniuActivitate } from "@/lib/campaign-templates";
import type { Locale } from "@/lib/i18n/config";
import { DASHBOARD_DICT } from "@/lib/i18n/dictionaries/dashboard";
import {
  BLOCURI_ORDONABILE,
  ETICHETE_BLOC,
  ETICHETE_FAMILIE,
  FAMILII_DASHBOARD,
  LUNGIME_MAXIMA_NOTA,
  NAV_PROTEJATE,
  VARIANTE_PAGINI,
  VERSIUNE_PERSONALIZARE,
  rezumatPersonalizare,
  valideazaPersonalizare,
  type BlocDashboard,
  type FamilieDashboard,
  type PersonalizareOrg,
} from "@/lib/personalizare-org";

import { reseteazaPersonalizareAction, salveazaNotaAction, salveazaPersonalizareAction } from "../../personalizare-actions";
import { ORG_DEMO_SLUG } from "@/lib/previzualizare";

import { pornestePrevizualizareAction } from "../../previzualizare-actions";

type Mesaj = { tip: "ok" | "eroare"; text: string } | null;

export function EditorPersonalizare({
  locale,
  org,
  configInitiala,
  notaInitiala,
}: {
  locale: Locale;
  org: { id: string; slug: string; nume: string; domeniuActivitate: string | null };
  configInitiala: PersonalizareOrg | null;
  notaInitiala: string;
}) {
  const nav = useMemo(() => buildNav(DASHBOARD_DICT[locale], org.slug, "owner", null), [locale, org.slug]);

  const [familie, setFamilie] = useState<FamilieDashboard | "">(configInitiala?.familie ?? "");
  const [navAscunse, setNavAscunse] = useState<string[]>(configInitiala?.navAscunse ?? []);
  const [etichete, setEtichete] = useState<Record<string, string>>(configInitiala?.navEtichete ?? {});
  const [blocAscunse, setBlocAscunse] = useState<BlocDashboard[]>(configInitiala?.dashboard?.ascunse ?? []);
  const [ordine, setOrdine] = useState<BlocDashboard[]>(() => {
    const dinConfig = configInitiala?.dashboard?.ordine ?? [];
    return [...dinConfig, ...BLOCURI_ORDONABILE.filter((b) => !dinConfig.includes(b))];
  });
  const [variante, setVariante] = useState<Record<string, string>>(configInitiala?.variante ?? {});
  const [arataTimp, setArataTimp] = useState(configInitiala?.arataTimp === true);
  const [orePachet, setOrePachet] = useState(configInitiala?.orePachet ? String(configInitiala.orePachet).replace(".", ",") : "");
  const [latime, setLatime] = useState<"desktop" | "telefon">("desktop");
  const [mesaj, setMesaj] = useState<Mesaj>(null);
  const [pending, startTransition] = useTransition();

  const draft = useMemo<PersonalizareOrg>(() => {
    const eticheteCurate = Object.fromEntries(Object.entries(etichete).filter(([, v]) => v.trim()));
    const ordineDeSalvat = ordine.join() === BLOCURI_ORDONABILE.join() ? [] : ordine;
    return {
      v: VERSIUNE_PERSONALIZARE,
      ...(familie ? { familie } : {}),
      ...(navAscunse.length ? { navAscunse } : {}),
      ...(Object.keys(eticheteCurate).length ? { navEtichete: eticheteCurate } : {}),
      ...(Object.keys(variante).length ? { variante } : {}),
      ...(arataTimp ? { arataTimp: true } : {}),
      // Ore incluse în pachet: text în draft ca să fie validat strict (valideazaPersonalizare), nu convertit în tăcere; gol = fără pachet.
      ...(arataTimp && orePachet.trim() ? { orePachet: orePachet.trim() as unknown as number } : {}),
      ...(blocAscunse.length || ordineDeSalvat.length
        ? { dashboard: { ...(blocAscunse.length ? { ascunse: blocAscunse } : {}), ...(ordineDeSalvat.length ? { ordine: ordineDeSalvat } : {}) } }
        : {}),
    };
  }, [familie, navAscunse, etichete, blocAscunse, ordine, variante, arataTimp, orePachet]);

  const validare = useMemo(() => valideazaPersonalizare(draft), [draft]);
  // „Ce diferă față de standard”, generat din configurarea din editor (inclusiv modificările nesalvate), și notița internă a echipei.
  const linii = useMemo(() => rezumatPersonalizare(validare.ok ? validare.valoare : null), [validare]);
  const [nota, setNota] = useState(notaInitiala);
  const [mesajNota, setMesajNota] = useState<Mesaj>(null);

  // Previzualizarea e NAVIGABILĂ: paginile reale ale CRM-ului, pe organizația demo (date de test), cu aspectul acestei organizații. Starea (inclusiv modificările
  // nesalvate) stă într-un cookie setat de server; după o scurtă pauză de la ultima modificare, cookie-ul se actualizează, iar cadrul se reîncarcă pe pagina pe care
  // te afli (nu te întoarce la prima pagină).
  const [pregatit, setPregatit] = useState(false);
  const [maxim, setMaxim] = useState(false);
  const cadru = useRef<HTMLIFrameElement>(null);
  const pregatitRef = useRef(false);
  const [eroarePrevizualizare, setEroarePrevizualizare] = useState<string | null>(null);
  useEffect(() => {
    if (!validare.ok) return;
    const config = validare.valoare;
    let anulat = false;
    const t = setTimeout(async () => {
      const r = await pornestePrevizualizareAction(org.slug, config);
      if (anulat) return;
      if (!r.ok) {
        setEroarePrevizualizare(r.eroare);
        return;
      }
      setEroarePrevizualizare(null);
      if (pregatitRef.current) {
        try {
          cadru.current?.contentWindow?.location.reload();
        } catch {
          /* cadrul încă nu e încărcat */
        }
      } else {
        pregatitRef.current = true;
        setPregatit(true);
      }
    }, 450);
    return () => {
      anulat = true;
      clearTimeout(t);
    };
  }, [validare, org.slug]);
  // Esc închide modul maximizat.
  useEffect(() => {
    if (!maxim) return;
    const la = (e: KeyboardEvent) => e.key === "Escape" && setMaxim(false);
    document.addEventListener("keydown", la);
    return () => document.removeEventListener("keydown", la);
  }, [maxim]);

  const familieImplicita = org.domeniuActivitate ? CAMPAIGN_TEMPLATES[org.domeniuActivitate as DomeniuActivitate]?.familie : undefined;

  function comutaNav(href: string) {
    setNavAscunse((l) => (l.includes(href) ? l.filter((h) => h !== href) : [...l, href]));
  }
  function comutaBloc(b: BlocDashboard) {
    setBlocAscunse((l) => (l.includes(b) ? l.filter((x) => x !== b) : [...l, b]));
  }
  function muta(b: BlocDashboard, delta: -1 | 1) {
    setOrdine((l) => {
      const i = l.indexOf(b);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= l.length) return l;
      const copie = [...l];
      [copie[i], copie[j]] = [copie[j], copie[i]];
      return copie;
    });
  }

  function salveaza() {
    setMesaj(null);
    startTransition(async () => {
      const r = await salveazaPersonalizareAction(org.id, draft);
      setMesaj(r.ok ? { tip: "ok", text: "Salvat. Aspectul se aplică organizației la următoarea încărcare a paginii ei." } : { tip: "eroare", text: r.eroare });
    });
  }
  function salveazaNota() {
    setMesajNota(null);
    startTransition(async () => {
      const r = await salveazaNotaAction(org.id, nota);
      setMesajNota(r.ok ? { tip: "ok", text: "Notița a fost salvată." } : { tip: "eroare", text: r.eroare });
    });
  }
  function revineLaStandard() {
    if (!window.confirm(`Revii la aspectul standard pentru ${org.nume}? Personalizarea salvată se șterge.`)) return;
    setMesaj(null);
    startTransition(async () => {
      const r = await reseteazaPersonalizareAction(org.id);
      if (r.ok) {
        setFamilie("");
        setNavAscunse([]);
        setEtichete({});
        setBlocAscunse([]);
        setOrdine([...BLOCURI_ORDONABILE]);
        setVariante({});
        setArataTimp(false);
        setMesaj({ tip: "ok", text: "Aspectul standard a fost restabilit." });
      } else setMesaj({ tip: "eroare", text: r.eroare });
    });
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div className="space-y-6">
        <section className="rounded-xl border border-line bg-panel p-4" aria-labelledby="titlu-diferente">
          <h2 id="titlu-diferente" className="text-sm font-semibold text-ink">
            Ce diferă față de standard
          </h2>
          {linii.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
              {linii.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">Nimic: organizația are aspectul standard.</p>
          )}
          <p className="mt-1 text-xs text-muted">Generat automat din configurare, inclusiv din modificările nesalvate de mai jos.</p>
          <label htmlFor="nota-interna" className="mt-4 block text-sm font-semibold text-ink">
            Notiță internă
          </label>
          <p className="text-xs text-muted">Vizibilă doar echipei platformei, niciodată clientului. De ce există diferența, cine a cerut-o, ce am promis.</p>
          <textarea
            id="nota-interna"
            value={nota}
            maxLength={LUNGIME_MAXIMA_NOTA}
            rows={4}
            onChange={(e) => setNota(e.target.value)}
            className="mt-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button type="button" onClick={salveazaNota} disabled={pending} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink disabled:opacity-50">
              Salvează notița
            </button>
            <span className="text-xs text-muted">
              {nota.length}/{LUNGIME_MAXIMA_NOTA}
            </span>
            {mesajNota && <span className={`text-xs ${mesajNota.tip === "ok" ? "text-brand-green" : "text-red-700"}`}>{mesajNota.text}</span>}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-panel p-4">
          <h2 className="text-sm font-semibold text-ink">Familia vizuală</h2>
          <p className="mt-1 text-xs text-muted">
            Implicit, din domeniul de activitate{familieImplicita ? ` (acum: ${ETICHETE_FAMILIE[familieImplicita as FamilieDashboard] ?? familieImplicita})` : ""}.
          </p>
          <select value={familie} onChange={(e) => setFamilie(e.target.value as FamilieDashboard | "")} className="mt-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm">
            <option value="">Implicită (după domeniu)</option>
            {FAMILII_DASHBOARD.map((f) => (
              <option key={f} value={f}>
                {ETICHETE_FAMILIE[f]}
              </option>
            ))}
          </select>
        </section>

        <section className="rounded-xl border border-line bg-panel p-4">
          <h2 className="text-sm font-semibold text-ink">Blocuri pe prima pagină</h2>
          <p className="mt-1 text-xs text-muted">Bifează ce se vede și mută blocurile în sus sau în jos.</p>
          <ul className="mt-3 space-y-2">
            {[...ordine, "primii-pasi" as const].map((b, i) => {
              const ordonabil = (BLOCURI_ORDONABILE as readonly string[]).includes(b);
              return (
                <li key={b} className="flex items-start gap-2 rounded-lg border border-line p-2.5">
                  <input
                    type="checkbox"
                    id={`bloc-${b}`}
                    checked={!blocAscunse.includes(b)}
                    onChange={() => comutaBloc(b)}
                    className="mt-1 h-4 w-4"
                    aria-label={`Arată blocul ${ETICHETE_BLOC[b].nume}`}
                  />
                  <label htmlFor={`bloc-${b}`} className="min-w-0 flex-1 text-sm">
                    <span className="font-medium text-ink">{ETICHETE_BLOC[b].nume}</span>
                    <span className="block text-xs text-muted">{ETICHETE_BLOC[b].descriere}</span>
                  </label>
                  {ordonabil && (
                    <span className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => muta(b, -1)} disabled={i === 0} aria-label={`Mută ${ETICHETE_BLOC[b].nume} mai sus`} className="rounded border border-line px-2 py-1 text-xs disabled:opacity-40">
                        ↑
                      </button>
                      <button type="button" onClick={() => muta(b, 1)} disabled={i >= ordine.length - 1} aria-label={`Mută ${ETICHETE_BLOC[b].nume} mai jos`} className="rounded border border-line px-2 py-1 text-xs disabled:opacity-40">
                        ↓
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-xl border border-line bg-panel p-4">
          <h2 className="text-sm font-semibold text-ink">Timp alocat</h2>
          <label className="mt-2 flex items-start gap-2 text-sm text-ink">
            <input type="checkbox" checked={arataTimp} onChange={(e) => setArataTimp(e.target.checked)} className="mt-1 h-4 w-4" />
            <span>
              Arată clientului pagina „Timp alocat” (timpul echipei, inclusiv cel cu asistență AI, și banca de ore, fără tarife), în meniu, pentru owner și admin.
              <span className="block text-xs text-muted">Timpul se înregistrează din pagina „Timp alocat” a organizației din panoul platformei, cu timer sau manual.</span>
            </span>
          </label>
          {arataTimp && (
            <label className="mt-3 block text-xs text-muted">
              Ore incluse în pachet (opțional, pentru banca de ore)
              <input inputMode="decimal" placeholder="ex. 10" value={orePachet} onChange={(e) => setOrePachet(e.target.value)} className="mt-1 block w-32 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-sm text-ink" />
              <span className="mt-1 block">Clientul vede orele folosite și rămase, cu avertizare de la 80%. Lasă gol dacă nu are pachet.</span>
            </label>
          )}
          <a href={`/platform-admin/timp/${org.slug}`} className="mt-2 inline-block text-xs font-medium text-brand-blue hover:underline">
            Deschide registrul de timp (timer, tarife, sume) →
          </a>
        </section>

        <section className="rounded-xl border border-line bg-panel p-4">
          <h2 className="text-sm font-semibold text-ink">Variante de pagini</h2>
          <p className="mt-1 text-xs text-muted">
            Versiuni alternative ale unor pagini, scrise în cod și activate doar pentru această organizație. Fără o variantă aleasă, organizația vede pagina standard.
          </p>
          <ul className="mt-3 space-y-2">
            {(Object.keys(VARIANTE_PAGINI) as (keyof typeof VARIANTE_PAGINI)[]).map((pagina) => (
              <li key={pagina} className="flex items-center gap-2">
                <label htmlFor={`varianta-${pagina}`} className="w-28 shrink-0 text-sm font-medium text-ink">
                  {VARIANTE_PAGINI[pagina].eticheta}
                </label>
                <select
                  id={`varianta-${pagina}`}
                  value={variante[pagina] ?? ""}
                  onChange={(e) =>
                    setVariante((v) => {
                      const { [pagina]: _scoasa, ...rest } = v;
                      void _scoasa;
                      return e.target.value ? { ...rest, [pagina]: e.target.value } : rest;
                    })
                  }
                  className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-sm"
                >
                  <option value="">Standard</option>
                  {Object.entries(VARIANTE_PAGINI[pagina].optiuni).map(([cheie, eticheta]) => (
                    <option key={cheie} value={cheie}>
                      {eticheta}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-line bg-panel p-4">
          <h2 className="text-sm font-semibold text-ink">Meniul lateral</h2>
          <p className="mt-1 text-xs text-muted">
            Bifa = intrarea se vede. Poți scrie o denumire proprie. Pagina de start, Facturarea și Setările nu se pot ascunde. Intrările ascunse nu mai apar în meniu, dar paginile
            rămân accesibile prin adresă.
          </p>
          <div className="mt-3 space-y-4">
            {nav.map((g) => (
              <div key={g.section || "start"}>
                {g.section && <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{g.section}</p>}
                <ul className="space-y-1.5">
                  {g.items.map((i) => {
                    const protejat = NAV_PROTEJATE.includes(i.href);
                    return (
                      <li key={i.href || "start"} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!navAscunse.includes(i.href)}
                          disabled={protejat}
                          onChange={() => comutaNav(i.href)}
                          className="h-4 w-4 shrink-0"
                          aria-label={`Arată ${i.label}`}
                          title={protejat ? "Nu se poate ascunde" : undefined}
                        />
                        <input
                          type="text"
                          value={etichete[i.href] ?? ""}
                          maxLength={40}
                          placeholder={i.label}
                          onChange={(e) => setEtichete((m) => ({ ...m, [i.href]: e.target.value }))}
                          aria-label={`Denumirea pentru ${i.label}`}
                          className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-sm"
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div className="sticky bottom-0 -mx-1 space-y-2 border-t border-line bg-canvas px-1 py-3">
          {!validare.ok && <p className="text-sm text-red-700">{validare.eroare}</p>}
          {mesaj && <p className={`text-sm ${mesaj.tip === "ok" ? "text-brand-green" : "text-red-700"}`}>{mesaj.text}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={salveaza} disabled={pending || !validare.ok} className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {pending ? "Se salvează…" : "Salvează aspectul"}
            </button>
            <button type="button" onClick={revineLaStandard} disabled={pending} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink disabled:opacity-50">
              Revino la standard
            </button>
          </div>
        </div>
      </div>

      {/* Același element în ambele moduri (normal / maximizat), ca cadrul să nu se reîncarce și să-și păstreze pagina deschisă. */}
      <div className={maxim ? "fixed inset-0 z-[100] flex flex-col gap-2 bg-canvas p-3" : "min-w-0"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1" role="group" aria-label="Lățimea previzualizării">
              {(["desktop", "telefon"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={latime === l}
                  onClick={() => setLatime(l)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${latime === l ? "border-brand-blue bg-brand-blue text-white" : "border-line text-ink"}`}
                >
                  {l === "desktop" ? "Desktop" : "Telefon"}
                </button>
              ))}
            </div>
            {maxim && <span className="hidden text-sm font-medium text-ink sm:inline">Previzualizare · {org.nume}</span>}
          </div>
          <button
            type="button"
            onClick={() => setMaxim((m) => !m)}
            aria-pressed={maxim}
            className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink hover:bg-panel-2"
          >
            {maxim ? "Restrânge (Esc)" : "Maximizează"}
          </button>
        </div>
        <div className={`overflow-auto rounded-xl border border-line bg-canvas ${maxim ? "min-h-0 flex-1" : ""}`}>
          {pregatit ? (
            <iframe
              ref={cadru}
              title="Previzualizare de suport"
              src={`/${ORG_DEMO_SLUG}/crm`}
              className={`mx-auto block border-0 bg-white ${maxim ? "h-full" : "h-[78vh]"}`}
              style={{ width: latime === "telefon" ? 390 : "100%" }}
            />
          ) : (
            <p className={`flex items-center justify-center text-sm text-muted ${maxim ? "h-full" : "h-[78vh]"}`} role="status">
              {eroarePrevizualizare ?? "Se pregătește previzualizarea…"}
            </p>
          )}
        </div>
        {!maxim && (
          <p className="text-xs text-muted">
            Previzualizarea e navigabilă: meniul deschide paginile reale ale CRM-ului pe organizația demo (date de test), cu aspectul acestei organizații. Modificările nesalvate se
            văd aici, dar clientul le vede abia după „Salvează aspectul”.
            {eroarePrevizualizare && pregatit ? ` ${eroarePrevizualizare}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
