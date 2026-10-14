"use client";

import { Award, CalendarClock, Check, ExternalLink, Paperclip, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

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

const GRUPURI: { key: string; eticheta: string; stari: readonly StareGrant[] | null }[] = [
  { key: "toate", eticheta: "Toate", stari: null },
  { key: "lucru", eticheta: "În lucru", stari: ["identificat", "in_pregatire"] },
  { key: "depuse", eticheta: "Depuse", stari: ["aplicat"] },
  { key: "finantate", eticheta: "Finanțate", stari: ["castigat", "in_derulare", "raportat"] },
  { key: "inchise", eticheta: "Închise", stari: ["respins", "renuntat"] },
];

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

export function GranturiClient({ orgSlug, initial, prefill, esteAdmin }: { orgSlug: string; initial: DateGranturi; prefill: Record<string, string>; esteAdmin: boolean }) {
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
  const [grup, setGrup] = useState("toate");
  const [deschis, setDeschis] = useState<GrantInput | null>(null);
  const [, startTransition] = useTransition();

  const stari = GRUPURI.find((g) => g.key === grup)?.stari ?? null;
  const vizibile = date.granturi.filter((g) => !stari || stari.includes(g.stare as StareGrant));
  const numeMembru = (id: string | null) => date.membri.find((m) => m.id === id)?.nume ?? null;

  function schimba(id: string, stare: string) {
    startTransition(async () => {
      await schimbaStareGrantAction(orgSlug, id, stare);
      await reincarca();
    });
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
        <Button variant="primary" onClick={() => setDeschis({ ...GOL })}>
          <Plus className="h-4 w-4" /> Adaugă cerere
        </Button>
      </div>

      {vizibile.length === 0 ? (
        <EmptyState
          icon={Award}
          title={date.granturi.length === 0 ? "Nicio cerere de finanțare încă" : "Nicio cerere în această stare"}
          description={
            date.granturi.length === 0
              ? "Începe din „Surse de finanțare” ca să adaugi finanțatori de urmărit, sau adaugă direct o cerere. Completează întâi dosarul organizației: o singură dată, apoi îl refolosești."
              : "Schimbă filtrul de mai sus ca să vezi celelalte cereri."
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
                      <Select
                        aria-label={`Starea cererii ${g.titlu}`}
                        value={g.stare}
                        onChange={(e) => schimba(g.id, e.target.value)}
                        className="!h-8 !w-auto !text-[13px]"
                      >
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

      {deschis && (
        <FisaGrant
          orgSlug={orgSlug}
          date={date}
          initial={deschis}
          esteAdmin={esteAdmin}
          onClose={() => setDeschis(null)}
          onSaved={async () => {
            await reincarca();
          }}
        />
      )}
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
    <div>
      <div className="flex items-center justify-between gap-2">
        <Label>{titlu}</Label>
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
              <button type="button" aria-label={`Șterge: ${e.text}`} className="text-[var(--ci-text-faint)] hover:text-[var(--ci-red)]" onClick={() => onChange(elemente.filter((_, j) => j !== i))}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
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
    </div>
  );
}

function FisaGrant({ orgSlug, date, initial, esteAdmin, onClose, onSaved }: { orgSlug: string; date: DateGranturi; initial: GrantInput; esteAdmin: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const [f, setF] = useState<GrantInput>(initial);
  const [eroare, setEroare] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [limba, setLimba] = useState<"ro" | "en">("ro");
  const [pending, startTransition] = useTransition();
  const [seGenereaza, setSeGenereaza] = useState(false);
  const set = <K extends keyof GrantInput>(k: K, v: GrantInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const noua = initial.id === null;
  const progres = progresDosar(date.dosar);
  const castigata = ["castigat", "in_derulare", "raportat"].includes(f.stare);

  // Salvează cererea; întoarce id-ul (necesar la generarea draftului pentru o cerere nouă) sau null dacă validarea a refuzat.
  async function salveaza(): Promise<string | null> {
    setEroare(null);
    const r = await salveazaGrantAction(orgSlug, f);
    if (!r.ok) {
      setEroare(r.eroare);
      return null;
    }
    setF((x) => ({ ...x, id: r.id }));
    await onSaved();
    return r.id;
  }

  function salveazaSiInchide() {
    startTransition(async () => {
      if (await salveaza()) onClose();
    });
  }

  function genereaza() {
    setMesaj(null);
    setSeGenereaza(true);
    startTransition(async () => {
      try {
        const id = await salveaza();
        if (!id) return;
        const r = await genereazaDraftGrantAction(orgSlug, id, limba);
        if (!r.ok) {
          setEroare(r.eroare);
          return;
        }
        set("draft", r.draft);
        setMesaj("Draft generat și salvat. Citește-l atent: completează părțile marcate și verifică fiecare cifră înainte să depui.");
        await onSaved();
      } catch {
        setEroare("Nu am putut genera draftul acum. Încearcă din nou în câteva momente.");
      } finally {
        setSeGenereaza(false);
      }
    });
  }

  const fisiere = date.granturi.find((g) => g.id === f.id)?.fisiere ?? [];

  function incarcaFisier(fis: File) {
    if (!f.id) return;
    setEroare(null);
    setMesaj(null);
    const id = f.id;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("fisier", fis);
      const r = await incarcaFisierGrantAction(orgSlug, id, fd);
      if (!r.ok) setEroare(r.eroare);
      else await onSaved();
    });
  }

  function deschideFisier(fisierId: string) {
    if (!f.id) return;
    const id = f.id;
    startTransition(async () => {
      const r = await deschideFisierGrantAction(orgSlug, id, fisierId);
      if (r.ok) window.open(r.url, "_blank", "noopener,noreferrer");
      else setEroare(r.eroare);
    });
  }

  function stergeFisier(fisierId: string) {
    if (!f.id || !window.confirm("Ștergi acest fișier?")) return;
    const id = f.id;
    startTransition(async () => {
      await stergeFisierGrantAction(orgSlug, id, fisierId);
      await onSaved();
    });
  }

  function sterge() {
    if (!f.id || !window.confirm("Ștergi această cerere? Acțiunea nu poate fi anulată.")) return;
    startTransition(async () => {
      await stergeGrantAction(orgSlug, f.id as string);
      await onSaved();
      onClose();
    });
  }

  return (
    <Dialog open onClose={onClose} title={noua ? "Cerere nouă de finanțare" : "Cerere de finanțare"} width="max-w-3xl">
      <div className="max-h-[75vh] space-y-5 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <Label>Finanțator</Label>
            <Input value={f.finantator} onChange={(e) => set("finantator", e.target.value)} maxLength={160} placeholder="ex. Fundația …" />
          </div>
          <div>
            <Label>Program / apel</Label>
            <Input value={f.titlu} onChange={(e) => set("titlu", e.target.value)} maxLength={240} placeholder="ex. Apel pentru proiecte de sănătate" />
          </div>
          <div>
            <Label>Tip de finanțator</Label>
            <Select value={f.tipFinantator} onChange={(e) => set("tipFinantator", e.target.value)}>
              {TIPURI_FINANTATOR.map((t) => (
                <option key={t} value={t}>
                  {ETICHETE_TIP[t]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Stare</Label>
            <Select value={f.stare} onChange={(e) => set("stare", e.target.value)}>
              {STARI_GRANT.map((s) => (
                <option key={s} value={s}>
                  {ETICHETE_STARE[s]}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-[1fr_6rem] gap-2">
            <div>
              <Label>Suma solicitată</Label>
              <Input inputMode="decimal" value={f.suma} onChange={(e) => set("suma", e.target.value)} placeholder="ex. 25000" />
            </div>
            <div>
              <Label>Moneda</Label>
              <Select value={f.moneda} onChange={(e) => set("moneda", e.target.value)}>
                {MONEDE.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>Termen de depunere</Label>
            <Input type="date" value={f.termen} onChange={(e) => set("termen", e.target.value)} />
            <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">Primești un e-mail cu 7 zile și cu o zi înainte, cât timp cererea nu e depusă.</p>
          </div>
          <div>
            <Label>Responsabil</Label>
            <Select value={f.responsabilId ?? ""} onChange={(e) => set("responsabilId", e.target.value || null)}>
              <option value="">— nealocat —</option>
              {date.membri.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nume}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Link către apel sau ghid</Label>
            <Input value={f.link} onChange={(e) => set("link", e.target.value)} placeholder="https://…" maxLength={500} />
          </div>
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

        <div>
          <Label>Cerințele finanțatorului</Label>
          <p className="mb-1.5 text-[12px] text-[var(--ci-text-muted)]">Lipește din ghid secțiunile cerute, limitele de lungime și criteriile de evaluare. Draftul se scrie pe ele.</p>
          <Textarea value={f.cerinte} onChange={(e) => set("cerinte", e.target.value)} rows={5} maxLength={20000} />
        </div>

        <div className="space-y-2.5 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Label>Draftul cererii</Label>
              <p className="text-[12px] text-[var(--ci-text-muted)]">
                Generat din dosarul organizației ({progres.completate}/{progres.total} câmpuri completate) și cerințele de mai sus. Folosește doar faptele din dosar; ce lipsește rămâne marcat.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select aria-label="Limba draftului" value={limba} onChange={(e) => setLimba(e.target.value as "ro" | "en")} className="!h-8 !w-auto !text-[13px]">
                <option value="ro">Română</option>
                <option value="en">English</option>
              </Select>
              <Button type="button" onClick={genereaza} loading={seGenereaza} disabled={!date.aiDisponibil || pending}>
                <Sparkles className="h-4 w-4" /> {f.draft ? "Regenerează cu AI" : "Generează cu AI"}
              </Button>
            </div>
          </div>
          {!date.aiDisponibil && <p className="text-[12px] text-[var(--ci-text-muted)]">Generarea cu AI nu e activă pe această platformă; poți scrie draftul manual mai jos.</p>}
          {f.draft && !seGenereaza && date.aiDisponibil && <p className="text-[12px] text-[var(--ci-amber)]">Regenerarea înlocuiește textul de mai jos.</p>}
          <Textarea value={f.draft} onChange={(e) => set("draft", e.target.value)} rows={12} maxLength={30000} placeholder="Draftul apare aici. Îl poți edita liber." />
          {f.draft && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                void navigator.clipboard?.writeText(f.draft).then(() => setMesaj("Draftul a fost copiat."));
              }}
            >
              <Check className="h-3.5 w-3.5" /> Copiază draftul
            </Button>
          )}
        </div>

        {castigata && (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <div>
              <Label>Suma câștigată</Label>
              <Input inputMode="decimal" value={f.sumaCastigata} onChange={(e) => set("sumaCastigata", e.target.value)} placeholder={f.suma || "ex. 20000"} />
            </div>
            <div>
              <Label>Data deciziei</Label>
              <Input type="date" value={f.dataDecizie} onChange={(e) => set("dataDecizie", e.target.value)} />
            </div>
            <div>
              <Label>Termen de raportare</Label>
              <Input type="date" value={f.termenRaportare} onChange={(e) => set("termenRaportare", e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <Label>Fișiere atașate</Label>
          {noua ? (
            <p className="text-[12px] text-[var(--ci-text-muted)]">Salvează cererea ca să poți atașa fișiere (PDF, imagini, Word, Excel; maximum 4 MB fiecare).</p>
          ) : (
            <div className="space-y-2">
              <p className="text-[12px] text-[var(--ci-text-muted)]">Statut, bilanț, buget, scrisori de sprijin: tot ce ai pregătit pentru depunere. PDF, imagini, Word, Excel; maximum 4 MB fiecare.</p>
              {fisiere.length > 0 && (
                <ul className="space-y-1">
                  {fisiere.map((x) => (
                    <li key={x.id} className="flex items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-2.5 py-1.5">
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-[var(--ci-text-faint)]" aria-hidden />
                      <button type="button" className="min-w-0 flex-1 truncate text-left text-[13px] text-[var(--ci-primary)] hover:underline" onClick={() => deschideFisier(x.id)}>
                        {x.nume}
                      </button>
                      <span className="shrink-0 text-[12px] text-[var(--ci-text-muted)]">{formatMarime(x.marime)}</span>
                      <button type="button" aria-label={`Șterge fișierul ${x.nume}`} className="text-[var(--ci-text-faint)] hover:text-[var(--ci-red)]" onClick={() => stergeFisier(x.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                type="file"
                aria-label="Atașează un fișier"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt"
                disabled={pending}
                onChange={(e) => {
                  const fis = e.target.files?.[0];
                  e.target.value = "";
                  if (fis) incarcaFisier(fis);
                }}
                className="block w-full text-[13px] text-[var(--ci-text-muted)] file:mr-3 file:rounded-[var(--ci-radius-btn)] file:border file:border-[var(--ci-border)] file:bg-[var(--ci-surface)] file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-[var(--ci-text)]"
              />
            </div>
          )}
        </div>

        <div>
          <Label>Note interne</Label>
          <Textarea value={f.nota} onChange={(e) => set("nota", e.target.value)} rows={3} maxLength={4000} />
        </div>
      </div>

      {eroare && (
        <p role="alert" className="mt-3 text-[13px] text-[var(--ci-red)]">
          {eroare}
        </p>
      )}
      {mesaj && !eroare && (
        <p role="status" className="mt-3 text-[13px] text-[var(--ci-text-muted)]">
          {mesaj}
        </p>
      )}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--ci-border)] pt-4">
        <div>
          {!noua && esteAdmin && (
            <Button type="button" variant="ghost" onClick={sterge} disabled={pending}>
              <Trash2 className="h-4 w-4" /> Șterge
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={onClose}>
            Închide
          </Button>
          <Button type="button" variant="primary" onClick={salveazaSiInchide} loading={pending && !seGenereaza}>
            Salvează
          </Button>
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
  const [salvat, setSalvat] = useState(false);
  const progres = progresDosar(v);

  return (
    <div className="space-y-4 pt-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-2xl">
            <h2 className="ci-display text-[15px] font-semibold text-[var(--ci-text)]">Dosarul organizației</h2>
            <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
              Faptele pe care le cere aproape orice finanțator, scrise o singură dată. Draftul fiecărei cereri pornește de aici: scrie numai ce poți susține cu documente.
            </p>
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
            <div key={c.cheie} className={c.lung ? "sm:col-span-2" : ""}>
              <Label htmlFor={`dosar-${c.cheie}`}>{c.eticheta}</Label>
              {c.ajutor && <p className="mb-1.5 text-[12px] text-[var(--ci-text-muted)]">{c.ajutor}</p>}
              {c.lung ? (
                <Textarea id={`dosar-${c.cheie}`} value={v[c.cheie] ?? ""} rows={4} maxLength={6000} onChange={(e) => setV({ ...v, [c.cheie]: e.target.value })} />
              ) : (
                <Input id={`dosar-${c.cheie}`} value={v[c.cheie] ?? ""} maxLength={6000} onChange={(e) => setV({ ...v, [c.cheie]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-3">
          <Button
            variant="primary"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                await salveazaDosarAction(orgSlug, v);
                await reincarca();
                setSalvat(true);
              })
            }
          >
            Salvează dosarul
          </Button>
          {salvat && !pending && (
            <span role="status" className="text-[13px] text-[var(--ci-text-muted)]">
              Dosar salvat.
            </span>
          )}
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
  const [rezultate, setRezultate] = useState<ApelGasit[] | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [seCauta, setSeCauta] = useState(false);
  const [pending, startTransition] = useTransition();
  const [adaugate, setAdaugate] = useState<Record<string, boolean>>({});

  function cauta() {
    setEroare(null);
    setRezultate(null);
    setSeCauta(true);
    startTransition(async () => {
      try {
        const r = await cautaApeluriAction(orgSlug, domeniu, zona, observatii);
        if (r.ok) setRezultate(r.apeluri);
        else setEroare(r.eroare);
      } catch {
        setEroare("Căutarea nu a reușit acum. Încearcă din nou în câteva momente.");
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
            Caută pe web apeluri deschise sau recurente potrivite organizației. Păstrăm doar rezultatele cu link real, dar <b className="font-semibold text-[var(--ci-text)]">termenul și eligibilitatea se verifică mereu pe pagina oficială</b> înainte să aplici.
          </p>
          {!date.aiDisponibil ? (
            <p className="mt-2 text-[12.5px] text-[var(--ci-text-muted)]">Căutarea cu AI nu e activă pe această platformă.</p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
                <div>
                  <Label htmlFor="cautare-domeniu">Domeniu și temă</Label>
                  <Input id="cautare-domeniu" value={domeniu} maxLength={200} onChange={(e) => setDomeniu(e.target.value)} placeholder="ex. sănătate, copii cu dizabilități" />
                </div>
                <div>
                  <Label htmlFor="cautare-zona">Zonă</Label>
                  <Select id="cautare-zona" value={zona} onChange={(e) => setZona(e.target.value)}>
                    <option>România</option>
                    <option>Europa</option>
                    <option>Internațional</option>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="cautare-obs">Precizări (opțional)</Label>
                  <Input id="cautare-obs" value={observatii} maxLength={300} onChange={(e) => setObservatii(e.target.value)} placeholder="ex. proiecte între 10.000 și 50.000 de euro, fără cofinanțare" />
                </div>
              </div>
              <div className="mt-3">
                <Button variant="primary" onClick={cauta} loading={seCauta} disabled={pending && !seCauta}>
                  <Search className="h-4 w-4" /> {seCauta ? "Se caută…" : "Caută apeluri"}
                </Button>
                {seCauta && <span className="ml-3 text-[12.5px] text-[var(--ci-text-muted)]">Poate dura până la un minut.</span>}
              </div>
            </>
          )}
          {eroare && (
            <p role="alert" className="mt-3 text-[13px] text-[var(--ci-red)]">
              {eroare}
            </p>
          )}
          {rezultate && rezultate.length === 0 && <p className="mt-3 text-[13px] text-[var(--ci-text-muted)]">Nu am găsit apeluri sigure pentru această căutare. Încearcă o temă mai largă sau altă zonă.</p>}
          {rezultate && rezultate.length > 0 && (
            <ul className="mt-3 space-y-2">
              {rezultate.map((a) => (
                <li key={a.url} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-[var(--ci-text)]">{a.titlu}</p>
                      <p className="text-[12.5px] text-[var(--ci-text-muted)]">
                        {a.finantator} · {a.termen ? `termen: ${formatData(a.termen)}` : "termen neconfirmat"}
                      </p>
                      {a.motiv && <p className="mt-1 text-[12.5px] text-[var(--ci-text)]">{a.motiv}</p>}
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--ci-primary)] hover:underline">
                        Deschide pagina <ExternalLink className="h-3 w-3" aria-hidden />
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
                            const r = await adaugaSursaInRegistruAction(orgSlug, a.finantator, a.titlu, "alt", a.url, a.termen ?? "");
                            if (r.ok) {
                              setAdaugate((x) => ({ ...x, [a.url]: true }));
                              await reincarca();
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

function Surse({ orgSlug, date, reincarca }: { orgSlug: string; date: DateGranturi; reincarca: () => Promise<void> }) {
  const [fel, setFel] = useState<string>("toate");
  const [pending, startTransition] = useTransition();
  const [adaugat, setAdaugat] = useState<Record<string, boolean>>({});
  const sursa = SURSE_FINANTARE.filter((s) => fel === "toate" || s.fel === fel);
  const deja = (nume: string) => adaugat[nume] || date.granturi.some((g) => g.finantator === nume);

  return (
    <div className="space-y-4 pt-4">
      <Card>
        <p className="text-[13px] text-[var(--ci-text-muted)]">
          Locurile unde merită căutat periodic. Lista e orientativă și nu arată apeluri în timp real: <b className="font-semibold text-[var(--ci-text)]">termenele, sumele și condițiile se verifică mereu pe site-ul finanțatorului</b>. Apasă „Urmărește” ca să-l pui în registru și să-i adaugi apelul concret când apare.
        </p>
      </Card>
      <CautareApeluri orgSlug={orgSlug} date={date} reincarca={reincarca} />
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
                        const r = await adaugaSursaInRegistruAction(orgSlug, s.nume, "Apel de verificat", s.tip, s.url, "");
                        if (r.ok) {
                          setAdaugat((x) => ({ ...x, [s.nume]: true }));
                          await reincarca();
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
