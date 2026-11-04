"use client";

import { Check, Copy, ExternalLink, Mail, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { INFLUENCERI_UI_DICT } from "@/lib/i18n/dictionaries/influenceri-ui";
import {
  ACTIVITATI,
  ETAPE,
  ETAPE_FARA_CONTACT,
  PLATFORME_CHEI,
  poateReveni,
  urlConversatie,
  urlProfil,
  type Canal,
  type PlatformaSociala,
} from "@/lib/influenceri/reguli";
import type { CheieVarianta } from "@/lib/influenceri/mesaje";
import type { DateInfluenceri, Fisa, MesajePregatite, Rez } from "@/lib/influenceri/tipuri";

import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { Input, Select, Textarea } from "../components/ui/input";
import { SidePanel } from "../components/ui/side-panel";
import { useLocale } from "../lib/locale-context";

import { etapaAction, faraRaspunsAction, fisaAction, mesajeAction, notaAction, nuContactamAction, pasAction, preiaAction, raspunsAction, stergeAction, trimisAction } from "./actions";
import { FormularCampuri } from "./formular";
import { copiaza, EtapaChip, etichetaCategorie, etichetaPlatforma, formateazaData, formateazaDataOra, Foto, LinkButon, MesajStare, scurt, textLocale, ziRo, aziRo } from "./ui";

type Stare = { ok: boolean; text: string } | null;

// Fișa influencerului: profil, centrul de contactare, urmărire, actualizări, linkuri cu rezultate și istoric.
export function FisaInfluencer({ orgSlug, id, date, onInchide, onDeschide }: { orgSlug: string; id: string; date: DateInfluenceri; onInchide: () => void; onDeschide: (id: string) => void }) {
  const locale = useLocale();
  const t = INFLUENCERI_UI_DICT[locale];
  const router = useRouter();
  const [fisa, setFisa] = useState<{ id: string; v: Fisa } | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [editare, setEditare] = useState(false);
  const [ver, setVer] = useState(0);

  useEffect(() => {
    let viu = true;
    fisaAction(orgSlug, id)
      .then((r) => {
        if (!viu) return;
        if (r.ok) {
          setFisa({ id, v: r.data });
          setEroare(null);
        } else setEroare(r.eroare);
      })
      .catch(() => {
        if (viu) setEroare(t.erori.generala);
      });
    return () => {
      viu = false;
    };
  }, [orgSlug, id, ver, t.erori.generala]);

  const reincarca = () => {
    setVer((x) => x + 1);
    router.refresh();
  };
  const curenta = fisa?.id === id ? fisa.v : null;

  return (
    <SidePanel open onClose={onInchide} title={curenta?.inf.numePublic ?? t.fisa.incarcare} lat>
      {!curenta && !eroare && <p className="text-[13px] text-[var(--ci-text-muted)]">{t.fisa.incarcare}</p>}
      {eroare && (
        <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-text)]">
          {eroare}
        </p>
      )}
      {curenta && !editare && (
        <Continut
          orgSlug={orgSlug}
          fisa={curenta}
          date={date}
          onEditeaza={() => setEditare(true)}
          onSchimbat={reincarca}
          onSters={() => {
            onInchide();
            router.refresh();
          }}
        />
      )}
      {curenta && editare && (
        <FormularCampuri
          orgSlug={orgSlug}
          date={date}
          initial={curenta.inf}
          onSalvat={() => {
            setEditare(false);
            reincarca();
          }}
          onDeschideExistenta={(altul) => {
            setEditare(false);
            onDeschide(altul);
          }}
          onAnuleaza={() => setEditare(false)}
        />
      )}
    </SidePanel>
  );
}

function Continut({ orgSlug, fisa, date, onEditeaza, onSchimbat, onSters }: { orgSlug: string; fisa: Fisa; date: DateInfluenceri; onEditeaza: () => void; onSchimbat: () => void; onSters: () => void }) {
  const locale = useLocale();
  const t = INFLUENCERI_UI_DICT[locale];
  const d = t.fisa;
  const inf = fisa.inf;
  const blocat = inf.nuContacta || ETAPE_FARA_CONTACT.has(inf.etapa);
  const [mesaj, setMesaj] = useState<Stare>(null);
  const [ocupat, start] = useTransition();
  const [confirmaStergere, setConfirmaStergere] = useState(false);

  const ruleaza = <T,>(f: () => Promise<Rez<T>>, dupa?: (r: T) => void) =>
    start(async () => {
      const r = await f();
      if (r.ok) {
        setMesaj(r.mesaj ? { ok: true, text: r.mesaj } : null);
        dupa?.(r.data);
        onSchimbat();
      } else setMesaj({ ok: false, text: r.eroare });
    });

  const profiluri = PLATFORME_CHEI.map((k) => ({ k, url: urlProfil(k, inf[k]), urm: inf.urmaritori[k] })).filter((p): p is { k: PlatformaSociala; url: string; urm: number | undefined } => Boolean(p.url));
  const locatie = [inf.oras, inf.judet && inf.judet !== inf.oras ? `(${inf.judet})` : null, inf.tara && !/^rom[aâî]nia$/i.test(inf.tara) ? inf.tara : null].filter(Boolean).join(" ");

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Foto nume={inf.numePublic} fotoUrl={inf.fotoUrl} mare />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-[var(--ci-text-muted)]">{[etichetaCategorie(inf.categorie, locale), inf.domeniu, locatie].filter(Boolean).join(" · ")}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <EtapaChip etapa={inf.etapa} locale={locale} />
            <span className="text-[12.5px] text-[var(--ci-text-muted)]">
              {d.responsabil}: {inf.responsabil ?? d.fara}
            </span>
          </div>
        </div>
        <Button size="sm" onClick={onEditeaza}>
          <Pencil className="h-3.5 w-3.5" />
          {d.editeaza}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {profiluri.map((p) => (
          <LinkButon key={p.k} href={p.url}>
            {etichetaPlatforma(p.k, locale)}
            {p.urm ? ` · ${scurt(p.urm)}` : ""}
            <ExternalLink className="h-3.5 w-3.5" />
          </LinkButon>
        ))}
        {inf.email && (
          <a href={`mailto:${encodeURIComponent(inf.email)}`} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3.5 text-sm text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
            <Mail className="h-3.5 w-3.5" />
            {inf.email}
          </a>
        )}
      </div>

      <MesajStare mesaj={mesaj} />

      {inf.nuContacta && (
        <div role="note" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2.5 text-[13px] text-[var(--ci-text)]">
          <strong>{d.nuContactamTitlu}.</strong> {d.nuContactamText(inf.nuContactaMotiv)}
        </div>
      )}
      {fisa.coordonare && !blocat && (
        <div role="note" className="flex flex-wrap items-center gap-2 rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] px-3 py-2.5 text-[13px] text-[var(--ci-text)]">
          <span>{d.coordonare(fisa.coordonare.nume ?? d.coordonareColega, formateazaData(fisa.coordonare.la, locale))}</span>
          {inf.responsabilId !== date.eu.id && (
            <Button size="sm" disabled={ocupat} onClick={() => ruleaza(() => preiaAction(orgSlug, inf.id))}>
              {d.preiau}
            </Button>
          )}
        </div>
      )}

      {!blocat && <CentruContactare key={inf.id} orgSlug={orgSlug} fisa={fisa} date={date} onSchimbat={onSchimbat} />}

      <Urmarire orgSlug={orgSlug} fisa={fisa} date={date} blocat={blocat} ocupat={ocupat} ruleaza={ruleaza} />

      <Actualizari orgSlug={orgSlug} fisa={fisa} date={date} blocat={blocat} ocupat={ocupat} ruleaza={ruleaza} />

      {fisa.linkuri.length > 0 && (
        <Card>
          <CardHeader title={d.linkuri.titlu} />
          <ul className="space-y-2.5">
            {fisa.linkuri.map((l) => (
              <li key={l.id} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] p-3 text-[13px]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--ci-text)]">{l.caz}</p>
                    <p className="text-[12px] text-[var(--ci-text-muted)]">{etichetaPlatforma(l.platforma, locale)}</p>
                  </div>
                  <CopiazaLink url={l.url} />
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-[12.5px]">
                  <div>
                    <dt className="text-[var(--ci-text-muted)]">{d.linkuri.clicuri}</dt>
                    <dd className="font-semibold tabular-nums text-[var(--ci-text)]">{l.clicuri}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--ci-text-muted)]">{d.linkuri.donatii}</dt>
                    <dd className="font-semibold tabular-nums text-[var(--ci-text)]">{l.donatii}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--ci-text-muted)]">{d.linkuri.suma}</dt>
                    <dd className="font-semibold tabular-nums text-[var(--ci-text)]">{l.sumaLei > 0 ? d.linkuri.lei(l.sumaLei) : "—"}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">{d.linkuri.nota}</p>
        </Card>
      )}

      <Card>
        <CardHeader title={d.istoric.titlu} />
        {fisa.activitati.length === 0 ? (
          <p className="text-[13px] text-[var(--ci-text-muted)]">{d.istoric.gol}</p>
        ) : (
          <ul className="space-y-2">
            {fisa.activitati.map((a) => (
              <li key={a.id} className="border-l-2 border-[var(--ci-border)] pl-3 text-[13px]">
                <p className="text-[var(--ci-text)]">
                  <strong>{(ACTIVITATI as Record<string, { ro: string; en: string }>)[a.tip]?.[locale] ?? a.tip}</strong>
                  {a.canal ? ` · ${etichetaPlatforma(a.canal, locale)}` : ""}
                  {a.caz ? ` · ${a.caz}` : ""}
                </p>
                {a.text && <p className="whitespace-pre-wrap text-[var(--ci-text-muted)]">{a.text.length > 400 ? `${a.text.slice(0, 400)}…` : a.text}</p>}
                <p className="text-[11.5px] text-[var(--ci-text-faint)]">
                  {formateazaDataOra(a.la, locale)} · {a.user ?? d.istoric.sistem}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section className="space-y-1 text-[12px] text-[var(--ci-text-muted)]">
        <p>
          {d.date.sursa}: {inf.sursaDate} · {d.date.temei}: {inf.temeiLegal}
        </p>
        {inf.telefon && (
          <p>
            {d.date.telefon}: {inf.telefon}
          </p>
        )}
        {inf.note && (
          <p className="whitespace-pre-wrap">
            {d.date.note}: {inf.note}
          </p>
        )}
        {date.eu.esteAdmin && (
          <div className="pt-1">
            {!confirmaStergere ? (
              <button type="button" className="text-[var(--ci-red)] underline" onClick={() => setConfirmaStergere(true)}>
                {d.sterge.buton}
              </button>
            ) : (
              <div role="alertdialog" className="space-y-2 rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] p-3 text-[13px] text-[var(--ci-text)]">
                <p>{d.sterge.confirma}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="danger" disabled={ocupat} onClick={() => ruleaza(() => stergeAction(orgSlug, inf.id), onSters)}>
                    {d.sterge.daSterge}
                  </Button>
                  <Button size="sm" onClick={() => setConfirmaStergere(false)}>
                    {d.sterge.renunta}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function CopiazaLink({ url }: { url: string }) {
  const d = INFLUENCERI_UI_DICT[useLocale()].fisa.linkuri;
  const [copiat, setCopiat] = useState(false);
  return (
    <Button
      size="sm"
      onClick={async () => {
        setCopiat(await copiaza(url));
        setTimeout(() => setCopiat(false), 2000);
      }}
    >
      {copiat ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copiat ? d.copiat : d.copiaza}
    </Button>
  );
}

type Ruleaza = <T>(f: () => Promise<Rez<T>>, dupa?: (r: T) => void) => void;

// ───────── Centrul de contactare ─────────

function CentruContactare({ orgSlug, fisa, date, onSchimbat }: { orgSlug: string; fisa: Fisa; date: DateInfluenceri; onSchimbat: () => void }) {
  const locale = useLocale();
  const t = INFLUENCERI_UI_DICT[locale].fisa;
  const c = t.contact;
  const inf = fisa.inf;
  const canale: Canal[] = [...PLATFORME_CHEI.filter((k) => Boolean(inf[k])), ...(inf.email ? (["email"] as const) : [])];
  const [cazId, setCazId] = useState(() => (inf.cazId && date.cazuri.some((x) => x.id === inf.cazId) ? inf.cazId : (date.cazuri[0]?.id ?? "")));
  const [canal, setCanal] = useState<Canal>(canale[0] ?? "instagram");
  const [indicatii, setIndicatii] = useState("");
  const [cuAi, setCuAi] = useState(date.aiConectat);
  const [rez, setRez] = useState<MesajePregatite | null>(null);
  const [variante, setVariante] = useState<Record<CheieVarianta, string> | null>(null);
  const [alesa, setAlesa] = useState<CheieVarianta>("instagram");
  const [copiat, setCopiat] = useState(false);
  const [confirmare, setConfirmare] = useState<{ text: string; actiune: () => void; da: string } | null>(null);
  const [stare, setStare] = useState<Stare>(null);
  const [ocupat, start] = useTransition();

  if (date.cazuri.length === 0) {
    return (
      <Card>
        <CardHeader title={c.titlu} />
        <p className="text-[13px] text-[var(--ci-text-muted)]">{c.faraCazuri}</p>
      </Card>
    );
  }
  if (canale.length === 0) {
    return (
      <Card>
        <CardHeader title={c.titlu} />
        <p className="text-[13px] text-[var(--ci-text-muted)]">{c.faraProfil}</p>
      </Card>
    );
  }

  const varianta = (k: Canal): CheieVarianta => (k === "facebook" ? "facebook" : k === "email" ? "colaborare" : "instagram");
  const textulAles = variante?.[alesa] ?? "";
  const urlDeschis =
    canal === "email"
      ? inf.email
        ? `mailto:${inf.email}?subject=${encodeURIComponent(c.subiectEmail)}&body=${encodeURIComponent(textulAles)}`
        : null
      : urlConversatie(canal, inf[canal]);
  const etichetaDeschide = canal === "instagram" ? c.deschideInstagram : canal === "facebook" ? c.deschideMessenger : canal === "email" ? c.deschideEmail : c.deschideProfil;

  const pregateste = () =>
    start(async () => {
      setStare(null);
      const r = await mesajeAction(orgSlug, inf.id, cazId, canal, indicatii, cuAi);
      if (!r.ok) {
        setStare({ ok: false, text: r.eroare });
        return;
      }
      setRez(r.data);
      setVariante(r.data.variante);
      setAlesa(varianta(canal));
      setCopiat(false);
      setConfirmare(null);
    });

  const trimis = (confirmaPreluare: boolean) =>
    start(async () => {
      setConfirmare(null);
      const r = await trimisAction(orgSlug, inf.id, canal, textulAles, cazId, confirmaPreluare);
      if (r.ok) {
        setStare({ ok: true, text: c.trimis(formateazaData(r.data.verificareLa, locale)) + (r.data.limitaAtinsa ? ` ${c.limitaReveniri}` : "") });
        setRez(null);
        setVariante(null);
        onSchimbat();
        return;
      }
      if (r.coordonare) {
        setConfirmare({ text: c.cerePreluare(r.eroare), actiune: () => trimis(true), da: c.daPreiau });
        return;
      }
      setStare({ ok: false, text: r.eroare });
    });

  const apasaTrimis = () => {
    if (!copiat) setConfirmare({ text: c.faraCopiere, actiune: () => trimis(false), da: c.daAmTrimis });
    else trimis(false);
  };

  return (
    <Card className="space-y-3 border-[var(--ci-primary)]">
      <CardHeader title={c.titlu} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[12.5px] text-[var(--ci-text-muted)]">
          {c.campania}
          <Select
            value={cazId}
            onChange={(e) => {
              setCazId(e.target.value);
              setRez(null);
              setVariante(null);
            }}
          >
            {date.cazuri.map((z) => (
              <option key={z.id} value={z.id}>
                {z.titlu}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] text-[var(--ci-text-muted)]">
          {c.platforma}
          <Select
            value={canal}
            onChange={(e) => {
              setCanal(e.target.value as Canal);
              setRez(null);
              setVariante(null);
            }}
          >
            {canale.map((k) => (
              <option key={k} value={k}>
                {k === "facebook" ? "Facebook Messenger" : etichetaPlatforma(k, locale)}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] text-[var(--ci-text-muted)] sm:col-span-2">
          {c.indicatii}
          <Input value={indicatii} onChange={(e) => setIndicatii(e.target.value)} placeholder={c.indicatiiPlaceholder} maxLength={400} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[13px] text-[var(--ci-text)]">
          <input type="checkbox" checked={cuAi} disabled={!date.aiConectat} onChange={(e) => setCuAi(e.target.checked)} className="h-4 w-4" />
          {c.cuAi}
        </label>
        <Button variant="primary" onClick={pregateste} loading={ocupat && !rez} disabled={ocupat || !cazId}>
          {ocupat && !rez ? c.sePregateste : rez ? c.regenereaza : c.pregateste}
        </Button>
      </div>
      {!date.aiConectat && <p className="text-[12px] text-[var(--ci-text-muted)]">{c.aiNeconectat}</p>}

      {rez && variante && (
        <div className="space-y-3">
          {rez.coordonare && (
            <p role="note" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] px-3 py-2 text-[13px] text-[var(--ci-text)]">
              {t.coordonare(rez.coordonare.nume ?? t.coordonareColega, formateazaData(rez.coordonare.la, locale))}
            </p>
          )}
          {rez.avertisment && (
            <p role="note" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] px-3 py-2 text-[13px] text-[var(--ci-text)]">
              {c.avertismentAi(rez.avertisment)}
            </p>
          )}
          <p className="text-[12.5px] text-[var(--ci-text-muted)]">{rez.sursa === "ai" ? c.mesajAi : c.mesajSablon}</p>
          <div className="text-[12.5px] text-[var(--ci-text-muted)]">
            {c.linkUnic}: <code className="break-all rounded bg-[var(--ci-surface-2)] px-1 py-0.5">{rez.link}</code>
            <span className="block">{c.linkNota}</span>
          </div>
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {(["instagram", "facebook", "colaborare"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={alesa === k}
                onClick={() => {
                  setAlesa(k);
                  setCopiat(false);
                }}
                className={`h-8 rounded-full px-3 text-[12.5px] font-medium ${alesa === k ? "bg-[var(--ci-primary)] text-white" : "bg-[var(--ci-surface-2)] text-[var(--ci-text)]"}`}
              >
                {c.variante[k]}
              </button>
            ))}
          </div>
          <Textarea
            value={textulAles}
            onChange={(e) => {
              setVariante((v) => (v ? { ...v, [alesa]: e.target.value } : v));
              setCopiat(false);
            }}
            rows={9}
            className="w-full leading-relaxed"
            aria-label={c.variante[alesa]}
          />
          <p className="text-[12px] text-[var(--ci-text-muted)]">{c.caractere(textulAles.length)}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={async () => {
                setCopiat(await copiaza(textulAles));
              }}
            >
              {copiat ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiat ? c.copiat : c.pas1}
            </Button>
            {urlDeschis && (
              <LinkButon href={urlDeschis}>
                {etichetaDeschide}
                <ExternalLink className="h-3.5 w-3.5" />
              </LinkButon>
            )}
            <Button variant="primary" onClick={apasaTrimis} disabled={ocupat || !textulAles.trim()}>
              {c.pas3}
            </Button>
          </div>
          {confirmare && (
            <div role="alertdialog" className="space-y-2 rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] p-3 text-[13px] text-[var(--ci-text)]">
              <p>{confirmare.text}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="primary" onClick={confirmare.actiune} disabled={ocupat}>
                  {confirmare.da}
                </Button>
                <Button size="sm" onClick={() => setConfirmare(null)}>
                  {c.renunt}
                </Button>
              </div>
            </div>
          )}
          <p className="text-[12px] text-[var(--ci-text-muted)]">{c.notaTrimitere}</p>
        </div>
      )}
      <MesajStare mesaj={stare} />
    </Card>
  );
}

// ───────── Urmărire (verificări și reveniri) ─────────

function Urmarire({ orgSlug, fisa, date, blocat, ocupat, ruleaza }: { orgSlug: string; fisa: Fisa; date: DateInfluenceri; blocat: boolean; ocupat: boolean; ruleaza: Ruleaza }) {
  const locale = useLocale();
  const t = INFLUENCERI_UI_DICT[locale].fisa;
  const u = t.urmarire;
  const inf = fisa.inf;
  const setari = date.setari;
  const [acum] = useState(() => Date.now());
  const ultima = inf.ultimaContactare ? new Date(inf.ultimaContactare) : null;
  if (!ultima && !inf.followUpLa) return null;
  const poate = poateReveni(setari, { nrReveniri: inf.nrReveniri, ultimaContactare: ultima }, new Date(acum));
  const dataRevenire = ultima ? new Date(ultima.getTime() + setari.revenireZile * 86_400_000).toISOString() : null;
  const reveniriRamase = setari.maxReveniri - inf.nrReveniri > 0;
  const tipPas = inf.followUpTip === "manual" ? (inf.followUpNota ?? INFLUENCERI_UI_DICT[locale].pas.manual) : INFLUENCERI_UI_DICT[locale].pas[inf.followUpTip === "revenire" ? "revenire" : "verificare"];
  const scadent = Boolean(inf.followUpLa && ziRo(inf.followUpLa) <= aziRo());
  const poateNotaFaraRaspuns = !blocat && Boolean(ultima) && inf.etapa === "asteptam" && inf.followUpTip !== "revenire";

  return (
    <Card>
      <CardHeader title={u.titlu} />
      <div className="space-y-2 text-[13px] text-[var(--ci-text)]">
        <p className={scadent ? "font-semibold text-[var(--ci-amber)]" : undefined}>{inf.followUpLa ? u.urmatorul(tipPas, formateazaData(inf.followUpLa, locale)) : u.paseNimic}</p>
        <p className="text-[var(--ci-text-muted)]">{u.reveniri(inf.nrReveniri, setari.maxReveniri)}</p>
        {!blocat && ultima && reveniriRamase && <p className="text-[12.5px] text-[var(--ci-text-muted)]">{poate ? u.poateReveni : u.nuPoateInca(formateazaData(dataRevenire, locale))}</p>}
        {!blocat && ultima && !reveniriRamase && <p className="text-[12.5px] text-[var(--ci-text-muted)]">{u.limitaAtinsa}</p>}
        {poateNotaFaraRaspuns && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              disabled={ocupat}
              onClick={() =>
                ruleaza(
                  () => faraRaspunsAction(orgSlug, inf.id),
                  undefined,
                )
              }
            >
              {u.faraRaspuns}
            </Button>
            <span className="text-[12px] text-[var(--ci-text-muted)]">{u.faraRaspunsAjutor}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ───────── Actualizări ─────────

function Actualizari({ orgSlug, fisa, date, blocat, ocupat, ruleaza }: { orgSlug: string; fisa: Fisa; date: DateInfluenceri; blocat: boolean; ocupat: boolean; ruleaza: Ruleaza }) {
  const locale = useLocale();
  const a = INFLUENCERI_UI_DICT[locale].fisa.actualizeaza;
  const inf = fisa.inf;
  const [raspuns, setRaspuns] = useState("");
  const [nota, setNota] = useState("");
  const [zi, setZi] = useState("");
  const [notaPas, setNotaPas] = useState("");
  const [motiv, setMotiv] = useState("");
  const [confirmaBlocare, setConfirmaBlocare] = useState(false);
  // Din „Nu mai contactăm” fișa o poate scoate doar un administrator.
  const etapaBlocata = inf.nuContacta && !date.eu.esteAdmin;

  return (
    <Card>
      <CardHeader title={a.titlu} />
      <div className="space-y-3 text-[13px]">
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[8rem_1fr] sm:items-center">
          <span className="text-[var(--ci-text-muted)]">{a.etapa}</span>
          <Select value={inf.etapa} disabled={ocupat || etapaBlocata} onChange={(e) => ruleaza(() => etapaAction(orgSlug, inf.id, e.target.value))} aria-label={a.etapa}>
            {ETAPE.map((e) => (
              <option key={e.k} value={e.k}>
                {textLocale(e, locale)}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[8rem_1fr] sm:items-center">
          <span className="text-[var(--ci-text-muted)]">{a.raspuns}</span>
          <div className="flex flex-wrap gap-2">
            <Input className="min-w-0 flex-1" value={raspuns} onChange={(e) => setRaspuns(e.target.value)} placeholder={a.raspunsPlaceholder} aria-label={a.raspuns} maxLength={2000} />
            <Button disabled={ocupat || !raspuns.trim()} onClick={() => ruleaza(() => raspunsAction(orgSlug, inf.id, raspuns), () => setRaspuns(""))}>
              {a.noteazaRaspuns}
            </Button>
          </div>
        </div>

        {!blocat && (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[8rem_1fr] sm:items-center">
            <span className="text-[var(--ci-text-muted)]">{a.pas}</span>
            <div className="flex flex-wrap gap-2">
              <Input type="date" className="w-40" value={zi} onChange={(e) => setZi(e.target.value)} aria-label={a.pas} />
              <Input className="min-w-0 flex-1" value={notaPas} onChange={(e) => setNotaPas(e.target.value)} placeholder={a.pasPlaceholder} aria-label={a.pasPlaceholder} maxLength={300} />
              <Button disabled={ocupat || !zi} onClick={() => ruleaza(() => pasAction(orgSlug, inf.id, zi, notaPas), () => setNotaPas(""))}>
                {a.programeaza}
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[8rem_1fr] sm:items-center">
          <span className="text-[var(--ci-text-muted)]">{a.nota}</span>
          <div className="flex flex-wrap gap-2">
            <Input className="min-w-0 flex-1" value={nota} onChange={(e) => setNota(e.target.value)} placeholder={a.notaPlaceholder} aria-label={a.nota} maxLength={2000} />
            <Button disabled={ocupat || !nota.trim()} onClick={() => ruleaza(() => notaAction(orgSlug, inf.id, nota), () => setNota(""))}>
              {a.adauga}
            </Button>
          </div>
        </div>

        {!inf.nuContacta && (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[8rem_1fr] sm:items-center">
            <span className="text-[var(--ci-text-muted)]">{a.nuContactam}</span>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Input className="min-w-0 flex-1" value={motiv} onChange={(e) => setMotiv(e.target.value)} placeholder={a.motiv} aria-label={a.motiv} maxLength={300} />
                <Button disabled={ocupat} onClick={() => setConfirmaBlocare(true)}>
                  {a.blocheaza}
                </Button>
              </div>
              {confirmaBlocare && (
                <div role="alertdialog" className="space-y-2 rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] p-3 text-[var(--ci-text)]">
                  <p>{a.confirmaBlocare}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={ocupat}
                      onClick={() =>
                        ruleaza(
                          () => nuContactamAction(orgSlug, inf.id, motiv),
                          () => setConfirmaBlocare(false),
                        )
                      }
                    >
                      {a.daBlocheaza}
                    </Button>
                    <Button size="sm" onClick={() => setConfirmaBlocare(false)}>
                      {a.renunta}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
