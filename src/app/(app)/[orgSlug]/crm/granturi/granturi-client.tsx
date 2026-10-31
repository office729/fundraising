"use client";

import { Award, CalendarClock, Check, ExternalLink, Paperclip, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { useId, useState, useTransition, type ReactNode } from "react";

import { Badge, type StatusTone } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { Tabs } from "../components/ui/tabs";
import { useLocale } from "../lib/locale-context";
import { GRANTURI_UI_DICT, formatariGranturi } from "@/lib/i18n/dictionaries/granturi-ui";
import {
  CAMPURI_DOSAR,
  MONEDE,
  STARI_CU_TERMEN_DEPUNERE,
  STARI_GRANT,
  TIPURI_FINANTATOR,
  domeniuDinUrl,
  progresDosar,
  rezumaRegistru,
  urgentaTermen,
  zileLaTermen,
  type ApelGasit,
  type ElementLista,
  type GrantInput,
  type StareGrant,
  type Urgenta,
} from "@/lib/granturi/stari";
import { ETICHETE_FEL, SURSE_FINANTARE } from "@/lib/granturi/surse";

import {
  adaugaSursaInRegistruAction,
  cautaApeluriAction,
  deschideFisierGrantAction,
  genereazaDraftGrantAction,
  incarcaFisierGrantAction,
  obtineDateGranturi,
  salveazaDosarAction,
  salveazaGrantAction,
  schimbaStareGrantAction,
  stergeFisierGrantAction,
  stergeGrantAction,
  type DateGranturi,
  type GrantRand,
} from "./actions";

const TON_URGENTA: Record<Urgenta, StatusTone> = { depasit: "red", azi: "red", curand: "amber", ok: "neutral", fara: "neutral" };

const GRUPURI: { key: "toate" | "lucru" | "depuse" | "finantate" | "inchise"; stari: readonly StareGrant[] | null }[] = [
  { key: "toate", stari: null },
  { key: "lucru", stari: ["identificat", "in_pregatire"] },
  { key: "depuse", stari: ["aplicat"] },
  { key: "finantate", stari: ["castigat", "in_derulare", "raportat"] },
  { key: "inchise", stari: ["respins", "renuntat"] },
];

// Stările care închid o cerere: schimbarea lor dintr-un click greșit e greu de observat, deci cer confirmare.
const STARI_FINALE: readonly string[] = ["respins", "renuntat"];

// Documentele cerute aproape oriunde (lista standard) și criteriile uzuale de eligibilitate: în dicționar (granturi-ui.ts), se adaugă dintr-un click, fără să se dubleze.

const formatMarime = (b: number) => (b >= 1024 * 1024 ? `${(b / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

const GOL: GrantInput = {
  id: null,
  finantator: "",
  titlu: "",
  tipFinantator: "alt",
  stare: "identificat",
  suma: "",
  moneda: "RON",
  termen: "",
  link: "",
  responsabilId: null,
  nota: "",
  cerinte: "",
  eligibilitate: [],
  documente: [],
  draft: "",
  sumaCastigata: "",
  dataDecizie: "",
  termenRaportare: "",
};

const dinRand = (g: GrantRand): GrantInput => ({
  id: g.id,
  finantator: g.finantator,
  titlu: g.titlu,
  tipFinantator: g.tipFinantator,
  stare: g.stare,
  suma: g.suma === null ? "" : String(g.suma),
  moneda: g.moneda,
  termen: g.termen ?? "",
  link: g.link ?? "",
  responsabilId: g.responsabilId,
  nota: g.nota ?? "",
  cerinte: g.cerinte ?? "",
  eligibilitate: g.eligibilitate,
  documente: g.documente,
  draft: g.draft ?? "",
  sumaCastigata: g.sumaCastigata === null ? "" : String(g.sumaCastigata),
  dataDecizie: g.dataDecizie ?? "",
  termenRaportare: g.termenRaportare ?? "",
});

// ---------------------------------------------------------------------------------------------------------------- Piese comune

type MesajUi = { tip: "ok" | "eroare"; text: string } | null;

// Mesaj de stare: erorile se anunță imediat (role="alert"), reușitele politicos (role="status").
function Mesaj({ mesaj }: { mesaj: MesajUi }) {
  if (!mesaj) return null;
  return (
    <p role={mesaj.tip === "eroare" ? "alert" : "status"} className={`text-[13px] ${mesaj.tip === "eroare" ? "text-[var(--ci-red)]" : "text-[var(--ci-text-muted)]"}`}>
      {mesaj.text}
    </p>
  );
}

// Confirmare în rând, nu a doua fereastră peste fereastră (focusul rămâne unde e).
function BaraConfirmare({ text, eticheta, periculos, onDa, onNu }: { text: string; eticheta: string; periculos?: boolean; onDa: () => void; onNu: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border-strong)] bg-[var(--ci-surface-2)] px-3 py-2">
      <p className="min-w-0 flex-1 text-[13px] text-[var(--ci-text)]">{text}</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onNu}>
          {GRANTURI_UI_DICT[useLocale()].comun.nu}
        </Button>
        <Button size="sm" variant={periculos ? "danger" : "primary"} onClick={onDa}>
          {eticheta}
        </Button>
      </div>
    </div>
  );
}

// Etichetă legată de câmp (clic pe etichetă duce în câmp; cititoarele de ecran o anunță) și, opțional, textul de ajutor legat prin aria-describedby.
function Camp({ eticheta, ajutor, className, children }: { eticheta: string; ajutor?: ReactNode; className?: string; children: (id: string, descriere: string | undefined) => ReactNode }) {
  const id = useId();
  const idAjutor = ajutor ? `${id}-ajutor` : undefined;
  return (
    <div className={className}>
      <Label htmlFor={id}>{eticheta}</Label>
      {ajutor && (
        <p id={idAjutor} className="mb-1.5 text-[12px] text-[var(--ci-text-muted)]">
          {ajutor}
        </p>
      )}
      {children(id, idAjutor)}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------- Pagina

export function GranturiClient({ orgSlug, initial, prefill, esteAdmin }: { orgSlug: string; initial: DateGranturi; prefill: Record<string, string>; esteAdmin: boolean }) {
  const ui = GRANTURI_UI_DICT[useLocale()];
  const [date, setDate] = useState(initial);
  const reincarca = async () => setDate(await obtineDateGranturi(orgSlug));

  const rezumat = rezumaRegistru(
    date.granturi.map((g) => ({ stare: g.stare, suma: g.suma, sumaCastigata: g.sumaCastigata, moneda: g.moneda, termen: g.termen })),
    date.azi,
  );

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]" aria-hidden>
          <Award className="h-5 w-5" />
        </span>
        <div>
          <h1 className="ci-display text-xl font-bold text-[var(--ci-text)]">{ui.titlu}</h1>
          <p className="mt-0.5 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">
            {ui.descriere}
          </p>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: "registru", label: ui.taburi.registru(date.granturi.length) },
          { key: "dosar", label: ui.taburi.dosar },
          { key: "surse", label: ui.taburi.surse },
        ]}
      >
        {(tab) =>
          tab === "registru" ? (
            <Registru orgSlug={orgSlug} date={date} rezumat={rezumat} reincarca={reincarca} esteAdmin={esteAdmin} />
          ) : tab === "dosar" ? (
            <Dosar orgSlug={orgSlug} dosar={date.dosar} prefill={prefill} reincarca={reincarca} aiPermis={date.aiPermis} />
          ) : (
            <Surse orgSlug={orgSlug} date={date} reincarca={reincarca} />
          )
        }
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------- Registru

function Cifra({ titlu, valoare, nota, ton }: { titlu: string; valoare: string; nota?: string; ton?: "alerta" }) {
  return (
    <Card className="!p-4">
      <p className="text-[12px] font-medium text-[var(--ci-text-muted)]">{titlu}</p>
      <p className={`ci-display mt-1 text-2xl font-bold tabular-nums ${ton === "alerta" ? "text-[var(--ci-red)]" : "text-[var(--ci-text)]"}`}>{valoare}</p>
      {nota && <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">{nota}</p>}
    </Card>
  );
}

function Registru({ orgSlug, date, rezumat, reincarca, esteAdmin }: { orgSlug: string; date: DateGranturi; rezumat: ReturnType<typeof rezumaRegistru>; reincarca: () => Promise<void>; esteAdmin: boolean }) {
  const locale = useLocale();
  const ui = GRANTURI_UI_DICT[locale];
  const u = ui.registru;
  const { formatData, formatSuma, formatSume } = formatariGranturi(locale);
  const [grup, setGrup] = useState("toate");
  const [cautare, setCautare] = useState("");
  const [deschis, setDeschis] = useState<GrantInput | null>(null);
  const [mesaj, setMesaj] = useState<MesajUi>(null);
  const [deConfirmat, setDeConfirmat] = useState<{ id: string; titlu: string; stare: string } | null>(null);
  const [, startTransition] = useTransition();

  const stari = GRUPURI.find((g) => g.key === grup)?.stari ?? null;
  const q = cautare.trim().toLowerCase();
  const vizibile = date.granturi.filter((g) => (!stari || stari.includes(g.stare as StareGrant)) && (!q || `${g.finantator} ${g.titlu}`.toLowerCase().includes(q)));
  const numeMembru = (id: string | null) => date.membri.find((m) => m.id === id)?.nume ?? null;

  function aplica(id: string, stare: string) {
    setDeConfirmat(null);
    setMesaj(null);
    startTransition(async () => {
      try {
        const r = await schimbaStareGrantAction(orgSlug, id, stare);
        if (!r.ok) {
          setMesaj({ tip: "eroare", text: u.nuSchimbat });
          return;
        }
        await reincarca();
        setMesaj({ tip: "ok", text: u.schimbata(ui.stari[stare] ?? stare) });
      } catch {
        setMesaj({ tip: "eroare", text: u.nuSchimbat2 });
      }
    });
  }

  function schimba(g: GrantRand, stare: string) {
    if (STARI_FINALE.includes(stare)) setDeConfirmat({ id: g.id, titlu: g.titlu, stare });
    else aplica(g.id, stare);
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra titlu={u.inLucru} valoare={String(rezumat.inLucru)} nota={u.inLucruNota} />
        <Cifra
          titlu={u.termene7}
          valoare={String(rezumat.termeneCurand)}
          nota={rezumat.termeneCurand ? u.termeneNota : u.termeneNimic}
          ton={rezumat.termeneCurand ? "alerta" : undefined}
        />
        <Cifra titlu={u.depuse} valoare={String(rezumat.depuse)} nota={formatSume(rezumat.sumaCerutaPeMoneda)} />
        <Cifra titlu={u.finantate} valoare={String(rezumat.finantate)} nota={formatSume(rezumat.sumaFinantataPeMoneda)} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={u.filtreaza}>
          {GRUPURI.map((g) => (
            <button
              key={g.key}
              type="button"
              aria-pressed={grup === g.key}
              onClick={() => setGrup(g.key)}
              className={`rounded-full border px-3 py-1 text-[13px] font-medium transition-colors ${
                grup === g.key ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]" : "border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]"
              }`}
            >
              {ui.grupuri[g.key]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {date.granturi.length > 5 && <Input aria-label={u.cautaAria} placeholder={u.cauta} value={cautare} onChange={(e) => setCautare(e.target.value)} className="!w-44" />}
          <Button variant="primary" onClick={() => setDeschis({ ...GOL })}>
            <Plus className="h-4 w-4" /> {u.adaugaCerere}
          </Button>
        </div>
      </div>

      {deConfirmat && (
        <BaraConfirmare
          text={u.confirmaMutare(deConfirmat.titlu, ui.stari[deConfirmat.stare] ?? deConfirmat.stare)}
          eticheta={u.daMuta}
          onDa={() => aplica(deConfirmat.id, deConfirmat.stare)}
          onNu={() => setDeConfirmat(null)}
        />
      )}
      <Mesaj mesaj={mesaj} />

      {vizibile.length === 0 ? (
        <EmptyState
          icon={Award}
          title={date.granturi.length === 0 ? u.golTitlu : u.nicioGasita}
          description={
            date.granturi.length === 0
              ? u.golDescriere
              : u.schimbaFiltrul
          }
        />
      ) : (
        <ul className="space-y-2">
          {vizibile.map((g) => {
            const zile = STARI_CU_TERMEN_DEPUNERE.includes(g.stare as StareGrant) ? zileLaTermen(g.termen, date.azi) : null;
            const urgenta = urgentaTermen(zile);
            const eligibile = g.eligibilitate.length;
            const documenteOk = g.documente.filter((d) => d.ok).length;
            return (
              <li key={g.id}>
                <Card className="!p-0">
                  <div className="flex flex-wrap items-center gap-3 p-4">
                    <button type="button" onClick={() => setDeschis(dinRand(g))} className="min-w-0 flex-1 text-left">
                      <p className="ci-display truncate text-[14px] font-semibold text-[var(--ci-text)]">{g.titlu}</p>
                      <p className="mt-0.5 truncate text-[13px] text-[var(--ci-text-muted)]">
                        {g.finantator} · {ui.tipuri[g.tipFinantator] ?? ui.tipuri.alt}
                        {numeMembru(g.responsabilId) ? ` · ${numeMembru(g.responsabilId)}` : ""}
                      </p>
                      {(g.documente.length > 0 || eligibile > 0) && (
                        <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">
                          {g.documente.length > 0 ? u.documente(documenteOk, g.documente.length) : ""}
                          {g.documente.length > 0 && eligibile > 0 ? " · " : ""}
                          {eligibile > 0 ? u.eligibilitate(g.eligibilitate.filter((e) => e.ok).length, eligibile) : ""}
                        </p>
                      )}
                    </button>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium tabular-nums text-[var(--ci-text)]">{formatSuma(g.suma, g.moneda)}</span>
                      {zile !== null || g.termen ? (
                        <Badge tone={TON_URGENTA[urgenta]} icon={false}>
                          <CalendarClock className="h-3 w-3" /> {formatData(g.termen)}
                          {zile !== null ? ` · ${ui.termen(zile)}` : ""}
                        </Badge>
                      ) : null}
                      <Select aria-label={u.stareAria(g.titlu)} value={g.stare} onChange={(e) => schimba(g, e.target.value)} className="!h-8 !w-auto !text-[13px]">
                        {STARI_GRANT.map((s) => (
                          <option key={s} value={s}>
                            {ui.stari[s]}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {deschis && <FisaGrant orgSlug={orgSlug} date={date} initial={deschis} esteAdmin={esteAdmin} onClose={() => setDeschis(null)} onSaved={reincarca} />}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------- Fișa unei cereri

function ListaBifabila({ titlu, ajutor, elemente, onChange, standard, etichetaStandard }: { titlu: string; ajutor: string; elemente: ElementLista[]; onChange: (e: ElementLista[]) => void; standard: string[]; etichetaStandard: string }) {
  const ui = GRANTURI_UI_DICT[useLocale()];
  const [nou, setNou] = useState("");
  const adauga = (text: string) => {
    const t = text.trim();
    if (!t || elemente.some((e) => e.text.toLowerCase() === t.toLowerCase())) return;
    onChange([...elemente, { text: t, ok: false }]);
  };
  const lipsa = standard.filter((s) => !elemente.some((e) => e.text === s));
  return (
    <fieldset>
      <div className="flex items-center justify-between gap-2">
        <legend className="mb-1.5 block text-[13px] font-medium text-[var(--ci-text)]">{titlu}</legend>
        {lipsa.length > 0 && (
          <button type="button" className="mb-1.5 text-[12.5px] font-medium text-[var(--ci-primary)] hover:underline" onClick={() => onChange([...elemente, ...lipsa.map((text) => ({ text, ok: false }))].slice(0, 40))}>
            {etichetaStandard}
          </button>
        )}
      </div>
      <p className="mb-2 text-[12px] text-[var(--ci-text-muted)]">{ajutor}</p>
      {elemente.length > 0 && (
        <ul className="mb-2 space-y-1">
          {elemente.map((e, i) => (
            <li key={`${i}-${e.text}`} className="flex items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-2.5 py-1.5">
              <input
                type="checkbox"
                checked={e.ok}
                onChange={(ev) => onChange(elemente.map((x, j) => (j === i ? { ...x, ok: ev.target.checked } : x)))}
                aria-label={e.text}
                className="h-4 w-4 shrink-0"
              />
              <span className={`min-w-0 flex-1 text-[13px] ${e.ok ? "text-[var(--ci-text-muted)] line-through" : "text-[var(--ci-text)]"}`}>{e.text}</span>
              <button type="button" aria-label={ui.lista.stergeAria(e.text)} className="-m-1.5 p-2 text-[var(--ci-text-faint)] hover:text-[var(--ci-red)]" onClick={() => onChange(elemente.filter((_, j) => j !== i))}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          aria-label={ui.lista.adaugaLa(titlu.toLowerCase())}
          value={nou}
          onChange={(e) => setNou(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adauga(nou);
              setNou("");
            }
          }}
          placeholder={ui.lista.placeholder}
          maxLength={200}
        />
        <Button
          type="button"
          onClick={() => {
            adauga(nou);
            setNou("");
          }}
        >
          {ui.comun.adauga}
        </Button>
      </div>
    </fieldset>
  );
}

type ConfirmareFisa = { text: string; eticheta: string; periculos?: boolean; actiune: () => void } | null;

function FisaGrant({ orgSlug, date, initial, esteAdmin, onClose, onSaved }: { orgSlug: string; date: DateGranturi; initial: GrantInput; esteAdmin: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const ui = GRANTURI_UI_DICT[useLocale()];
  const u = ui.fisa;
  const [f, setF] = useState<GrantInput>(initial);
  // Ultima versiune salvată: „nesalvat” = diferența dintre formular și ea.
  const [baza, setBaza] = useState<GrantInput>(initial);
  const [mesaj, setMesaj] = useState<MesajUi>(null);
  const [confirmare, setConfirmare] = useState<ConfirmareFisa>(null);
  const [draftAnterior, setDraftAnterior] = useState<string | null>(null);
  const [limba, setLimba] = useState<"ro" | "en">("ro");
  const [pending, startTransition] = useTransition();
  const [seGenereaza, setSeGenereaza] = useState(false);
  const [seIncarca, setSeIncarca] = useState(false);
  const set = <K extends keyof GrantInput>(k: K, v: GrantInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const noua = f.id === null;
  const nesalvat = JSON.stringify(f) !== JSON.stringify(baza);
  const progres = progresDosar(date.dosar);
  const castigata = ["castigat", "in_derulare", "raportat"].includes(f.stare);

  // Închiderea (X, fundal, Escape, buton) cu modificări nesalvate cere confirmare: un clic pe lângă nu mai pierde un text lung.
  function inchide() {
    if (nesalvat) setConfirmare({ text: u.confirmaInchidere, eticheta: u.daInchide, periculos: true, actiune: onClose });
    else onClose();
  }

  // Salvează cererea; întoarce id-ul (necesar la generarea draftului pentru o cerere nouă) sau null dacă validarea a refuzat.
  async function salveaza(): Promise<string | null> {
    setMesaj(null);
    const r = await salveazaGrantAction(orgSlug, f);
    if (!r.ok) {
      setMesaj({ tip: "eroare", text: r.eroare });
      return null;
    }
    const salvat = { ...f, id: r.id };
    setF(salvat);
    setBaza(salvat);
    await onSaved();
    return r.id;
  }

  function salveazaSiInchide() {
    startTransition(async () => {
      try {
        if (await salveaza()) onClose();
      } catch {
        setMesaj({ tip: "eroare", text: u.nuAmPututSalva });
      }
    });
  }

  function genereazaEfectiv() {
    setConfirmare(null);
    setMesaj(null);
    setSeGenereaza(true);
    const vechi = f.draft;
    startTransition(async () => {
      try {
        const id = await salveaza();
        if (!id) return;
        const r = await genereazaDraftGrantAction(orgSlug, id, limba);
        if (!r.ok) {
          setMesaj({ tip: "eroare", text: r.eroare });
          return;
        }
        setDraftAnterior(vechi.trim() ? vechi : null);
        setF((x) => ({ ...x, draft: r.draft }));
        setBaza((x) => ({ ...x, draft: r.draft }));
        setMesaj({ tip: "ok", text: u.schitaGenerata });
        await onSaved();
      } catch {
        setMesaj({ tip: "eroare", text: u.nuAmPututGenera });
      } finally {
        setSeGenereaza(false);
      }
    });
  }

  function genereaza() {
    if (f.draft.trim()) setConfirmare({ text: u.confirmaRegenerare, eticheta: u.daRegenereaza, actiune: genereazaEfectiv });
    else genereazaEfectiv();
  }

  function revinaLaDraft() {
    if (draftAnterior === null) return;
    const vechi = draftAnterior;
    setDraftAnterior(null);
    setF((x) => ({ ...x, draft: vechi }));
    // Se salvează imediat: pe server a rămas schița nouă.
    startTransition(async () => {
      try {
        const r = await salveazaGrantAction(orgSlug, { ...f, draft: vechi });
        if (r.ok) {
          setBaza((x) => ({ ...x, draft: vechi }));
          await onSaved();
          setMesaj({ tip: "ok", text: u.amRevenit });
        } else setMesaj({ tip: "eroare", text: r.eroare });
      } catch {
        setMesaj({ tip: "eroare", text: u.nuAmPututReveni });
      }
    });
  }

  const fisiere = date.granturi.find((g) => g.id === f.id)?.fisiere ?? [];

  function incarcaFisier(fis: File) {
    if (!f.id) return;
    setMesaj(null);
    setSeIncarca(true);
    const id = f.id;
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("fisier", fis);
        const r = await incarcaFisierGrantAction(orgSlug, id, fd);
        if (!r.ok) setMesaj({ tip: "eroare", text: r.eroare });
        else {
          await onSaved();
          setMesaj({ tip: "ok", text: u.fisierIncarcat(fis.name) });
        }
      } catch {
        setMesaj({ tip: "eroare", text: u.incarcareEsuata });
      } finally {
        setSeIncarca(false);
      }
    });
  }

  function deschideFisier(fisierId: string) {
    if (!f.id) return;
    const id = f.id;
    startTransition(async () => {
      const r = await deschideFisierGrantAction(orgSlug, id, fisierId);
      if (r.ok) window.open(r.url, "_blank", "noopener,noreferrer");
      else setMesaj({ tip: "eroare", text: r.eroare });
    });
  }

  function stergeFisier(fisierId: string, nume: string) {
    if (!f.id) return;
    const id = f.id;
    setConfirmare({
      text: u.confirmaStergeFisier(nume),
      eticheta: u.daSterge,
      periculos: true,
      actiune: () => {
        startTransition(async () => {
          try {
            await stergeFisierGrantAction(orgSlug, id, fisierId);
            await onSaved();
            setMesaj({ tip: "ok", text: u.fisierSters });
          } catch {
            setMesaj({ tip: "eroare", text: u.nuAmPututStergeFisier });
          }
        });
      },
    });
  }

  function sterge() {
    if (!f.id) return;
    const id = f.id;
    setConfirmare({
      text: u.confirmaStergeCerere,
      eticheta: u.daStergeCererea,
      periculos: true,
      actiune: () => {
        startTransition(async () => {
          try {
            await stergeGrantAction(orgSlug, id);
            await onSaved();
            onClose();
          } catch {
            setMesaj({ tip: "eroare", text: u.nuAmPututStergeCererea });
          }
        });
      },
    });
  }

  function copiaza() {
    const clip = navigator.clipboard;
    if (!clip) {
      setMesaj({ tip: "eroare", text: u.copiereIndisponibila });
      return;
    }
    clip.writeText(f.draft).then(
      () => setMesaj({ tip: "ok", text: u.schitaCopiata }),
      () => setMesaj({ tip: "eroare", text: u.nuAmPututCopia }),
    );
  }

  return (
    <Dialog open onClose={inchide} title={noua ? u.titluNoua : u.titlu} width="max-w-3xl">
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Camp eticheta={u.finantator}>{(id) => <Input id={id} value={f.finantator} onChange={(e) => set("finantator", e.target.value)} maxLength={160} placeholder={u.finantatorPh} />}</Camp>
          <Camp eticheta={u.program}>{(id) => <Input id={id} value={f.titlu} onChange={(e) => set("titlu", e.target.value)} maxLength={240} placeholder={u.programPh} />}</Camp>
          <Camp eticheta={u.tip}>
            {(id) => (
              <Select id={id} value={f.tipFinantator} onChange={(e) => set("tipFinantator", e.target.value)}>
                {TIPURI_FINANTATOR.map((t) => (
                  <option key={t} value={t}>
                    {ui.tipuri[t]}
                  </option>
                ))}
              </Select>
            )}
          </Camp>
          <Camp eticheta={u.stare}>
            {(id) => (
              <Select id={id} value={f.stare} onChange={(e) => set("stare", e.target.value)}>
                {STARI_GRANT.map((s) => (
                  <option key={s} value={s}>
                    {ui.stari[s]}
                  </option>
                ))}
              </Select>
            )}
          </Camp>
          <div className="grid grid-cols-[1fr_6rem] gap-2">
            <Camp eticheta={u.suma}>{(id) => <Input id={id} inputMode="decimal" value={f.suma} onChange={(e) => set("suma", e.target.value)} placeholder={u.sumaPh} />}</Camp>
            <Camp eticheta={u.moneda}>
              {(id) => (
                <Select id={id} value={f.moneda} onChange={(e) => set("moneda", e.target.value)}>
                  {MONEDE.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              )}
            </Camp>
          </div>
          <Camp eticheta={u.termen} ajutor={u.termenAjutor}>
            {(id, desc) => <Input id={id} aria-describedby={desc} type="date" value={f.termen} onChange={(e) => set("termen", e.target.value)} />}
          </Camp>
          <Camp eticheta={u.responsabil}>
            {(id) => (
              <Select id={id} value={f.responsabilId ?? ""} onChange={(e) => set("responsabilId", e.target.value || null)}>
                <option value="">{u.nealocat}</option>
                {date.membri.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nume}
                  </option>
                ))}
              </Select>
            )}
          </Camp>
          <Camp eticheta={u.link} className="sm:col-span-2">
            {(id) => <Input id={id} value={f.link} onChange={(e) => set("link", e.target.value)} placeholder="https://…" maxLength={500} />}
          </Camp>
        </div>

        <ListaBifabila
          titlu={u.eligibilitate}
          ajutor={u.eligibilitateAjutor}
          elemente={f.eligibilitate as ElementLista[]}
          onChange={(e) => set("eligibilitate", e)}
          standard={ui.eligibilitateStandard}
          etichetaStandard={u.eligibilitateStandard}
        />
        <ListaBifabila
          titlu={u.documente}
          ajutor={u.documenteAjutor}
          elemente={f.documente as ElementLista[]}
          onChange={(e) => set("documente", e)}
          standard={ui.documenteStandard}
          etichetaStandard={u.documenteStandard}
        />

        <Camp eticheta={u.cerinte} ajutor={u.cerinteAjutor}>
          {(id, desc) => <Textarea id={id} aria-describedby={desc} value={f.cerinte} onChange={(e) => set("cerinte", e.target.value)} rows={5} maxLength={20000} />}
        </Camp>

        <div className="space-y-2.5 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Label htmlFor="grant-draft">{u.schita}</Label>
              <p className="text-[12px] text-[var(--ci-text-muted)]">
                {u.schitaAjutor(progres.completate, progres.total)}
              </p>
            </div>
            {date.aiPermis && (
              <div className="flex items-center gap-2">
                <Select aria-label={u.limbaSchitei} value={limba} onChange={(e) => setLimba(e.target.value as "ro" | "en")} className="!h-8 !w-auto !text-[13px]">
                  <option value="ro">Română</option>
                  <option value="en">English</option>
                </Select>
                <Button type="button" onClick={genereaza} loading={seGenereaza} disabled={!date.aiDisponibil || pending}>
                  <Sparkles className="h-4 w-4" /> {f.draft ? u.regenereaza : u.genereaza}
                </Button>
              </div>
            )}
          </div>
          {date.aiPermis &&
            (!date.aiDisponibil ? (
              <p className="text-[12px] text-[var(--ci-text-muted)]">{u.aiInactiv}</p>
            ) : (
              <p className="text-[12px] text-[var(--ci-text-muted)]">{ui.avertismentAi}</p>
            ))}
          <Textarea id="grant-draft" value={f.draft} onChange={(e) => set("draft", e.target.value)} rows={12} maxLength={30000} placeholder={u.schitaPh} />
          <div className="flex flex-wrap items-center gap-2">
            {f.draft && (
              <Button type="button" size="sm" onClick={copiaza}>
                <Check className="h-3.5 w-3.5" /> {u.copiazaSchita}
              </Button>
            )}
            {draftAnterior !== null && (
              <Button type="button" size="sm" onClick={revinaLaDraft} disabled={pending}>
                {u.revino}
              </Button>
            )}
          </div>
        </div>

        {castigata && (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <Camp eticheta={u.sumaCastigata}>{(id) => <Input id={id} inputMode="decimal" value={f.sumaCastigata} onChange={(e) => set("sumaCastigata", e.target.value)} placeholder={f.suma || u.sumaCastigataPh} />}</Camp>
            <Camp eticheta={u.dataDecizie}>{(id) => <Input id={id} type="date" value={f.dataDecizie} onChange={(e) => set("dataDecizie", e.target.value)} />}</Camp>
            <Camp eticheta={u.termenRaportare}>{(id) => <Input id={id} type="date" value={f.termenRaportare} onChange={(e) => set("termenRaportare", e.target.value)} />}</Camp>
          </div>
        )}

        <div>
          <Label htmlFor="grant-fisier">{u.fisiere}</Label>
          {noua ? (
            <p className="text-[12px] text-[var(--ci-text-muted)]">{u.fisiereNoua}</p>
          ) : (
            <div className="space-y-2">
              <p className="text-[12px] text-[var(--ci-text-muted)]">
                {u.fisiereAjutor}
              </p>
              {fisiere.length > 0 && (
                <ul className="space-y-1">
                  {fisiere.map((x) => (
                    <li key={x.id} className="flex items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-2.5 py-1.5">
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-[var(--ci-text-faint)]" aria-hidden />
                      <button type="button" className="min-w-0 flex-1 truncate text-left text-[13px] text-[var(--ci-primary)] hover:underline" onClick={() => deschideFisier(x.id)}>
                        {x.nume}
                      </button>
                      <span className="shrink-0 text-[12px] text-[var(--ci-text-muted)]">{formatMarime(x.marime)}</span>
                      <button type="button" aria-label={u.stergeFisierAria(x.nume)} className="-m-1.5 p-2 text-[var(--ci-text-faint)] hover:text-[var(--ci-red)]" onClick={() => stergeFisier(x.id, x.nume)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                id="grant-fisier"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt"
                disabled={pending}
                onChange={(e) => {
                  const fis = e.target.files?.[0];
                  e.target.value = "";
                  if (fis) incarcaFisier(fis);
                }}
                className="block w-full text-[13px] text-[var(--ci-text-muted)] file:mr-3 file:rounded-[var(--ci-radius-btn)] file:border file:border-[var(--ci-border)] file:bg-[var(--ci-surface)] file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-[var(--ci-text)]"
              />
              {seIncarca && (
                <p role="status" className="text-[12.5px] text-[var(--ci-text-muted)]">
                  {u.seIncarca}
                </p>
              )}
            </div>
          )}
        </div>

        <Camp eticheta={u.note}>{(id) => <Textarea id={id} value={f.nota} onChange={(e) => set("nota", e.target.value)} rows={3} maxLength={4000} />}</Camp>
      </div>

      {/* Subsolul rămâne vizibil în timp ce fișa derulează (important pe telefon). */}
      <div className="sticky -bottom-5 -mx-5 -mb-5 mt-5 space-y-2 border-t border-[var(--ci-border)] bg-[var(--ci-surface)] px-5 py-3">
        {confirmare && (
          <BaraConfirmare
            text={confirmare.text}
            eticheta={confirmare.eticheta}
            periculos={confirmare.periculos}
            onDa={() => {
              const a = confirmare.actiune;
              setConfirmare(null);
              a();
            }}
            onNu={() => setConfirmare(null)}
          />
        )}
        <Mesaj mesaj={mesaj} />
        <div className="flex items-center justify-between gap-2">
          <div>
            {!noua && esteAdmin && (
              <Button type="button" variant="ghost" onClick={sterge} disabled={pending}>
                <Trash2 className="h-4 w-4" /> {u.sterge}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {nesalvat && <span className="text-[12px] text-[var(--ci-text-muted)]">{u.nesalvat}</span>}
            <Button type="button" onClick={inchide}>
              {nesalvat ? u.renunta : u.inchide}
            </Button>
            <Button type="button" variant="primary" onClick={salveazaSiInchide} loading={pending && !seGenereaza && !seIncarca}>
              {u.salveaza}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------------------------- Dosar

function Dosar({ orgSlug, dosar, prefill, reincarca, aiPermis }: { orgSlug: string; dosar: Record<string, string>; prefill: Record<string, string>; reincarca: () => Promise<void>; aiPermis: boolean }) {
  const ui = GRANTURI_UI_DICT[useLocale()];
  const u = ui.dosar;
  // Câmpurile necompletate pornesc din ce știe deja platforma despre organizație.
  const [v, setV] = useState<Record<string, string>>(() => ({ ...prefill, ...dosar }));
  const [pending, startTransition] = useTransition();
  const [mesaj, setMesaj] = useState<MesajUi>(null);
  const progres = progresDosar(v);
  const modifica = (cheie: string, valoare: string) => {
    setV({ ...v, [cheie]: valoare });
    setMesaj(null);
  };

  return (
    <div className="space-y-4 pt-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-2xl">
            <h2 className="ci-display text-[15px] font-semibold text-[var(--ci-text)]">{u.titlu}</h2>
            <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
              {u.descriere}
            </p>
            {aiPermis && <p className="mt-1.5 text-[12px] text-[var(--ci-text-muted)]">{u.aiNota}</p>}
          </div>
          <div className="text-right">
            <p className="ci-display text-lg font-bold tabular-nums text-[var(--ci-text)]">
              {progres.completate}/{progres.total}
            </p>
            <p className="text-[12px] text-[var(--ci-text-muted)]">{u.completate}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CAMPURI_DOSAR.map((c0) => {
            const c = { ...c0, ...(u.campuri[c0.cheie] ?? {}) };
            return (
            <Camp key={c.cheie} eticheta={c.eticheta} ajutor={c.ajutor || undefined} className={c.lung ? "sm:col-span-2" : ""}>
              {(id, desc) =>
                c.lung ? (
                  <Textarea id={id} aria-describedby={desc} value={v[c.cheie] ?? ""} rows={4} maxLength={6000} placeholder={c.exemplu ? u.exemplu(c.exemplu) : undefined} onChange={(e) => modifica(c.cheie, e.target.value)} />
                ) : (
                  <Input id={id} aria-describedby={desc} value={v[c.cheie] ?? ""} maxLength={6000} placeholder={c.exemplu ? u.exemplu(c.exemplu) : undefined} onChange={(e) => modifica(c.cheie, e.target.value)} />
                )
              }
            </Camp>
            );
          })}
        </div>
        <div className="mt-5 flex items-center gap-3">
          <Button
            variant="primary"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await salveazaDosarAction(orgSlug, v);
                  await reincarca();
                  setMesaj({ tip: "ok", text: u.salvat });
                } catch {
                  setMesaj({ tip: "eroare", text: u.nuAmPututSalva });
                }
              })
            }
          >
            {u.salveazaDosarul}
          </Button>
          <Mesaj mesaj={mesaj} />
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------- Surse

function CautareApeluri({ orgSlug, date, reincarca }: { orgSlug: string; date: DateGranturi; reincarca: () => Promise<void> }) {
  const locale = useLocale();
  const u = GRANTURI_UI_DICT[locale].surse;
  const { formatData, dataLunga } = formatariGranturi(locale);
  const [domeniu, setDomeniu] = useState("");
  const [zona, setZona] = useState("România");
  const [observatii, setObservatii] = useState("");
  const [rezultate, setRezultate] = useState<{ apeluri: ApelGasit[]; la: string } | null>(null);
  const [mesaj, setMesaj] = useState<MesajUi>(null);
  const [seCauta, setSeCauta] = useState(false);
  const [pending, startTransition] = useTransition();
  const [adaugate, setAdaugate] = useState<Record<string, boolean>>({});

  function cauta() {
    setMesaj(null);
    setRezultate(null);
    setSeCauta(true);
    startTransition(async () => {
      try {
        const r = await cautaApeluriAction(orgSlug, domeniu, zona, observatii);
        if (r.ok) setRezultate({ apeluri: r.apeluri, la: dataLunga(new Date()) });
        else setMesaj({ tip: "eroare", text: r.eroare });
      } catch {
        setMesaj({ tip: "eroare", text: u.cautareEsuata });
      } finally {
        setSeCauta(false);
      }
    });
  }

  const deja = (a: ApelGasit) => adaugate[a.url] || date.granturi.some((g) => g.link === a.url);

  return (
    <Card>
      <div className="flex items-start gap-2.5">
        <Search className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ci-primary)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="ci-display text-[14px] font-semibold text-[var(--ci-text)]">{u.cautaTitlu}</h3>
          <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">
            {u.cautaDescriere1}<b className="font-semibold text-[var(--ci-text)]">{u.cautaDescriereBold}</b>{u.cautaDescriere2}
          </p>
          {!date.aiDisponibil ? (
            <p className="mt-2 text-[12.5px] text-[var(--ci-text-muted)]">{u.aiInactiv}</p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
                <Camp eticheta={u.domeniu}>{(id) => <Input id={id} value={domeniu} maxLength={200} onChange={(e) => setDomeniu(e.target.value)} placeholder={u.domeniuPh} />}</Camp>
                <Camp eticheta={u.zona}>
                  {(id) => (
                    <Select id={id} value={zona} onChange={(e) => setZona(e.target.value)}>
                      <option value="România">{u.zone["România"]}</option>
                      <option value="Europa">{u.zone.Europa}</option>
                      <option value="Internațional">{u.zone["Internațional"]}</option>
                    </Select>
                  )}
                </Camp>
                <Camp eticheta={u.precizari} className="sm:col-span-2">
                  {(id) => <Input id={id} value={observatii} maxLength={300} onChange={(e) => setObservatii(e.target.value)} placeholder={u.precizariPh} />}
                </Camp>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button variant="primary" onClick={cauta} loading={seCauta} disabled={pending && !seCauta}>
                  <Search className="h-4 w-4" /> {seCauta ? u.seCauta : u.cautaBtn}
                </Button>
                {seCauta && (
                  <span role="status" className="text-[12.5px] text-[var(--ci-text-muted)]">
                    {u.poateDura}
                  </span>
                )}
              </div>
            </>
          )}
          <div className="mt-3">
            <Mesaj mesaj={mesaj} />
          </div>
          {rezultate && (
            <p role="status" className="mt-3 text-[13px] text-[var(--ci-text-muted)]">
              {rezultate.apeluri.length === 0
                ? u.nuAmGasit
                : u.amGasit(rezultate.apeluri.length, rezultate.la)}
            </p>
          )}
          {rezultate && rezultate.apeluri.length > 0 && (
            <ul className="mt-3 space-y-2">
              {rezultate.apeluri.map((a) => (
                <li key={a.url} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-[var(--ci-text)]">{a.titlu}</p>
                      <p className="text-[12.5px] text-[var(--ci-text-muted)]">
                        {a.finantator} · {a.termen ? u.termen(formatData(a.termen)) : u.termenNeconfirmat}
                      </p>
                      {a.motiv && <p className="mt-1 text-[12.5px] text-[var(--ci-text)]">{a.motiv}</p>}
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--ci-primary)] hover:underline">
                        {u.deschidePagina(domeniuDinUrl(a.url))} <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    </div>
                    {deja(a) ? (
                      <Badge tone="green">{u.inRegistru}</Badge>
                    ) : (
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            try {
                              const r = await adaugaSursaInRegistruAction(orgSlug, a.finantator, a.titlu, "alt", a.url, a.termen ?? "");
                              if (r.ok) {
                                setAdaugate((x) => ({ ...x, [a.url]: true }));
                                await reincarca();
                                setMesaj({ tip: "ok", text: u.adaugatApel(a.titlu) });
                              } else setMesaj({ tip: "eroare", text: r.eroare });
                            } catch {
                              setMesaj({ tip: "eroare", text: u.nuAmPututAdauga }); 
                            }
                          })
                        }
                      >
                        <Plus className="h-3.5 w-3.5" /> {u.adaugaInRegistru}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

function Surse({ orgSlug, date, reincarca }: { orgSlug: string; date: DateGranturi; reincarca: () => Promise<void> }) {
  const u = GRANTURI_UI_DICT[useLocale()].surse;
  const [fel, setFel] = useState<string>("toate");
  const [pending, startTransition] = useTransition();
  const [mesaj, setMesaj] = useState<MesajUi>(null);
  const [adaugat, setAdaugat] = useState<Record<string, boolean>>({});
  const sursa = SURSE_FINANTARE.filter((s) => fel === "toate" || s.fel === fel);
  const deja = (nume: string) => adaugat[nume] || date.granturi.some((g) => g.finantator === nume);

  return (
    <div className="space-y-4 pt-4">
      {date.aiPermis && <CautareApeluri orgSlug={orgSlug} date={date} reincarca={reincarca} />}
      <Card>
        <p className="text-[13px] text-[var(--ci-text-muted)]">
          {u.introLista1(u.verificatIn)}<b className="font-semibold text-[var(--ci-text)]">{u.introListaBold}</b>{u.introLista2}
        </p>
      </Card>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={u.filtreazaSurse}>
        {[["toate", u.toate], ...Object.entries(ETICHETE_FEL).map(([k, e]) => [k, u.fel[k] ?? e])].map(([k, e]) => (
          <button
            key={k}
            type="button"
            aria-pressed={fel === k}
            onClick={() => setFel(k)}
            className={`rounded-full border px-3 py-1 text-[13px] font-medium transition-colors ${
              fel === k ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]" : "border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]"
            }`}
          >
            {e}
          </button>
        ))}
      </div>
      <Mesaj mesaj={mesaj} />
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {sursa.map((s) => (
          <li key={s.id}>
            <Card className="flex h-full flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="ci-display text-[14px] font-semibold text-[var(--ci-text)]">{s.nume}</h3>
                <Badge tone="neutral" icon={false}>
                  {u.fel[s.fel] ?? ETICHETE_FEL[s.fel]}
                </Badge>
              </div>
              <p className="text-[13px] text-[var(--ci-text)]">{u.descrieri[s.id]?.descriere ?? s.descriere}</p>
              <p className="text-[12.5px] text-[var(--ci-text-muted)]">{u.descrieri[s.id]?.cum ?? s.cum}</p>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
                  {u.deschideSite} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
                <span className="flex-1" />
                {deja(s.nume) ? (
                  <Badge tone="green">{u.inRegistru}</Badge>
                ) : (
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          const r = await adaugaSursaInRegistruAction(orgSlug, s.nume, u.apelDeVerificat, s.tip, s.url, "");
                          if (r.ok) {
                            setAdaugat((x) => ({ ...x, [s.nume]: true }));
                            await reincarca();
                            setMesaj({ tip: "ok", text: u.adaugatSursa(s.nume) });
                          } else setMesaj({ tip: "eroare", text: r.eroare });
                        } catch {
                          setMesaj({ tip: "eroare", text: u.nuAmPututAdauga }); 
                        }
                      })
                    }
                  >
                    <Plus className="h-3.5 w-3.5" /> {u.urmareste}
                  </Button>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
