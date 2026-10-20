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
import {
  CAMPURI_DOSAR,
  ETICHETE_STARE,
  ETICHETE_TIP,
  MONEDE,
  STARI_CU_TERMEN_DEPUNERE,
  STARI_GRANT,
  TIPURI_FINANTATOR,
  domeniuDinUrl,
  progresDosar,
  rezumaRegistru,
  textTermen,
  urgentaTermen,
  zileLaTermen,
  type ApelGasit,
  type ElementLista,
  type GrantInput,
  type StareGrant,
  type Urgenta,
} from "@/lib/granturi/stari";
import { ETICHETE_FEL, SURSE_FINANTARE, SURSE_VERIFICATE_IN } from "@/lib/granturi/surse";

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

const GRUPURI: { key: string; eticheta: string; stari: readonly StareGrant[] | null }[] = [
  { key: "toate", eticheta: "Toate", stari: null },
  { key: "lucru", eticheta: "În lucru", stari: ["identificat", "in_pregatire"] },
  { key: "depuse", eticheta: "Depuse", stari: ["aplicat"] },
  { key: "finantate", eticheta: "Finanțate", stari: ["castigat", "in_derulare", "raportat"] },
  { key: "inchise", eticheta: "Închise", stari: ["respins", "renuntat"] },
];

// Stările care închid o cerere: schimbarea lor dintr-un click greșit e greu de observat, deci cer confirmare.
const STARI_FINALE: readonly string[] = ["respins", "renuntat"];

// Documentele cerute aproape oriunde; se adaugă dintr-un click, fără să se dubleze.
const DOCUMENTE_STANDARD = [
  "Statutul și actul constitutiv",
  "Certificat de înregistrare fiscală",
  "Hotărâre de înscriere în Registrul Asociațiilor și Fundațiilor",
  "Situații financiare ale ultimului an",
  "Raport de activitate al ultimului an",
  "CV-urile echipei de proiect",
  "Buget detaliat al proiectului",
  "Scrisori de sprijin sau de parteneriat",
  "Dovada contului bancar",
];

const ELIGIBILITATE_STANDARD = [
  "Tipul de organizație acceptat (ONG, fundație, asociație)",
  "Vechimea minimă a organizației",
  "Domeniul de activitate finanțat",
  "Zona geografică acceptată (România / Europa de Est)",
  "Limita sumei solicitate",
  "Cofinanțare cerută",
  "Se acceptă cereri în limba română sau doar în engleză",
];

const AVERTISMENT_AI =
  "Textul din dosar și din cerințe este trimis către Anthropic (SUA) ca să se genereze schița. Contactul și IBAN-ul din dosar nu se trimit. Nu introduce nume, adrese sau date de sănătate ale beneficiarilor fără acordul lor; folosește prenume schimbate și detalii generale.";

const formatData = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" }) : "—";

const formatMarime = (b: number) => (b >= 1024 * 1024 ? `${(b / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

const formatSuma = (n: number | null, moneda: string) =>
  n === null ? "—" : new Intl.NumberFormat("ro-RO", { style: "currency", currency: moneda, maximumFractionDigits: 0 }).format(n);

const formatSume = (pe: Record<string, number>) => {
  const e = Object.entries(pe);
  return e.length ? e.map(([m, n]) => formatSuma(n, m)).join(" · ") : "—";
};

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
          Nu
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

export function GranturiClient({ orgSlug, initial, prefill, esteAdmin, cautareAi }: { orgSlug: string; initial: DateGranturi; prefill: Record<string, string>; esteAdmin: boolean; cautareAi: boolean }) {
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
          <h1 className="ci-display text-xl font-bold text-[var(--ci-text)]">Granturi</h1>
          <p className="mt-0.5 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">
            De la identificarea finanțatorului la raportare: ține într-un loc cererile, termenele, documentele și dosarul organizației, refolosit la fiecare cerere.
          </p>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: "registru", label: `Registru (${date.granturi.length})` },
          { key: "dosar", label: "Dosarul organizației" },
          { key: "surse", label: "Surse de finanțare" },
        ]}
      >
        {(tab) =>
          tab === "registru" ? (
            <Registru orgSlug={orgSlug} date={date} rezumat={rezumat} reincarca={reincarca} esteAdmin={esteAdmin} />
          ) : tab === "dosar" ? (
            <Dosar orgSlug={orgSlug} dosar={date.dosar} prefill={prefill} reincarca={reincarca} />
          ) : (
            <Surse orgSlug={orgSlug} date={date} reincarca={reincarca} cautareAi={cautareAi} />
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
          setMesaj({ tip: "eroare", text: "Nu am putut schimba starea. Reîncarcă pagina și încearcă din nou." });
          return;
        }
        await reincarca();
        setMesaj({ tip: "ok", text: `Starea a fost schimbată în „${ETICHETE_STARE[stare as StareGrant] ?? stare}”.` });
      } catch {
        setMesaj({ tip: "eroare", text: "Nu am putut schimba starea. Încearcă din nou." });
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
        <Cifra titlu="În lucru" valoare={String(rezumat.inLucru)} nota="identificate sau în pregătire" />
        <Cifra
          titlu="Termene în 7 zile"
          valoare={String(rezumat.termeneCurand)}
          nota={rezumat.termeneCurand ? "inclusiv cele depășite" : "nimic urgent"}
          ton={rezumat.termeneCurand ? "alerta" : undefined}
        />
        <Cifra titlu="Depuse, în așteptare" valoare={String(rezumat.depuse)} nota={formatSume(rezumat.sumaCerutaPeMoneda)} />
        <Cifra titlu="Finanțate" valoare={String(rezumat.finantate)} nota={formatSume(rezumat.sumaFinantataPeMoneda)} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrează după stare">
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
              {g.eticheta}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {date.granturi.length > 5 && <Input aria-label="Caută după finanțator sau titlu" placeholder="Caută…" value={cautare} onChange={(e) => setCautare(e.target.value)} className="!w-44" />}
          <Button variant="primary" onClick={() => setDeschis({ ...GOL })}>
            <Plus className="h-4 w-4" /> Adaugă cerere
          </Button>
        </div>
      </div>

      {deConfirmat && (
        <BaraConfirmare
          text={`Muți „${deConfirmat.titlu}” în starea „${ETICHETE_STARE[deConfirmat.stare as StareGrant]}”? Cererea iese din lista celor active.`}
          eticheta="Da, mută"
          onDa={() => aplica(deConfirmat.id, deConfirmat.stare)}
          onNu={() => setDeConfirmat(null)}
        />
      )}
      <Mesaj mesaj={mesaj} />

      {vizibile.length === 0 ? (
        <EmptyState
          icon={Award}
          title={date.granturi.length === 0 ? "Nicio cerere de finanțare încă" : "Nicio cerere găsită"}
          description={
            date.granturi.length === 0
              ? "Începe din „Surse de finanțare” ca să adaugi finanțatori de urmărit, sau adaugă direct o cerere. Completează întâi dosarul organizației: o singură dată, apoi îl refolosești."
              : "Schimbă filtrul sau căutarea ca să vezi celelalte cereri."
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
                        {g.finantator} · {ETICHETE_TIP[g.tipFinantator as keyof typeof ETICHETE_TIP] ?? ETICHETE_TIP.alt}
                        {numeMembru(g.responsabilId) ? ` · ${numeMembru(g.responsabilId)}` : ""}
                      </p>
                      {(g.documente.length > 0 || eligibile > 0) && (
                        <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">
                          {g.documente.length > 0 ? `Documente ${documenteOk}/${g.documente.length}` : ""}
                          {g.documente.length > 0 && eligibile > 0 ? " · " : ""}
                          {eligibile > 0 ? `Eligibilitate ${g.eligibilitate.filter((e) => e.ok).length}/${eligibile}` : ""}
                        </p>
                      )}
                    </button>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium tabular-nums text-[var(--ci-text)]">{formatSuma(g.suma, g.moneda)}</span>
                      {zile !== null || g.termen ? (
                        <Badge tone={TON_URGENTA[urgenta]} icon={false}>
                          <CalendarClock className="h-3 w-3" /> {formatData(g.termen)}
                          {zile !== null ? ` · ${textTermen(zile)}` : ""}
                        </Badge>
                      ) : null}
                      <Select aria-label={`Starea cererii ${g.titlu}`} value={g.stare} onChange={(e) => schimba(g, e.target.value)} className="!h-8 !w-auto !text-[13px]">
                        {STARI_GRANT.map((s) => (
                          <option key={s} value={s}>
                            {ETICHETE_STARE[s]}
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
              <button type="button" aria-label={`Șterge: ${e.text}`} className="-m-1.5 p-2 text-[var(--ci-text-faint)] hover:text-[var(--ci-red)]" onClick={() => onChange(elemente.filter((_, j) => j !== i))}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          aria-label={`Adaugă la ${titlu.toLowerCase()}`}
          value={nou}
          onChange={(e) => setNou(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adauga(nou);
              setNou("");
            }
          }}
          placeholder="Adaugă un rând și apasă Enter"
          maxLength={200}
        />
        <Button
          type="button"
          onClick={() => {
            adauga(nou);
            setNou("");
          }}
        >
          Adaugă
        </Button>
      </div>
    </fieldset>
  );
}

type ConfirmareFisa = { text: string; eticheta: string; periculos?: boolean; actiune: () => void } | null;

function FisaGrant({ orgSlug, date, initial, esteAdmin, onClose, onSaved }: { orgSlug: string; date: DateGranturi; initial: GrantInput; esteAdmin: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
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
    if (nesalvat) setConfirmare({ text: "Ai modificări nesalvate. Închizi fără să salvezi?", eticheta: "Da, închide", periculos: true, actiune: onClose });
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
        setMesaj({ tip: "eroare", text: "Nu am putut salva acum. Încearcă din nou." });
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
        setMesaj({ tip: "ok", text: "Schiță generată și salvată. Citește-o atent: completează părțile marcate și verifică fiecare cifră înainte să depui." });
        await onSaved();
      } catch {
        setMesaj({ tip: "eroare", text: "Nu am putut genera schița acum. Încearcă din nou în câteva momente." });
      } finally {
        setSeGenereaza(false);
      }
    });
  }

  function genereaza() {
    if (f.draft.trim()) setConfirmare({ text: "Schița actuală va fi înlocuită cu una nouă. Poți reveni la cea veche imediat după, dar nu mai târziu. Continui?", eticheta: "Da, regenerează", actiune: genereazaEfectiv });
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
          setMesaj({ tip: "ok", text: "Am revenit la schița anterioară." });
        } else setMesaj({ tip: "eroare", text: r.eroare });
      } catch {
        setMesaj({ tip: "eroare", text: "Nu am putut reveni acum. Încearcă din nou." });
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
          setMesaj({ tip: "ok", text: `Fișierul „${fis.name}” a fost încărcat.` });
        }
      } catch {
        setMesaj({ tip: "eroare", text: "Încărcarea nu a reușit. Verifică mărimea (maximum 4 MB) și încearcă din nou." });
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
      text: `Ștergi fișierul „${nume}”?`,
      eticheta: "Da, șterge",
      periculos: true,
      actiune: () => {
        startTransition(async () => {
          try {
            await stergeFisierGrantAction(orgSlug, id, fisierId);
            await onSaved();
            setMesaj({ tip: "ok", text: "Fișierul a fost șters." });
          } catch {
            setMesaj({ tip: "eroare", text: "Nu am putut șterge fișierul. Încearcă din nou." });
          }
        });
      },
    });
  }

  function sterge() {
    if (!f.id) return;
    const id = f.id;
    setConfirmare({
      text: "Ștergi această cerere, cu tot cu fișierele ei? Acțiunea nu poate fi anulată.",
      eticheta: "Da, șterge cererea",
      periculos: true,
      actiune: () => {
        startTransition(async () => {
          try {
            await stergeGrantAction(orgSlug, id);
            await onSaved();
            onClose();
          } catch {
            setMesaj({ tip: "eroare", text: "Nu am putut șterge cererea. Încearcă din nou." });
          }
        });
      },
    });
  }

  function copiaza() {
    const clip = navigator.clipboard;
    if (!clip) {
      setMesaj({ tip: "eroare", text: "Browserul nu permite copierea automată. Selectează textul și copiază-l manual." });
      return;
    }
    clip.writeText(f.draft).then(
      () => setMesaj({ tip: "ok", text: "Schița a fost copiată." }),
      () => setMesaj({ tip: "eroare", text: "Nu am putut copia. Selectează textul și copiază-l manual." }),
    );
  }

  return (
    <Dialog open onClose={inchide} title={noua ? "Cerere nouă de finanțare" : "Cerere de finanțare"} width="max-w-3xl">
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Camp eticheta="Finanțator">{(id) => <Input id={id} value={f.finantator} onChange={(e) => set("finantator", e.target.value)} maxLength={160} placeholder="ex. Fundația …" />}</Camp>
          <Camp eticheta="Program / apel">{(id) => <Input id={id} value={f.titlu} onChange={(e) => set("titlu", e.target.value)} maxLength={240} placeholder="ex. Apel pentru proiecte de sănătate" />}</Camp>
          <Camp eticheta="Tip de finanțator">
            {(id) => (
              <Select id={id} value={f.tipFinantator} onChange={(e) => set("tipFinantator", e.target.value)}>
                {TIPURI_FINANTATOR.map((t) => (
                  <option key={t} value={t}>
                    {ETICHETE_TIP[t]}
                  </option>
                ))}
              </Select>
            )}
          </Camp>
          <Camp eticheta="Stare">
            {(id) => (
              <Select id={id} value={f.stare} onChange={(e) => set("stare", e.target.value)}>
                {STARI_GRANT.map((s) => (
                  <option key={s} value={s}>
                    {ETICHETE_STARE[s]}
                  </option>
                ))}
              </Select>
            )}
          </Camp>
          <div className="grid grid-cols-[1fr_6rem] gap-2">
            <Camp eticheta="Suma solicitată">{(id) => <Input id={id} inputMode="decimal" value={f.suma} onChange={(e) => set("suma", e.target.value)} placeholder="ex. 25000" />}</Camp>
            <Camp eticheta="Moneda">
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
          <Camp eticheta="Termen de depunere" ajutor="Cât timp cererea nu e depusă, reminderul pleacă pe e-mail cu 7 zile și cu o zi înainte, către responsabil; fără responsabil, către proprietarii organizației.">
            {(id, desc) => <Input id={id} aria-describedby={desc} type="date" value={f.termen} onChange={(e) => set("termen", e.target.value)} />}
          </Camp>
          <Camp eticheta="Responsabil">
            {(id) => (
              <Select id={id} value={f.responsabilId ?? ""} onChange={(e) => set("responsabilId", e.target.value || null)}>
                <option value="">— nealocat —</option>
                {date.membri.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nume}
                  </option>
                ))}
              </Select>
            )}
          </Camp>
          <Camp eticheta="Link către apel sau ghid" className="sm:col-span-2">
            {(id) => <Input id={id} value={f.link} onChange={(e) => set("link", e.target.value)} placeholder="https://…" maxLength={500} />}
          </Camp>
        </div>

        <ListaBifabila
          titlu="Eligibilitate"
          ajutor="Condițiile din ghid pe care trebuie să le îndeplinești. Bifează ce ai verificat."
          elemente={f.eligibilitate as ElementLista[]}
          onChange={(e) => set("eligibilitate", e)}
          standard={ELIGIBILITATE_STANDARD}
          etichetaStandard="Adaugă criteriile uzuale"
        />
        <ListaBifabila
          titlu="Documente de pregătit"
          ajutor="Tot ce trebuie atașat cererii. Bifează ce e gata."
          elemente={f.documente as ElementLista[]}
          onChange={(e) => set("documente", e)}
          standard={DOCUMENTE_STANDARD}
          etichetaStandard="Adaugă lista standard"
        />

        <Camp eticheta="Cerințele finanțatorului" ajutor="Lipește din ghid secțiunile cerute, limitele de lungime și criteriile de evaluare. Schița se scrie pe ele.">
          {(id, desc) => <Textarea id={id} aria-describedby={desc} value={f.cerinte} onChange={(e) => set("cerinte", e.target.value)} rows={5} maxLength={20000} />}
        </Camp>

        <div className="space-y-2.5 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Label htmlFor="grant-draft">Schița cererii</Label>
              <p className="text-[12px] text-[var(--ci-text-muted)]">
                Pornește din dosarul organizației ({progres.completate}/{progres.total} câmpuri completate) și din cerințele de mai sus. Folosește doar faptele din dosar; ce lipsește rămâne marcat. E un punct de plecare, nu o cerere gata de depus.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select aria-label="Limba schiței" value={limba} onChange={(e) => setLimba(e.target.value as "ro" | "en")} className="!h-8 !w-auto !text-[13px]">
                <option value="ro">Română</option>
                <option value="en">English</option>
              </Select>
              <Button type="button" onClick={genereaza} loading={seGenereaza} disabled={!date.aiDisponibil || pending}>
                <Sparkles className="h-4 w-4" /> {f.draft ? "Regenerează schița" : "Generează schiță cu AI"}
              </Button>
            </div>
          </div>
          {!date.aiDisponibil ? (
            <p className="text-[12px] text-[var(--ci-text-muted)]">Generarea cu AI nu e activă pe această platformă; poți scrie schița manual mai jos.</p>
          ) : (
            <p className="text-[12px] text-[var(--ci-text-muted)]">{AVERTISMENT_AI}</p>
          )}
          <Textarea id="grant-draft" value={f.draft} onChange={(e) => set("draft", e.target.value)} rows={12} maxLength={30000} placeholder="Schița apare aici. O poți edita liber." />
          <div className="flex flex-wrap items-center gap-2">
            {f.draft && (
              <Button type="button" size="sm" onClick={copiaza}>
                <Check className="h-3.5 w-3.5" /> Copiază schița
              </Button>
            )}
            {draftAnterior !== null && (
              <Button type="button" size="sm" onClick={revinaLaDraft} disabled={pending}>
                Revino la schița anterioară
              </Button>
            )}
          </div>
        </div>

        {castigata && (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <Camp eticheta="Suma câștigată">{(id) => <Input id={id} inputMode="decimal" value={f.sumaCastigata} onChange={(e) => set("sumaCastigata", e.target.value)} placeholder={f.suma || "ex. 20000"} />}</Camp>
            <Camp eticheta="Data deciziei">{(id) => <Input id={id} type="date" value={f.dataDecizie} onChange={(e) => set("dataDecizie", e.target.value)} />}</Camp>
            <Camp eticheta="Termen de raportare">{(id) => <Input id={id} type="date" value={f.termenRaportare} onChange={(e) => set("termenRaportare", e.target.value)} />}</Camp>
          </div>
        )}

        <div>
          <Label htmlFor="grant-fisier">Fișiere atașate</Label>
          {noua ? (
            <p className="text-[12px] text-[var(--ci-text-muted)]">Salvează cererea ca să poți atașa fișiere (PDF, imagini, Word, Excel; maximum 4 MB fiecare).</p>
          ) : (
            <div className="space-y-2">
              <p className="text-[12px] text-[var(--ci-text-muted)]">
                Statut, bilanț, buget, scrisori de sprijin: tot ce ai pregătit pentru depunere. PDF, imagini, Word, Excel; maximum 4 MB fiecare. Nu încărca acte cu CNP sau date medicale decât dacă sunt necesare cererii și ai temei legal.
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
                      <button type="button" aria-label={`Șterge fișierul ${x.nume}`} className="-m-1.5 p-2 text-[var(--ci-text-faint)] hover:text-[var(--ci-red)]" onClick={() => stergeFisier(x.id, x.nume)}>
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
                  Se încarcă…
                </p>
              )}
            </div>
          )}
        </div>

        <Camp eticheta="Note interne">{(id) => <Textarea id={id} value={f.nota} onChange={(e) => set("nota", e.target.value)} rows={3} maxLength={4000} />}</Camp>
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
                <Trash2 className="h-4 w-4" /> Șterge
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {nesalvat && <span className="text-[12px] text-[var(--ci-text-muted)]">Modificări nesalvate</span>}
            <Button type="button" onClick={inchide}>
              {nesalvat ? "Renunță" : "Închide"}
            </Button>
            <Button type="button" variant="primary" onClick={salveazaSiInchide} loading={pending && !seGenereaza && !seIncarca}>
              Salvează
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------------------------- Dosar

function Dosar({ orgSlug, dosar, prefill, reincarca }: { orgSlug: string; dosar: Record<string, string>; prefill: Record<string, string>; reincarca: () => Promise<void> }) {
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
            <h2 className="ci-display text-[15px] font-semibold text-[var(--ci-text)]">Dosarul organizației</h2>
            <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
              Faptele pe care le cere aproape orice finanțator, scrise o singură dată. Schița fiecărei cereri pornește de aici: scrie numai ce poți susține cu documente. Un dosar gol produce schițe aproape goale.
            </p>
            <p className="mt-1.5 text-[12px] text-[var(--ci-text-muted)]">Când generezi o schiță cu AI, textul din dosar (fără contact și IBAN) este trimis către Anthropic (SUA). Folosește prenume schimbate și detalii generale pentru beneficiari.</p>
          </div>
          <div className="text-right">
            <p className="ci-display text-lg font-bold tabular-nums text-[var(--ci-text)]">
              {progres.completate}/{progres.total}
            </p>
            <p className="text-[12px] text-[var(--ci-text-muted)]">câmpuri completate</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CAMPURI_DOSAR.map((c) => (
            <Camp key={c.cheie} eticheta={c.eticheta} ajutor={c.ajutor || undefined} className={c.lung ? "sm:col-span-2" : ""}>
              {(id, desc) =>
                c.lung ? (
                  <Textarea id={id} aria-describedby={desc} value={v[c.cheie] ?? ""} rows={4} maxLength={6000} placeholder={c.exemplu ? `Exemplu: ${c.exemplu}` : undefined} onChange={(e) => modifica(c.cheie, e.target.value)} />
                ) : (
                  <Input id={id} aria-describedby={desc} value={v[c.cheie] ?? ""} maxLength={6000} placeholder={c.exemplu ? `Exemplu: ${c.exemplu}` : undefined} onChange={(e) => modifica(c.cheie, e.target.value)} />
                )
              }
            </Camp>
          ))}
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
                  setMesaj({ tip: "ok", text: "Dosar salvat." });
                } catch {
                  setMesaj({ tip: "eroare", text: "Nu am putut salva dosarul. Încearcă din nou." });
                }
              })
            }
          >
            Salvează dosarul
          </Button>
          <Mesaj mesaj={mesaj} />
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------- Surse

function CautareApeluri({ orgSlug, date, reincarca }: { orgSlug: string; date: DateGranturi; reincarca: () => Promise<void> }) {
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
        if (r.ok) setRezultate({ apeluri: r.apeluri, la: new Date().toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" }) });
        else setMesaj({ tip: "eroare", text: r.eroare });
      } catch {
        setMesaj({ tip: "eroare", text: "Căutarea nu a reușit acum. Încearcă din nou în câteva momente." });
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
          <h3 className="ci-display text-[14px] font-semibold text-[var(--ci-text)]">Caută apeluri cu AI</h3>
          <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">
            Caută pe web apeluri deschise sau recurente potrivite organizației. Păstrăm doar rezultatele cu link real, dar <b className="font-semibold text-[var(--ci-text)]">termenul, eligibilitatea și credibilitatea sursei se verifică mereu pe pagina oficială</b> înainte să aplici. Către căutare nu trimitem datele din dosar, doar ce scrii mai jos.
          </p>
          {!date.aiDisponibil ? (
            <p className="mt-2 text-[12.5px] text-[var(--ci-text-muted)]">Căutarea cu AI nu e activă pe această platformă.</p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
                <Camp eticheta="Domeniu și temă">{(id) => <Input id={id} value={domeniu} maxLength={200} onChange={(e) => setDomeniu(e.target.value)} placeholder="ex. sănătate, copii cu dizabilități" />}</Camp>
                <Camp eticheta="Zonă">
                  {(id) => (
                    <Select id={id} value={zona} onChange={(e) => setZona(e.target.value)}>
                      <option>România</option>
                      <option>Europa</option>
                      <option>Internațional</option>
                    </Select>
                  )}
                </Camp>
                <Camp eticheta="Precizări (opțional)" className="sm:col-span-2">
                  {(id) => <Input id={id} value={observatii} maxLength={300} onChange={(e) => setObservatii(e.target.value)} placeholder="ex. proiecte între 10.000 și 50.000 de euro, fără cofinanțare" />}
                </Camp>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button variant="primary" onClick={cauta} loading={seCauta} disabled={pending && !seCauta}>
                  <Search className="h-4 w-4" /> {seCauta ? "Se caută…" : "Caută apeluri"}
                </Button>
                {seCauta && (
                  <span role="status" className="text-[12.5px] text-[var(--ci-text-muted)]">
                    Poate dura până la un minut.
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
                ? "Nu am găsit apeluri sigure pentru această căutare. Încearcă o temă mai largă sau altă zonă."
                : `Am găsit ${rezultate.apeluri.length} ${rezultate.apeluri.length === 1 ? "apel" : "apeluri"} la ${rezultate.la}. Verifică fiecare pe pagina oficială.`}
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
                        {a.finantator} · {a.termen ? `termen: ${formatData(a.termen)}` : "termen neconfirmat"}
                      </p>
                      {a.motiv && <p className="mt-1 text-[12.5px] text-[var(--ci-text)]">{a.motiv}</p>}
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--ci-primary)] hover:underline">
                        Deschide pagina ({domeniuDinUrl(a.url)}) <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    </div>
                    {deja(a) ? (
                      <Badge tone="green">În registru</Badge>
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
                                setMesaj({ tip: "ok", text: `„${a.titlu}” a fost adăugat în registru, în starea „Identificat”.` });
                              } else setMesaj({ tip: "eroare", text: r.eroare });
                            } catch {
                              setMesaj({ tip: "eroare", text: "Nu am putut adăuga în registru. Încearcă din nou." });
                            }
                          })
                        }
                      >
                        <Plus className="h-3.5 w-3.5" /> Adaugă în registru
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

function Surse({ orgSlug, date, reincarca, cautareAi }: { orgSlug: string; date: DateGranturi; reincarca: () => Promise<void>; cautareAi: boolean }) {
  const [fel, setFel] = useState<string>("toate");
  const [pending, startTransition] = useTransition();
  const [mesaj, setMesaj] = useState<MesajUi>(null);
  const [adaugat, setAdaugat] = useState<Record<string, boolean>>({});
  const sursa = SURSE_FINANTARE.filter((s) => fel === "toate" || s.fel === fel);
  const deja = (nume: string) => adaugat[nume] || date.granturi.some((g) => g.finantator === nume);

  return (
    <div className="space-y-4 pt-4">
      {cautareAi && <CautareApeluri orgSlug={orgSlug} date={date} reincarca={reincarca} />}
      <Card>
        <p className="text-[13px] text-[var(--ci-text-muted)]">
          Locurile unde merită căutat periodic (lista a fost verificată în {SURSE_VERIFICATE_IN}). Nu arată apeluri în timp real: <b className="font-semibold text-[var(--ci-text)]">termenele, sumele și condițiile se verifică mereu pe site-ul finanțatorului</b>, iar criteriile se pot schimba. Apasă „Urmărește” ca să-l pui în registru și să-i adaugi apelul concret când apare.
        </p>
      </Card>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrează sursele">
        {[["toate", "Toate"], ...Object.entries(ETICHETE_FEL)].map(([k, e]) => (
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
                  {ETICHETE_FEL[s.fel]}
                </Badge>
              </div>
              <p className="text-[13px] text-[var(--ci-text)]">{s.descriere}</p>
              <p className="text-[12.5px] text-[var(--ci-text-muted)]">{s.cum}</p>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
                  Deschide site-ul <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
                <span className="flex-1" />
                {deja(s.nume) ? (
                  <Badge tone="green">În registru</Badge>
                ) : (
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          const r = await adaugaSursaInRegistruAction(orgSlug, s.nume, "Apel de verificat", s.tip, s.url, "");
                          if (r.ok) {
                            setAdaugat((x) => ({ ...x, [s.nume]: true }));
                            await reincarca();
                            setMesaj({ tip: "ok", text: `${s.nume} a fost adăugat în registru. Deschide-l din fila Registru ca să-i completezi apelul și termenul.` });
                          } else setMesaj({ tip: "eroare", text: r.eroare });
                        } catch {
                          setMesaj({ tip: "eroare", text: "Nu am putut adăuga în registru. Încearcă din nou." });
                        }
                      })
                    }
                  >
                    <Plus className="h-3.5 w-3.5" /> Urmărește
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
