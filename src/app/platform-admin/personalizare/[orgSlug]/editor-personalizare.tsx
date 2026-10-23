"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { buildNav } from "@/app/(app)/[orgSlug]/crm/shell";
import { CAMPAIGN_TEMPLATES, type DomeniuActivitate } from "@/lib/campaign-templates";
import type { Locale } from "@/lib/i18n/config";
import { DASHBOARD_DICT } from "@/lib/i18n/dictionaries/dashboard";
import {
  BLOCURI_ORDONABILE,
  FAMILII_DASHBOARD,
  NAV_PROTEJATE,
  VERSIUNE_PERSONALIZARE,
  codeazaPentruAdresa,
  valideazaPersonalizare,
  type BlocDashboard,
  type FamilieDashboard,
  type PersonalizareOrg,
} from "@/lib/personalizare-org";

import { reseteazaPersonalizareAction, salveazaPersonalizareAction } from "../../personalizare-actions";

const ETICHETE_BLOC: Record<BlocDashboard, { nume: string; descriere: string }> = {
  taskuri: { nume: "Centrul de acțiuni", descriere: "Sarcinile de rezolvat, în partea de sus." },
  indicatori: { nume: "Indicatori și grafice", descriere: "Filtrul de perioadă și cifrele cheie, în stilul familiei alese." },
  "risc-pipeline": { nume: "Alertă de risc", descriere: "Firme care sponsorizau, dar n-au mai donat de mult." },
  "top-sponsori": { nume: "Top firme sponsori", descriere: "Clasamentul sponsorilor." },
  "primii-pasi": { nume: "Primii pași", descriere: "Lista pentru o organizație nou-venită (apare mereu la sfârșit)." },
};

const ETICHETE_FAMILIE: Record<FamilieDashboard, string> = {
  "cald-protector": "Cald și protector",
  "natural-ancorat": "Natural și ancorat",
  "indraznet-dinamic": "Îndrăzneț și dinamic",
  "elegant-editorial": "Elegant editorial",
  neutru: "Neutru",
};

type Mesaj = { tip: "ok" | "eroare"; text: string } | null;

export function EditorPersonalizare({
  locale,
  org,
  configInitiala,
}: {
  locale: Locale;
  org: { id: string; slug: string; nume: string; domeniuActivitate: string | null };
  configInitiala: PersonalizareOrg | null;
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
      ...(blocAscunse.length || ordineDeSalvat.length
        ? { dashboard: { ...(blocAscunse.length ? { ascunse: blocAscunse } : {}), ...(ordineDeSalvat.length ? { ordine: ordineDeSalvat } : {}) } }
        : {}),
    };
  }, [familie, navAscunse, etichete, blocAscunse, ordine]);

  const validare = useMemo(() => valideazaPersonalizare(draft), [draft]);

  // Previzualizarea se reîncarcă la o scurtă pauză după ultima modificare, cu configurarea NESALVATĂ în adresă.
  const [cod, setCod] = useState(() => codeazaPentruAdresa(draft));
  useEffect(() => {
    if (!validare.ok) return;
    const t = setTimeout(() => setCod(codeazaPentruAdresa(validare.valoare)), 400);
    return () => clearTimeout(t);
  }, [validare]);
  const adresaPrevizualizare = `/platform-admin/previzualizare/${org.slug}?embed=1&c=${cod}`;
  const adresaFereastraNoua = `/platform-admin/previzualizare/${org.slug}?c=${cod}`;

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
        setMesaj({ tip: "ok", text: "Aspectul standard a fost restabilit." });
      } else setMesaj({ tip: "eroare", text: r.eroare });
    });
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div className="space-y-6">
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

      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
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
          <a href={adresaFereastraNoua} target="_blank" rel="noopener" className="text-xs font-medium text-brand-blue hover:underline">
            Deschide în fereastră nouă →
          </a>
        </div>
        <div className="overflow-auto rounded-xl border border-line bg-canvas">
          <iframe
            key={adresaPrevizualizare}
            title="Previzualizare de suport"
            src={adresaPrevizualizare}
            className="mx-auto block h-[78vh] border-0 bg-white"
            style={{ width: latime === "telefon" ? 390 : "100%" }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">Previzualizarea folosește date de exemplu. Modificările nesalvate se văd aici, dar organizația le vede abia după „Salvează aspectul”.</p>
      </div>
    </div>
  );
}
