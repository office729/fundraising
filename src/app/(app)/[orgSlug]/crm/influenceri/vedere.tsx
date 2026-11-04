"use client";

import { Plus, Search, Settings, Upload, UserSearch } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { INFLUENCERI_UI_DICT } from "@/lib/i18n/dictionaries/influenceri-ui";
import { JUDETE } from "@/lib/judete";
import { CATEGORII, ETAPE, etichetaProfil, PLATFORME, PRAGURI_AUDIENTA, parametriDinFiltre, urmaritoriPe, type FiltreLista, type PlatformaSociala } from "@/lib/influenceri/reguli";
import type { DateInfluenceri, RandLista } from "@/lib/influenceri/tipuri";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input, Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { useLocale } from "../lib/locale-context";

import { tintaAction } from "./actions";
import { FisaInfluencer } from "./fisa";
import { FormularInfluencer } from "./formular";
import { ImportInfluenceri } from "./import-dialog";
import { SetariUrmarireDialog } from "./setari-dialog";
import { aziRo, EtapaChip, etichetaCategorie, etichetaPlatforma, formateazaData, Foto, scurt, textLocale, ziRo } from "./ui";

type Cheie = "q" | "plat" | "cat" | "etapa" | "resp" | "caz" | "judet" | "urm" | "scad";

export function InfluenceriVedere({ orgSlug, filtre, date }: { orgSlug: string; filtre: FiltreLista; date: DateInfluenceri }) {
  const locale = useLocale();
  const d = INFLUENCERI_UI_DICT[locale];
  const router = useRouter();
  const pathname = usePathname();
  const [deschis, setDeschis] = useState<string | null>(null);
  const [formular, setFormular] = useState(false);
  const [importul, setImportul] = useState(false);
  const [setari, setSetari] = useState(false);
  const [q, setQ] = useState(filtre.q ?? "");

  const mergi = (schimbari: Partial<Record<Cheie, string | undefined>>) => {
    const s = parametriDinFiltre(filtre, schimbari).toString();
    router.push(s ? `${pathname}?${s}` : pathname);
  };
  const plat = filtre.platforma ?? null;
  const numePlat = plat ? textLocale(PLATFORME.find((p) => p.k === plat), locale) : "";
  const arataFiltre = Boolean(filtre.q || filtre.platforma || filtre.categorie || filtre.etapa || filtre.responsabil || filtre.caz || filtre.judet || filtre.urmMin || filtre.scadente);

  return (
    <div className="mx-auto max-w-[1300px] space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-[75ch]">
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{d.titlu}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{d.subtitlu}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setFormular(true)}>
            <Plus className="h-4 w-4" />
            {d.adauga}
          </Button>
          <Button onClick={() => setImportul(true)}>
            <Upload className="h-4 w-4" />
            {d.importa}
          </Button>
          {date.eu.esteAdmin && (
            <Button onClick={() => setSetari(true)}>
              <Settings className="h-4 w-4" />
              {d.setari}
            </Button>
          )}
        </div>
      </div>

      <IndicatorAzi orgSlug={orgSlug} azi={date.azi} />

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={d.bara.platforma}>
          <span className="mr-1 text-[13px] font-medium text-[var(--ci-text-muted)]">{d.bara.platforma}:</span>
          {[{ k: "", ro: d.bara.toate, en: d.bara.toate }, ...PLATFORME].map((p) => {
            const activ = (filtre.platforma ?? "") === p.k;
            return (
              <button
                key={p.k || "toate"}
                type="button"
                aria-pressed={activ}
                onClick={() => mergi({ plat: p.k || undefined })}
                className={`h-8 rounded-full px-3 text-[13px] font-medium transition-colors ${activ ? "bg-[var(--ci-primary)] text-white" : "border border-[var(--ci-border)] bg-[var(--ci-surface)] text-[var(--ci-text)] hover:border-[var(--ci-primary)]"}`}
              >
                {p.k ? textLocale(p, locale) : d.bara.toate}
              </button>
            );
          })}
          {plat && <span className="ml-1 text-[12px] text-[var(--ci-text-muted)]">{d.bara.doarPlatforma(numePlat)}</span>}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <form
            className="flex gap-1.5 sm:col-span-2"
            onSubmit={(e) => {
              e.preventDefault();
              mergi({ q: q.trim() || undefined });
            }}
          >
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={d.bara.cautaPlaceholder} aria-label={d.bara.cauta} icon={<Search className="h-4 w-4" />} />
            <Button type="submit">{d.bara.cauta}</Button>
          </form>
          <Select value={filtre.categorie ?? ""} onChange={(e) => mergi({ cat: e.target.value || undefined })} aria-label={d.form.categorie}>
            <option value="">{d.bara.toateCategoriile}</option>
            {CATEGORII.map((c) => (
              <option key={c.k} value={c.k}>
                {textLocale(c, locale)}
              </option>
            ))}
          </Select>
          <Select value={filtre.judet ?? ""} onChange={(e) => mergi({ judet: e.target.value || undefined })} aria-label={d.form.judet}>
            <option value="">{d.bara.toateJudetele}</option>
            {JUDETE.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
            <option value="diaspora">{d.bara.diaspora}</option>
            <option value="fara">{d.bara.faraJudet}</option>
          </Select>
          <Select value={filtre.etapa ?? ""} onChange={(e) => mergi({ etapa: e.target.value || undefined })} aria-label={d.fisa.actualizeaza.etapa}>
            <option value="">{d.bara.toateEtapele}</option>
            {ETAPE.map((e) => (
              <option key={e.k} value={e.k}>
                {textLocale(e, locale)}
              </option>
            ))}
          </Select>
          <Select value={filtre.responsabil ?? ""} onChange={(e) => mergi({ resp: e.target.value || undefined })} aria-label={d.fisa.responsabil}>
            <option value="">{d.bara.toiResponsabilii}</option>
            <option value="fara">{d.bara.faraResponsabil}</option>
            {date.membri.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nume}
              </option>
            ))}
          </Select>
          <Select value={filtre.caz ?? ""} onChange={(e) => mergi({ caz: e.target.value || undefined })} aria-label={d.form.campania}>
            <option value="">{d.bara.toateCampaniile}</option>
            {date.cazuri.map((c) => (
              <option key={c.id} value={c.id}>
                {c.titlu}
              </option>
            ))}
          </Select>
          <Select value={filtre.urmMin ? String(filtre.urmMin) : ""} onChange={(e) => mergi({ urm: e.target.value || undefined })} aria-label={d.lista.coloanaAudienta}>
            <option value="">{plat ? d.bara.audientaPePlatforma(numePlat) : d.bara.oriceAudienta}</option>
            {PRAGURI_AUDIENTA.map((n) => (
              <option key={n} value={n}>
                {d.bara.audientaPeste(scurt(n))}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[13px]">
          <button
            type="button"
            aria-pressed={Boolean(filtre.scadente)}
            onClick={() => mergi({ scad: filtre.scadente ? undefined : "1" })}
            className={`h-8 rounded-full px-3 font-medium transition-colors ${filtre.scadente ? "bg-[var(--ci-amber)] text-white" : date.scadenteAzi > 0 ? "bg-[var(--ci-amber-soft)] text-[var(--ci-text)]" : "border border-[var(--ci-border)] text-[var(--ci-text-muted)]"}`}
          >
            {d.bara.scadente(date.scadenteAzi)}
          </button>
          {arataFiltre && (
            <button type="button" className="text-[var(--ci-blue)] underline" onClick={() => router.push(pathname)}>
              {d.bara.stergeFiltrele}
            </button>
          )}
        </div>
      </Card>

      <p className="text-[13px] text-[var(--ci-text-muted)]" aria-live="polite">
        {d.lista.numar(date.randuri.length)}
        {date.trunchiat && ` · ${d.lista.trunchiat}`}
      </p>

      {date.randuri.length === 0 ? (
        <EmptyState icon={UserSearch} title={arataFiltre ? d.lista.golFiltre : d.lista.gol} />
      ) : (
        <Lista randuri={date.randuri} plat={plat} onDeschide={setDeschis} />
      )}

      {deschis && <FisaInfluencer orgSlug={orgSlug} id={deschis} date={date} onInchide={() => setDeschis(null)} onDeschide={setDeschis} />}
      {formular && (
        <FormularInfluencer
          orgSlug={orgSlug}
          date={date}
          initial={null}
          onInchide={() => setFormular(false)}
          onSalvat={(id) => {
            setFormular(false);
            router.refresh();
            setDeschis(id);
          }}
          onDeschideExistenta={(id) => {
            setFormular(false);
            setDeschis(id);
          }}
        />
      )}
      {importul && <ImportInfluenceri orgSlug={orgSlug} onInchide={() => setImportul(false)} />}
      {setari && <SetariUrmarireDialog orgSlug={orgSlug} setari={date.setari} onInchide={() => setSetari(false)} />}
    </div>
  );
}

// Câți influenceri a identificat colega azi; ținta apare doar dacă și-a stabilit-o singură.
function IndicatorAzi({ orgSlug, azi }: { orgSlug: string; azi: DateInfluenceri["azi"] }) {
  const d = INFLUENCERI_UI_DICT[useLocale()];
  const router = useRouter();
  const [editare, setEditare] = useState(false);
  const [valoare, setValoare] = useState(azi.tinta ? String(azi.tinta) : "");
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [ocupat, start] = useTransition();
  const salveaza = () =>
    start(async () => {
      const n = Number(valoare);
      const r = await tintaAction(orgSlug, valoare.trim() === "" || !Number.isFinite(n) || n < 1 ? null : n);
      if (r.ok) {
        setEditare(false);
        setMesaj(null);
        router.refresh();
      } else setMesaj(r.eroare);
    });
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-4 py-2.5 text-[13px]">
      <span className="font-medium text-[var(--ci-text)]">{azi.tinta ? d.azi.dinTinta(azi.identificate, azi.tinta) : d.azi.identificate(azi.identificate)}</span>
      {azi.tinta && (
        <span className="h-2 w-28 overflow-hidden rounded-full bg-[var(--ci-surface-2)]" role="img" aria-label={`${azi.identificate} / ${azi.tinta}`}>
          <span className="block h-full rounded-full bg-[var(--ci-primary)]" style={{ width: `${Math.min(100, Math.round((azi.identificate / azi.tinta) * 100))}%` }} />
        </span>
      )}
      {!editare ? (
        <button type="button" className="text-[var(--ci-blue)] underline" onClick={() => setEditare(true)}>
          {azi.tinta ? d.azi.schimbaTinta : d.azi.setezaTinta}
        </button>
      ) : (
        <span className="flex flex-wrap items-center gap-2">
          <Input type="number" min={1} max={1000} inputMode="numeric" value={valoare} onChange={(e) => setValoare(e.target.value)} className="w-24" aria-label={d.azi.tintaPeZi} placeholder={d.azi.tintaPeZi} />
          <Button size="sm" variant="primary" onClick={salveaza} loading={ocupat}>
            {d.azi.salveaza}
          </Button>
          <Button size="sm" onClick={() => setEditare(false)}>
            {d.azi.renunta}
          </Button>
          <span className="text-[12px] text-[var(--ci-text-muted)]">{mesaj ?? d.azi.tintaAjutor}</span>
        </span>
      )}
    </div>
  );
}

const GRILA = "lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_5rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.5fr)] lg:items-center lg:gap-3";

function Lista({ randuri, plat, onDeschide }: { randuri: RandLista[]; plat: PlatformaSociala | null; onDeschide: (id: string) => void }) {
  const locale = useLocale();
  const d = INFLUENCERI_UI_DICT[locale];
  const azi = aziRo();
  return (
    <div className="overflow-hidden rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
      <div className={`hidden border-b border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-3 py-2 text-[12px] font-medium text-[var(--ci-text-muted)] ${GRILA}`}>
        <span>{d.lista.coloanaInfluencer}</span>
        <span>{d.lista.coloanaCategorie}</span>
        <span>{plat ? d.lista.urmaritoriPe(etichetaPlatforma(plat, locale)) : d.lista.coloanaAudienta}</span>
        <span>{d.lista.coloanaEtapa}</span>
        <span>{d.lista.coloanaResponsabil}</span>
        <span>{d.lista.coloanaUltima}</span>
        <span>{d.lista.coloanaPas}</span>
      </div>
      <ul>
        {randuri.map((r) => {
          const urm = urmaritoriPe(r.urmaritori, plat);
          const handle = plat ? etichetaProfil(plat, r[plat]) : [r.instagram && "Instagram", r.facebook && "Facebook", r.tiktok && "TikTok", r.youtube && "YouTube"].filter(Boolean).join(" · ");
          const loc = [r.oras, r.judet && r.judet !== r.oras ? `(${r.judet})` : null, r.tara && !/^rom[aâî]nia$/i.test(r.tara) ? r.tara : null].filter(Boolean).join(" ");
          const scadent = Boolean(r.followUpLa && !r.nuContacta && ziRo(r.followUpLa) <= azi);
          const pas = r.followUpLa ? `${r.followUpTip === "manual" ? (r.followUpNota ?? d.pas.manual) : d.pas[r.followUpTip === "revenire" ? "revenire" : "verificare"]} · ${formateazaData(r.followUpLa, locale)}` : d.pas.niciunul;
          return (
            <li key={r.id} className="border-b border-[var(--ci-border)] last:border-b-0">
              <button type="button" onClick={() => onDeschide(r.id)} aria-label={`${d.lista.deschide}: ${r.numePublic}`} className={`block w-full px-3 py-3 text-left transition-colors hover:bg-[var(--ci-surface-2)] focus-visible:bg-[var(--ci-surface-2)] ${GRILA}`}>
                <span className="flex min-w-0 items-center gap-2.5">
                  <Foto nume={r.numePublic} fotoUrl={r.fotoUrl} />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-[var(--ci-text)]">
                      {r.numePublic}
                      {r.nuContacta && <span className="ml-2 rounded bg-[var(--ci-red)] px-1.5 py-0.5 text-[11px] font-medium text-white">{d.lista.nuContactam}</span>}
                    </span>
                    <span className="block truncate text-[12px] text-[var(--ci-text-muted)]">{[handle, loc].filter(Boolean).join(" · ")}</span>
                  </span>
                </span>
                <span className="mt-1 block truncate text-[12.5px] text-[var(--ci-text-muted)] lg:mt-0">{etichetaCategorie(r.categorie, locale)}</span>
                <span className="hidden text-[13px] text-[var(--ci-text)] lg:block">{scurt(urm)}</span>
                <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 lg:mt-0 lg:block">
                  <EtapaChip etapa={r.etapa} locale={locale} />
                  <span className="text-[12px] text-[var(--ci-text-muted)] lg:hidden">{urm > 0 ? scurt(urm) : ""}</span>
                </span>
                <span className="mt-1 block truncate text-[12.5px] text-[var(--ci-text)] lg:mt-0">{r.responsabil ?? <span className="text-[var(--ci-text-faint)]">{d.lista.faraResponsabil}</span>}</span>
                <span className="mt-1 block text-[12.5px] text-[var(--ci-text-muted)] lg:mt-0">
                  {r.ultimaContactare ? `${formateazaData(r.ultimaContactare, locale)}${r.ultimulContactDe ? ` · ${r.ultimulContactDe.split(" ")[0]}` : ""}` : "—"}
                </span>
                <span className={`mt-1 block text-[12.5px] lg:mt-0 ${scadent ? "font-semibold text-[var(--ci-amber)]" : "text-[var(--ci-text-muted)]"}`}>
                  {pas}
                  {scadent && ` · ${d.lista.scadent}`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

