"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { normalizeazaCautare } from "@/lib/lead-uri";
import type { DateAdmin, RandProgramare } from "@/lib/programari/server";
import type { Slot } from "@/lib/programari/sloturi";

import { deconecteazaGoogleAction, incarcaInscrisiAction, oreLibereAction, programeazaInscrisAction, zileLibereAction, type InscrisPentruProgramare } from "./actions";

const camp = "h-9 w-full rounded-lg border border-line bg-panel px-2.5 text-sm text-ink";
const eticheta = "block text-xs font-medium text-muted";
const dataOra = (iso: string) => new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" }).format(new Date(iso));
const ziScurta = (d: string) => new Intl.DateTimeFormat("ro-RO", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const MAX_AFISATI = 40;

type Persoana = { nume: string; email: string; telefon: string; organizatie: string; mesaj: string };

// Echipa platformei programează un înscris: alege persoana (organizație cu cont sau lead), ziua și ora din calendarul intern, iar persoana primește pe email
// confirmarea cu linkul Zoom al întâlnirii. Nimeni altcineva nu poate programa în numele altora: acțiunile cer contul platformei.
export function ProgrameazaInscris({ date, randuri, laNoua, mesajGoogle }: { date: DateAdmin; randuri: RandProgramare[]; laNoua: (r: RandProgramare) => void; mesajGoogle?: string }) {
  const [inscrisi, setInscrisi] = useState<InscrisPentruProgramare[] | null>(null);
  const [eroareIncarcare, setEroareIncarcare] = useState("");
  const [sursa, setSursa] = useState<"organizatie" | "lead">("organizatie");
  const [cautare, setCautare] = useState("");
  const [ales, setAles] = useState<InscrisPentruProgramare | null>(null);
  const [acum] = useState(() => Date.now());

  useEffect(() => {
    incarcaInscrisiAction()
      .then(setInscrisi)
      .catch(() => setEroareIncarcare("Nu am putut încărca lista de înscriși. Reîncarcă pagina."));
  }, []);

  // Cine are deja o programare viitoare confirmată (după email), ca să nu programezi aceeași persoană de două ori fără să știi.
  const programate = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of randuri) if (r.stare === "confirmata" && new Date(r.startLa).getTime() >= acum) m.set(r.email.toLowerCase(), r.startLa);
    return m;
  }, [randuri, acum]);

  const lista = useMemo(() => {
    const q = normalizeazaCautare(cautare);
    return (inscrisi ?? [])
      .filter((i) => i.origine === sursa && (!q || normalizeazaCautare(`${i.nume} ${i.organizatie} ${i.email} ${i.telefon}`).includes(q)))
      .sort((a, b) => b.creatLa.localeCompare(a.creatLa));
  }, [inscrisi, sursa, cautare]);
  const nrOrg = (inscrisi ?? []).filter((i) => i.origine === "organizatie").length;
  const nrLead = (inscrisi ?? []).filter((i) => i.origine === "lead").length;

  return (
    <div>
      <BannerLinkuri date={date} mesajGoogle={mesajGoogle} />

      {!ales ? (
        <div className="mt-5">
          <h2 className="text-base font-bold text-ink">1. Alege cine se programează</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(["organizatie", "lead"] as const).map((o) => (
              <button key={o} type="button" aria-pressed={sursa === o} onClick={() => setSursa(o)} className={`h-8 rounded-full px-3.5 text-xs font-semibold ${sursa === o ? "bg-brand-blue text-white" : "border border-line text-muted hover:bg-panel-2"}`}>
                {o === "organizatie" ? `Organizații cu cont (${nrOrg})` : `Lead-uri din formular (${nrLead})`}
              </button>
            ))}
            <input type="search" value={cautare} onChange={(e) => setCautare(e.target.value)} placeholder="Caută după nume, organizație sau email…" aria-label="Caută" className={`${camp} max-w-xs`} />
          </div>
          {eroareIncarcare && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {eroareIncarcare}
            </p>
          )}
          {inscrisi === null && !eroareIncarcare ? (
            <p className="mt-4 text-sm text-muted">Se încarcă…</p>
          ) : lista.length === 0 ? (
            <p className="mt-4 rounded-xl border border-line bg-panel p-5 text-sm text-muted">Nimeni în această listă{cautare ? " pentru căutarea ta" : ""}.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {lista.slice(0, MAX_AFISATI).map((i) => {
                const deja = programate.get(i.email.toLowerCase());
                return (
                  <li key={i.cheie} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel p-3.5">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink">
                        {i.organizatie || i.nume || i.email}
                        {i.nume && i.organizatie ? <span className="font-normal text-muted"> · {i.nume}</span> : null}
                      </p>
                      <p className="text-xs text-muted">
                        {i.email}
                        {i.telefon ? ` · ${i.telefon}` : ""} · {i.info}
                      </p>
                      {deja && <p className="mt-0.5 text-xs font-semibold text-amber-800">Are deja o programare pe {dataOra(deja)}</p>}
                    </div>
                    <button type="button" onClick={() => setAles(i)} className="h-9 rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white">
                      Programează
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {lista.length > MAX_AFISATI && <p className="mt-3 text-xs text-muted">Primele {MAX_AFISATI} din {lista.length}. Restrânge căutarea ca să găsești persoana.</p>}
        </div>
      ) : (
        <Formular key={ales.cheie} ales={ales} date={date} deja={programate.get(ales.email.toLowerCase())} laInapoi={() => setAles(null)} laNoua={laNoua} />
      )}
    </div>
  );
}

function Formular({ ales, date, deja, laInapoi, laNoua }: { ales: InscrisPentruProgramare; date: DateAdmin; deja: string | undefined; laInapoi: () => void; laNoua: (r: RandProgramare) => void }) {
  const tipuri = date.tipuri.filter((t) => t.activ);
  const [persoana, setPersoana] = useState<Persoana>({ nume: ales.nume, email: ales.email, telefon: ales.telefon, organizatie: ales.organizatie, mesaj: "" });
  const [tipId, setTipId] = useState(tipuri[0]?.id ?? "");
  // Linkul întâlnirii pentru această programare: pornește de la linkul fix al tipului (dacă are) și îl poți schimba sau lipi altul.
  const [link, setLink] = useState(tipuri[0]?.locatie ?? "");
  const [zile, setZile] = useState<string[] | null>(null);
  const [zi, setZi] = useState("");
  const [ore, setOre] = useState<Slot[] | null>(null);
  const [ora, setOra] = useState("");
  const [erori, setErori] = useState<Record<string, string>>({});
  const [mesaj, setMesaj] = useState<{ ok: boolean; text: string } | null>(null);
  const [gata, setGata] = useState<{ rand: RandProgramare; link: string | null; zoom: boolean; emailTrimis: boolean } | null>(null);
  const [incarca, startIncarca] = useTransition();
  const [pending, start] = useTransition();

  // Zilele libere ale tipului ales (luna curentă și următoarea).
  useEffect(() => {
    if (!tipId) return;
    let anulat = false;
    zileLibereAction(tipId)
      .then((z) => {
        if (!anulat) setZile(z);
      })
      .catch(() => {
        if (!anulat) setZile([]);
      });
    return () => {
      anulat = true;
    };
  }, [tipId]);

  const alegeTip = (id: string) => {
    setTipId(id);
    setLink(tipuri.find((t) => t.id === id)?.locatie ?? "");
    setZile(null);
    setZi("");
    setOre(null);
    setOra("");
  };
  const alegeZi = (d: string) => {
    setZi(d);
    setOra("");
    setOre(null);
    startIncarca(async () => setOre(await oreLibereAction(tipId, d).catch(() => [])));
  };

  const trimite = () =>
    start(async () => {
      setMesaj(null);
      setErori({});
      const r = await programeazaInscrisAction({ tipId, startUtc: ora, origine: ales.origine, orgId: ales.orgId, persoana, linkIntalnire: link }).catch(() => ({ ok: false as const, eroare: "Nu am putut programa. Încearcă din nou." }));
      if (r.ok) {
        laNoua(r.rand);
        setGata({ rand: r.rand, link: r.linkIntalnire, zoom: r.zoom, emailTrimis: r.emailTrimis });
      } else {
        setMesaj({ ok: false, text: r.eroare });
        if ("campuri" in r && r.campuri) setErori(r.campuri);
      }
    });

  if (gata) {
    return (
      <div className="mt-5 rounded-xl border border-brand-green bg-brand-green-soft p-5" role="status">
        <p className="text-base font-bold text-ink">Programat: {gata.rand.nume}</p>
        <p className="mt-1 text-sm text-ink first-letter:uppercase">
          {dataOra(gata.rand.startLa)} (ora României) · {gata.rand.tipTitlu}
        </p>
        {gata.emailTrimis ? (
          <p className="mt-2 text-sm text-ink">
            Confirmarea a plecat pe email la <strong>{gata.rand.email}</strong>
            {gata.link ? ", cu linkul întâlnirii." : "."}
          </p>
        ) : (
          <p role="alert" className="mt-2 rounded-lg bg-amber-100 p-2.5 text-sm font-semibold text-amber-950">
            Programarea e salvată, dar emailul către {gata.rand.email} NU a plecat (trimiterea de emailuri nu e configurată sau a dat eroare). Trimite-i tu linkul și ora.
          </p>
        )}
        {gata.link ? (
          <p className="mt-2 text-sm text-ink">
            {gata.zoom ? "Link Zoom (creat pentru această întâlnire)" : /meet\.google\.com\//i.test(gata.link) ? "Link Google Meet" : "Linkul întâlnirii"}:{" "}
            <a href={gata.link} target="_blank" rel="noopener noreferrer" className="font-semibold break-all text-brand-blue underline">
              {gata.link}
            </a>
          </p>
        ) : (
          <p className="mt-2 text-sm text-amber-900">Programarea nu are link de întâlnire: Zoom nu e conectat, iar tipul ales nu are un link fix. Trimite-i linkul separat.</p>
        )}
        <button type="button" onClick={laInapoi} className="mt-4 h-9 rounded-lg border border-line bg-panel px-4 text-sm font-semibold text-ink hover:bg-panel-2">
          Programează pe altcineva
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <button type="button" onClick={laInapoi} className="text-[13px] font-medium text-muted hover:text-brand-blue">
        ← Alege altă persoană
      </button>
      <h2 className="mt-2 text-base font-bold text-ink">2. Datele persoanei și ora întâlnirii</h2>
      <p className="text-xs text-muted">{ales.info}</p>
      {deja && <p className="mt-2 rounded-lg bg-amber-50 p-2.5 text-sm font-semibold text-amber-900">Atenție: persoana are deja o programare pe {dataOra(deja)}.</p>}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className={eticheta}>
          Nume
          <input value={persoana.nume} onChange={(e) => setPersoana({ ...persoana, nume: e.target.value })} aria-invalid={!!erori.nume} className={`${camp} mt-1`} />
          {erori.nume && <span className="text-red-700">{erori.nume}</span>}
        </label>
        <label className={eticheta}>
          Email (aici ajunge confirmarea cu linkul întâlnirii)
          <input type="email" value={persoana.email} onChange={(e) => setPersoana({ ...persoana, email: e.target.value })} aria-invalid={!!erori.email} className={`${camp} mt-1`} />
          {erori.email && <span className="text-red-700">{erori.email}</span>}
        </label>
        <label className={eticheta}>
          Telefon (opțional)
          <input value={persoana.telefon} onChange={(e) => setPersoana({ ...persoana, telefon: e.target.value })} aria-invalid={!!erori.telefon} className={`${camp} mt-1`} />
          {erori.telefon && <span className="text-red-700">{erori.telefon}</span>}
        </label>
        <label className={eticheta}>
          Organizație
          <input value={persoana.organizatie} onChange={(e) => setPersoana({ ...persoana, organizatie: e.target.value })} className={`${camp} mt-1`} />
        </label>
      </div>
      <label className={`${eticheta} mt-3`}>
        Notă pentru întâlnire (agenda din Zoom sau din evenimentul tău Google, opțional; persoana nu o primește)
        <textarea value={persoana.mesaj} onChange={(e) => setPersoana({ ...persoana, mesaj: e.target.value })} rows={2} className={`${camp} mt-1 h-auto py-2`} />
      </label>

      <div className="mt-4 space-y-4 rounded-xl border border-line bg-panel p-4">
        <label className={`${eticheta} max-w-sm`}>
          Tip de întâlnire
          <select value={tipId} onChange={(e) => alegeTip(e.target.value)} className={`${camp} mt-1`}>
            {tipuri.map((t) => (
              <option key={t.id} value={t.id}>
                {t.titlu} ({t.durataMin} min)
              </option>
            ))}
          </select>
        </label>
        {tipuri.length === 0 && <p className="text-sm text-red-700">Nu ai niciun tip de întâlnire activ. Adaugă unul în tabul „Tipuri de întâlniri”.</p>}

        <label className={`${eticheta} max-w-xl`}>
          Link întâlnire (Zoom, Meet…): ajunge în emailul de confirmare
          <input type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" aria-invalid={!!erori.locatie} className={`${camp} mt-1`} />
          {erori.locatie && <span className="text-red-700">{erori.locatie}</span>}
          <span className="mt-1.5 flex flex-wrap items-center gap-2 font-normal">
            <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center rounded-lg border border-line bg-panel px-3 text-xs font-semibold text-brand-blue hover:bg-panel-2">
              Creează un link Google Meet ↗
            </a>
            <span>Se deschide Meet într-o filă nouă: copiază linkul (începe cu meet.google.com) și lipește-l aici.</span>
          </span>
          <span className="mt-1 block font-normal">
            {link.trim()
              ? "Se folosește linkul de mai sus pentru această programare."
              : date.google.conectat
                ? "Gol: se creează automat un link Google Meet unic pentru această programare."
                : date.zoomConfigurat
                  ? "Gol: se creează automat un link Zoom pentru această programare."
                  : "Gol: persoana primește confirmarea fără link. Lipește un link sau conectează Google Meet pentru linkuri automate."}
          </span>
        </label>

        <div>
          <p className={eticheta}>Ziua (doar zilele cu ore libere, luna aceasta și următoarea)</p>
          {zile === null ? (
            <p className="mt-1 text-sm text-muted">Se încarcă zilele libere…</p>
          ) : zile.length === 0 ? (
            <p className="mt-1 text-sm text-muted">Nicio zi liberă în perioada următoare. Verifică „Program disponibil” și „Zile libere”.</p>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {zile.slice(0, 45).map((d) => (
                <button key={d} type="button" aria-pressed={zi === d} onClick={() => alegeZi(d)} className={`h-8 rounded-lg px-3 text-xs font-semibold ${zi === d ? "bg-brand-blue text-white" : "border border-line text-ink hover:bg-panel-2"}`}>
                  {ziScurta(d)}
                </button>
              ))}
            </div>
          )}
        </div>

        {zi && (
          <div>
            <p className={eticheta}>Ora (ora României)</p>
            {incarca || ore === null ? (
              <p className="mt-1 text-sm text-muted">Se încarcă orele…</p>
            ) : ore.length === 0 ? (
              <p className="mt-1 text-sm text-muted">Nicio oră liberă în această zi.</p>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {ore.map((o) => (
                  <button key={o.startUtc} type="button" aria-pressed={ora === o.startUtc} onClick={() => setOra(o.startUtc)} className={`h-8 rounded-lg px-3 text-xs font-semibold tabular-nums ${ora === o.startUtc ? "bg-brand-green text-white" : "border border-line text-ink hover:bg-panel-2"}`}>
                    {o.ora}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending || !ora || !tipId} onClick={trimite} className="h-10 rounded-lg bg-brand-blue px-5 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Se programează…" : "Programează și trimite invitația"}
        </button>
        {ora && !pending && <p className="text-sm text-muted first-letter:uppercase">{dataOra(ora)}</p>}
        {mesaj && (
          <p role="alert" className="text-sm text-red-700">
            {mesaj.text}
          </p>
        )}
      </div>
    </div>
  );
}

const NOTE_GOOGLE: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: "Google Meet a fost conectat. De acum, fiecare programare primește automat un link Meet." },
  refuzat: { ok: false, text: "Nu ai acceptat permisiunile Google. Reia conectarea și acceptă accesul la Calendar." },
  eroare: { ok: false, text: "Conectarea Google nu a reușit. Încearcă din nou; dacă se repetă, verifică adresa de redirectare din Google Cloud (documentation/google-meet.md)." },
  neconfigurat: { ok: false, text: "Google nu e configurat încă în Vercel (GOOGLE_CLIENT_ID și GOOGLE_CLIENT_SECRET). Vezi documentation/google-meet.md." },
};

// Cum se obține linkul întâlnirii: Google Meet automat (contul Google conectat o dată), Zoom automat sau link lipit/fix.
function BannerLinkuri({ date, mesajGoogle }: { date: DateAdmin; mesajGoogle?: string }) {
  const g = date.google;
  const [deconectat, setDeconectat] = useState(false);
  const [pending, start] = useTransition();
  const nota = mesajGoogle ? NOTE_GOOGLE[mesajGoogle] : undefined;
  const conectat = g.conectat && !deconectat;
  const buton = "inline-flex h-8 items-center rounded-lg border border-line bg-panel px-3 text-xs font-semibold text-brand-blue hover:bg-panel-2 disabled:opacity-50";
  return (
    <div className="space-y-2">
      {nota && (
        <p role={nota.ok ? "status" : "alert"} className={`rounded-lg p-2.5 text-sm font-semibold ${nota.ok ? "bg-brand-green-soft text-brand-green" : "bg-red-50 text-red-800"}`}>
          {nota.text}
        </p>
      )}
      <div className={`rounded-xl border p-3.5 text-sm ${conectat || date.zoomConfigurat ? "border-brand-green bg-brand-green-soft text-ink" : "border-amber-300 bg-amber-50 text-amber-950"}`}>
        {conectat ? (
          <>
            <p>
              <strong>Google Meet e conectat{g.email ? ` (${g.email})` : ""}.</strong> Pentru fiecare programare se creează automat un link Meet unic, într-un eveniment privat din calendarul tău Google. Dacă programarea se anulează, evenimentul se șterge. Persoana primește linkul pe email de la Alexandrit.
            </p>
            <p className="mt-1 text-xs">La prima intrare, Meet poate cere gazdei să primească persoana în ședință: fii online la ora întâlnirii.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- route handler care redirecționează la Google: <Link> l-ar prefetcha */}
              <a href="/api/google/conectare" className={buton}>
                Reconectează
              </a>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (window.confirm("Deconectezi contul Google? Programările noi nu vor mai primi link Meet automat. Cele existente își păstrează linkurile.")) start(async () => { await deconecteazaGoogleAction(); setDeconectat(true); });
                }}
                className={buton}
              >
                Deconectează
              </button>
            </div>
          </>
        ) : date.zoomConfigurat ? (
          <p>
            <strong>Zoom e conectat.</strong> Pentru fiecare programare se creează automat o întâlnire Zoom, cu sală de așteptare, iar linkul ajunge pe email la persoană. Dacă o programare se anulează, se șterge și întâlnirea Zoom.
          </p>
        ) : (
          <>
            <p>
              <strong>Linkuri automate: neactivate.</strong> Acum lipești linkul întâlnirii (Zoom, Meet…) în câmpul „Link întâlnire” de mai jos, sau îl pui o dată pentru toate în „Tipuri de întâlniri”.
            </p>
            {g.configurat ? (
              <div className="mt-2">
                <p className="text-xs">Ca fiecare programare să primească singură un link Google Meet unic, conectează contul tău Google o singură dată.</p>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- route handler care redirecționează la Google: <Link> l-ar prefetcha */}
                <a href="/api/google/conectare" className={`${buton} mt-2`}>
                  Conectează Google Meet
                </a>
              </div>
            ) : (
              <p className="mt-1 text-xs">
                Ca fiecare programare să primească singură un link Google Meet unic: fișierul <code>documentation/google-meet.md</code> (o configurare unică în Google Cloud, apoi 2 variabile în Vercel: <code>GOOGLE_CLIENT_ID</code> și <code>GOOGLE_CLIENT_SECRET</code>). După aceea apare aici butonul „Conectează Google Meet”.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
