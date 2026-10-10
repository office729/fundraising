"use client";

import { AlertTriangle, CalendarDays, Check, Copy, Download, ExternalLink, Laptop, Link2, MapPin, Plus, Settings2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ETICHETE_STATUS_VOLUNTAR, formateazaOre } from "@/lib/voluntari-activitati";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { creeazaLinkAction, stergeVoluntarPanouAction } from "../voluntari-panou/actions";

import { rezolvaRaportareAction, type DateVoluntari } from "./actions";
import { ActivitatiTab } from "./activitati-tab";
import { SarciniTab } from "./sarcini-tab";
import { dataOra, dataScurta, descarcaCsv, MesajActiune, Sectiune, useActiune } from "./ui";

type Tab = "prezentare" | "online" | "teren" | "voluntari" | "raportari";

export function VoluntariClient({ orgSlug, date }: { orgSlug: string; date: DateVoluntari }) {
  const [tab, setTab] = useState<Tab>("prezentare");
  const [formSarcina, setFormSarcina] = useState(false);
  const [formActivitate, setFormActivitate] = useState(false);
  const raportariNoi = date.raportari.filter((r) => r.stare === "noua").length;

  const tabs: { id: Tab; eticheta: string; nr?: number }[] = [
    { id: "prezentare", eticheta: "Prezentare" },
    { id: "online", eticheta: "Online", nr: date.sarcini.length },
    { id: "teren", eticheta: "Pe teren", nr: date.activitati.length },
    { id: "voluntari", eticheta: "Voluntari", nr: date.voluntari.length },
    ...(date.raportari.length > 0 ? [{ id: "raportari" as const, eticheta: "Raportări", nr: raportariNoi || undefined }] : []),
  ];

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Voluntari</h1>
          <p className="mt-0.5 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">Voluntari care ajută online și voluntari care vin la activități, într-un singur loc.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() => {
              setTab("online");
              setFormSarcina(true);
            }}
          >
            <Plus className="h-4 w-4" /> Sarcină online
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setTab("teren");
              setFormActivitate(true);
            }}
          >
            <Plus className="h-4 w-4" /> Activitate pe teren
          </Button>
        </div>
      </div>

      <div role="tablist" aria-label="Secțiuni" className="ci-scrollbar flex gap-1 overflow-x-auto border-b border-[var(--ci-border)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13.5px] font-semibold transition-colors ${tab === t.id ? "border-[var(--ci-primary)] text-[var(--ci-primary)]" : "border-transparent text-[var(--ci-text-muted)] hover:text-[var(--ci-text)]"}`}
          >
            {t.eticheta}
            {t.nr != null && t.nr > 0 && <span className="rounded-full bg-[var(--ci-surface-2)] px-1.5 text-[11px] font-semibold text-[var(--ci-text-muted)]">{t.nr}</span>}
          </button>
        ))}
      </div>

      {tab === "prezentare" && <Prezentare orgSlug={orgSlug} date={date} mergiLa={setTab} />}
      {tab === "online" && <SarciniTab orgSlug={orgSlug} date={date} deschis={formSarcina} inchideFormular={() => setFormSarcina(false)} />}
      {tab === "teren" && <ActivitatiTab orgSlug={orgSlug} date={date} deschis={formActivitate} inchideFormular={() => setFormActivitate(false)} />}
      {tab === "voluntari" && <VoluntariTab orgSlug={orgSlug} date={date} />}
      {tab === "raportari" && <RaportariTab orgSlug={orgSlug} date={date} />}
    </div>
  );
}

// ===== Prezentare =====
function Prezentare({ orgSlug, date, mergiLa }: { orgSlug: string; date: DateVoluntari; mergiLa: (t: Tab) => void }) {
  const { pending, mesaj, setMesaj, ruleaza } = useActiune();
  const [copiat, setCopiat] = useState(false);
  const { cifre, atentie } = date;

  async function copiaza() {
    if (!date.link) return;
    try {
      await navigator.clipboard.writeText(date.link.url);
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } catch {
      setMesaj({ tip: "eroare", text: "Nu am putut copia automat. Selectează linkul și copiază-l manual." });
    }
  }

  const probleme: { text: string; actiune: () => void }[] = [];
  if (atentie.inscrieriFaraRaspuns > 0) probleme.push({ text: `${atentie.inscrieriFaraRaspuns} ${atentie.inscrieriFaraRaspuns === 1 ? "cerere de înscriere așteaptă" : "cereri de înscriere așteaptă"} un răspuns de peste 48 de ore`, actiune: () => mergiLa("teren") });
  for (const a of atentie.activitatiCuLocuriLibere) probleme.push({ text: `„${a.titlu}” are ${a.libere} ${a.libere === 1 ? "loc liber" : "locuri libere"} și urmează în curând`, actiune: () => mergiLa("teren") });
  for (const s of atentie.sarciniCareExpira) probleme.push({ text: `Sarcina „${s.titlu}” expiră pe ${dataScurta(`${s.termen}T12:00:00Z`)}`, actiune: () => mergiLa("online") });
  for (const a of atentie.activitatiDeValidat) probleme.push({ text: `Activitatea „${a.titlu}” s-a încheiat, dar orele nu sunt validate`, actiune: () => mergiLa("teren") });
  if (atentie.raportariNoi > 0) probleme.push({ text: `${atentie.raportariNoi} ${atentie.raportariNoi === 1 ? "problemă raportată de voluntari" : "probleme raportate de voluntari"}`, actiune: () => mergiLa("raportari") });

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-[var(--ci-text)]">
              <Link2 className="h-4 w-4 text-[var(--ci-primary)]" aria-hidden /> Linkul voluntarilor
            </p>
            {date.link ? (
              <p className="mt-1 truncate text-[13px] text-[var(--ci-text-muted)]">
                <span className="select-all">{date.link.url}</span>
                {!date.link.activ && <span className="ml-2 font-semibold text-[var(--ci-amber)]">oprit</span>}
              </p>
            ) : (
              <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">Un singur link pentru toți voluntarii: văd sarcinile și activitățile, fără cont. Creează-l ca să poți începe.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {date.link ? (
              <>
                <Button onClick={copiaza}>{copiat ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copiat ? "Copiat" : "Copiază"}</Button>
                <a href={date.link.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3.5 text-sm font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
                  <ExternalLink className="h-4 w-4" /> Cum o văd voluntarii
                </a>
              </>
            ) : (
              <Button variant="primary" disabled={pending} onClick={() => ruleaza(() => creeazaLinkAction(orgSlug), "Linkul a fost creat.")}>
                Creează linkul
              </Button>
            )}
            <Link href={`/${orgSlug}/crm/voluntari-panou`} className="inline-flex h-9 items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3.5 text-sm font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
              <Settings2 className="h-4 w-4" /> Link și campanii
            </Link>
          </div>
        </div>
        <div className="mt-3">
          <MesajActiune mesaj={mesaj} />
        </div>
      </Card>

      {probleme.length > 0 ? (
        <Card>
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-[var(--ci-text)]">
            <AlertTriangle className="h-4 w-4 text-[var(--ci-amber)]" aria-hidden /> Are nevoie de atenție
          </h2>
          <ul className="mt-2 divide-y divide-[var(--ci-border)]">
            {probleme.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <span className="text-[13px] text-[var(--ci-text)]">{p.text}</span>
                <Button size="sm" onClick={p.actiune}>
                  Deschide
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        date.link && (date.sarcini.length > 0 || date.activitati.length > 0) && <p className="rounded-lg bg-[var(--ci-green-soft)] px-3 py-2 text-[13px] text-[var(--ci-green)]">Nimic nu așteaptă un răspuns acum.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="g-activitate">
          <h2 id="g-activitate" className="mb-2 text-[12px] font-semibold tracking-wide text-[var(--ci-text-muted)] uppercase">
            Activitate
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Cifra eticheta="Voluntari activi" valoare={cifre.voluntariActivi} nota={`din ${cifre.voluntariTotal} înscriși`} />
            <Cifra eticheta="Sarcini online deschise" valoare={cifre.sarciniDeschise} nota={`${cifre.sarciniFinalizate} finalizări în total`} />
            <Cifra eticheta="Activități viitoare" valoare={cifre.activitatiViitoare} nota={`${cifre.inscrieriViitoare} înscrieri · ${cifre.locuriLibere} locuri libere`} />
            <Cifra eticheta="Ore validate" valoare={formateazaOre(cifre.oreValidate)} nota={cifre.prezentaProcent != null ? `prezență ${cifre.prezentaProcent}%` : "încă fără prezențe"} />
          </div>
        </section>
        <section aria-labelledby="g-rezultat">
          <h2 id="g-rezultat" className="mb-2 text-[12px] font-semibold tracking-wide text-[var(--ci-text-muted)] uppercase">
            Rezultate
          </h2>
          <Card className="h-[calc(100%-1.75rem)]">
            <ListaRezultate date={date} />
            <p className="mt-3 text-[12px] text-[var(--ci-text-muted)]">Distribuirile și orele arată efort, nu impact. Rezultatele sunt cele definite de tine la fiecare activitate.</p>
          </Card>
        </section>
      </div>

      {date.sarcini.length === 0 && date.activitati.length === 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <Laptop className="h-5 w-5 text-[var(--ci-primary)]" aria-hidden />
            <p className="mt-2 text-[14px] font-semibold text-[var(--ci-text)]">Voluntari online</p>
            <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">Dă voluntarilor sarcini mici, cu termen: distribuie o campanie, scrie sau tradu un text.</p>
            <Button className="mt-3" variant="primary" onClick={() => mergiLa("online")}>
              Creează prima sarcină
            </Button>
          </Card>
          <Card>
            <MapPin className="h-5 w-5 text-[var(--ci-primary)]" aria-hidden />
            <p className="mt-2 text-[14px] font-semibold text-[var(--ci-text)]">Voluntari pe teren</p>
            <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">Organizează o colectă sau un eveniment, cu ture, locuri, prezență și ore.</p>
            <Button className="mt-3" variant="primary" onClick={() => mergiLa("teren")}>
              Creează prima activitate
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

function Cifra({ eticheta, valoare, nota }: { eticheta: string; valoare: number | string; nota: string }) {
  return (
    <Card>
      <p className="text-[12px] text-[var(--ci-text-muted)]">{eticheta}</p>
      <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{valoare}</p>
      <p className="mt-0.5 text-[11.5px] text-[var(--ci-text-muted)]">{nota}</p>
    </Card>
  );
}

function ListaRezultate({ date }: { date: DateVoluntari }) {
  const incheiate = date.activitati.filter((a) => a.stare === "incheiata" && a.rezultatEticheta && a.rezultatValoare != null);
  if (incheiate.length === 0) {
    return <p className="text-[13px] text-[var(--ci-text-muted)]">Apar aici după ce închizi o activitate și treci ce ai măsurat (de exemplu kilograme colectate sau persoane ajutate).</p>;
  }
  return (
    <ul className="space-y-2">
      {incheiate.slice(0, 5).map((a) => (
        <li key={a.id} className="flex items-baseline justify-between gap-3 text-[13px]">
          <span className="min-w-0 truncate text-[var(--ci-text)]">{a.titlu}</span>
          <span className="shrink-0 text-[var(--ci-text-muted)]">
            <b className="ci-tabular text-[var(--ci-text)]">{a.rezultatValoare}</b> {a.rezultatEticheta}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ===== Voluntari =====
function VoluntariTab({ orgSlug, date }: { orgSlug: string; date: DateVoluntari }) {
  const { pending, mesaj, ruleaza } = useActiune();
  const [cauta, setCauta] = useState("");
  const [deSters, setDeSters] = useState<string | null>(null);
  const lista = date.voluntari.filter((v) => !cauta.trim() || v.prenume.toLowerCase().includes(cauta.trim().toLowerCase()));
  const tonStatus = { nou: "blue", activ: "green", inactiv: "neutral" } as const;

  return (
    <div className="space-y-4">
      <Sectiune
        titlu="Voluntari"
        descriere="Toți cei care au intrat pe link. Statusul se calculează singur: Nou (fără nicio acțiune), Activ (o acțiune în ultimele 90 de zile), Inactiv."
        actiune={
          date.voluntari.length > 0 ? (
            <Button
              onClick={() =>
                descarcaCsv("voluntari.csv", [
                  ["Prenume", "Telefon", "Email", "Status", "Sarcini finalizate", "Activități la care a fost prezent", "Ore validate", "Distribuiri", "Ultima acțiune"],
                  ...date.voluntari.map((v) => [v.prenume, v.telefon, v.email, ETICHETE_STATUS_VOLUNTAR[v.status], v.sarciniFinalizate, v.activitatiPrezent, v.oreValidate, v.distribuiri, v.ultimaActiuneLa ? dataScurta(v.ultimaActiuneLa) : ""]),
                ])
              }
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          ) : undefined
        }
      />
      <MesajActiune mesaj={mesaj} />
      {date.voluntari.length === 0 ? (
        <EmptyState icon={Link2} title="Niciun voluntar încă" description="Trimite linkul voluntarilor. Cine intră apare aici, cu ce a făcut." />
      ) : (
        <>
          <Input aria-label="Caută după prenume" value={cauta} onChange={(e) => setCauta(e.target.value)} placeholder="Caută după prenume…" className="max-w-xs" />
          <div className="overflow-x-auto rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="bg-[var(--ci-surface-2)] text-[11.5px] tracking-wide text-[var(--ci-text-muted)] uppercase">
                <tr>
                  <th className="px-3 py-2 font-semibold">Voluntar</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 text-right font-semibold">Sarcini</th>
                  <th className="px-3 py-2 text-right font-semibold">Activități</th>
                  <th className="px-3 py-2 text-right font-semibold">Ore</th>
                  <th className="px-3 py-2 font-semibold">Ultima acțiune</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {lista.map((v) => (
                  <tr key={v.id} className="border-t border-[var(--ci-border)]">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-[var(--ci-text)]">{v.prenume}</p>
                      <p className="text-[12px] text-[var(--ci-text-muted)]">{[v.telefon ? `…${v.telefon.slice(-4)}` : null, v.email].filter(Boolean).join(" · ") || "fără contact"}</p>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={tonStatus[v.status]} icon={false}>
                        {ETICHETE_STATUS_VOLUNTAR[v.status]}
                      </Badge>
                    </td>
                    <td className="ci-tabular px-3 py-2 text-right">{v.sarciniFinalizate}</td>
                    <td className="ci-tabular px-3 py-2 text-right">{v.activitatiPrezent}</td>
                    <td className="ci-tabular px-3 py-2 text-right">{formateazaOre(v.oreValidate)}</td>
                    <td className="px-3 py-2 text-[var(--ci-text-muted)]">{v.ultimaActiuneLa ? dataScurta(v.ultimaActiuneLa) : "—"}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {v.oreValidate > 0 || v.sarciniFinalizate > 0 ? (
                        <Link href={`/${orgSlug}/crm/voluntari/adeverinta/${v.id}`} className="mr-1.5 inline-flex h-8 items-center rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-[13px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
                          Adeverință
                        </Link>
                      ) : (
                        <span className="mr-1.5 inline-flex h-8 cursor-not-allowed items-center rounded-[var(--ci-radius-btn)] border border-dashed border-[var(--ci-border)] px-3 text-[13px] text-[var(--ci-text-muted)]" title="Adeverința se poate emite după ce există ore validate sau sarcini finalizate">
                          Adeverință
                        </span>
                      )}
                      {deSters === v.id ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Button size="sm" onClick={() => setDeSters(null)}>
                            Renunț
                          </Button>
                          <Button size="sm" variant="primary" disabled={pending} onClick={() => { setDeSters(null); ruleaza(() => stergeVoluntarPanouAction(orgSlug, v.id), `${v.prenume} a fost șters(ă) din listă.`); }}>
                            Șterge
                          </Button>
                        </span>
                      ) : (
                        <Button size="sm" variant="ghost" aria-label={`Șterge ${v.prenume}`} onClick={() => setDeSters(v.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-[var(--ci-text-muted)]">Ștergerea unui voluntar (la cererea lui) elimină și distribuirile, implicările și înscrierile lui. Pentru adeverințe și contacte vechi, folosește <Link className="font-semibold text-[var(--ci-primary)] hover:underline" href={`/${orgSlug}/crm-voluntari`}>CRM Voluntari</Link>.</p>
        </>
      )}
    </div>
  );
}

// ===== Raportări =====
function RaportariTab({ orgSlug, date }: { orgSlug: string; date: DateVoluntari }) {
  const { pending, mesaj, ruleaza } = useActiune();
  return (
    <div className="space-y-4">
      <Sectiune titlu="Probleme raportate" descriere="Mesajele trimise de voluntari cu „Raportează o problemă”. Sunt vizibile doar echipei." />
      <MesajActiune mesaj={mesaj} />
      <ul className="space-y-2">
        {date.raportari.map((r) => (
          <li key={r.id}>
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12.5px] text-[var(--ci-text-muted)]">
                  {dataOra(r.creataLa)} · {r.voluntar ?? "Voluntar necunoscut"}
                  {r.activitate ? ` · ${r.activitate}` : ""}
                </p>
                {r.stare === "noua" ? (
                  <Button size="sm" disabled={pending} onClick={() => ruleaza(() => rezolvaRaportareAction(orgSlug, r.id), "Marcată ca rezolvată.")}>
                    <Check className="h-3.5 w-3.5" /> Marchează rezolvată
                  </Button>
                ) : (
                  <Badge tone="green" icon={false}>
                    Rezolvată
                  </Badge>
                )}
              </div>
              <p className="mt-1.5 text-[13.5px] whitespace-pre-wrap text-[var(--ci-text)]">{r.descriere}</p>
            </Card>
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-[var(--ci-text-muted)] flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" aria-hidden /> Dacă o raportare implică minori sau persoane vulnerabile, discut-o cu responsabilul juridic; obligațiile de sesizare nu se stabilesc în platformă.</p>
    </div>
  );
}
