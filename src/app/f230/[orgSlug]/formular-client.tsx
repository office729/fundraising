"use client";

import { useRef, useState, type CSSProperties } from "react";

import { culoareTextPeFundal } from "@/lib/culoare-text";
import type { DateBeneficiarPdf } from "@/lib/formular230-pdf";
import { JUDETE } from "@/lib/judete";

import { NotaInformare230 } from "./nota-informare";

type Camp =
  | "nume" | "prenume" | "initialaTatalui" | "cnp" | "email" | "telefon"
  | "strada" | "numar" | "judet" | "localitate" | "codPostal" | "bloc" | "scara" | "etaj" | "apartament";

const CAMPURI: { key: Camp; label: string; obligatoriu?: boolean; tip?: string; select?: boolean; grup: "identitate" | "adresa" }[] = [
  { key: "nume", label: "Nume", obligatoriu: true, grup: "identitate" },
  { key: "prenume", label: "Prenume", obligatoriu: true, grup: "identitate" },
  { key: "initialaTatalui", label: "Inițiala tatălui", grup: "identitate" },
  { key: "cnp", label: "CNP", obligatoriu: true, grup: "identitate" },
  { key: "email", label: "Email", obligatoriu: true, tip: "email", grup: "identitate" },
  { key: "telefon", label: "Telefon", obligatoriu: true, grup: "identitate" },
  { key: "strada", label: "Strada", obligatoriu: true, grup: "adresa" },
  { key: "numar", label: "Număr", obligatoriu: true, grup: "adresa" },
  // Dropdown (nu text liber) — normalizarea numelui de județ e ce face
  // posibile filtrul pe județ și harta din panoul de administrare.
  { key: "judet", label: "Județ", obligatoriu: true, select: true, grup: "adresa" },
  { key: "localitate", label: "Localitate", obligatoriu: true, grup: "adresa" },
  { key: "codPostal", label: "Cod poștal", obligatoriu: true, grup: "adresa" },
  { key: "bloc", label: "Bloc", grup: "adresa" },
  { key: "scara", label: "Scara", grup: "adresa" },
  { key: "etaj", label: "Etaj", grup: "adresa" },
  { key: "apartament", label: "Apartament", grup: "adresa" },
];

const INITIAL: Record<Camp, string> = {
  nume: "", prenume: "", initialaTatalui: "", cnp: "", email: "", telefon: "",
  strada: "", numar: "", judet: "", localitate: "", codPostal: "", bloc: "", scara: "", etaj: "", apartament: "",
};

export function Formular230Client({
  orgSlug,
  beneficiarSlug,
  orgName,
  brandColor,
  beneficiar,
  cauze = [],
}: {
  orgSlug: string;
  beneficiarSlug: string;
  orgName: string;
  brandColor: string | null;
  beneficiar: DateBeneficiarPdf;
  // Cauzele susținute acum (campaniile active ale organizației), cel mult 4: apar sus, înainte de formular.
  cauze?: { titlu: string; judet: string | null; href: string }[];
}) {
  const [date, setDate] = useState<Record<Camp, string>>(INITIAL);
  const [distributie2Ani, setDistributie2Ani] = useState(false);
  const [consimtamant, setConsimtamant] = useState(false);
  const [termeni, setTermeni] = useState(false);
  const [semnatura, setSemnatura] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [seTrimite, setSeTrimite] = useState(false);
  const [seDescarca, setSeDescarca] = useState(false);
  const [eroare, setEroare] = useState("");
  const [trimis, setTrimis] = useState(false);
  // Anul returnat de server la trimitere — vezi coloana `an` din
  // formular230Submissions (fixat atunci, nu recalculat la fiecare descărcare).
  const [anTrimitere, setAnTrimitere] = useState<number>(() => new Date().getFullYear());

  const accent = brandColor || "#154A85";

  function setCamp(k: Camp, v: string) {
    setDate((d) => ({ ...d, [k]: v }));
  }

  async function trimite(e: React.FormEvent) {
    e.preventDefault();
    setEroare("");
    if (!consimtamant || !termeni) {
      setEroare("Trebuie să bifezi acordul de mai jos pentru a trimite formularul.");
      return;
    }
    if (!/^\d{13}$/.test(date.cnp.trim())) {
      setEroare("CNP-ul trebuie să aibă exact 13 cifre.");
      return;
    }
    if (!semnatura) {
      setEroare("Semnează olograf mai jos (cu mouse-ul sau cu degetul) înainte de a trimite.");
      return;
    }
    setSeTrimite(true);
    try {
      const res = await fetch(`/api/${orgSlug}/formular230/${beneficiarSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...date, distributie2Ani, consimtamant, termeni, semnatura, website }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setEroare(
          body.error === "cnp_invalid"
            ? "CNP-ul introdus nu e valid."
            : body.error === "campuri_obligatorii_lipsa"
              ? "Completează toate câmpurile obligatorii."
              : body.error === "semnatura_lipsa"
                ? "Semnătura lipsește — desenează-o mai jos înainte de a trimite."
                : body.error === "prea_multe_cereri"
                  ? "Prea multe trimiteri de pe această conexiune — încearcă din nou peste o oră."
                  : "Nu am putut trimite formularul — încearcă din nou.",
        );
        return;
      }
      const rezultat = await res.json().catch(() => null);
      if (typeof rezultat?.an === "number") setAnTrimitere(rezultat.an);
      setTrimis(true);
    } catch {
      setEroare("Nu am putut trimite formularul — verifică conexiunea și încearcă din nou.");
    } finally {
      setSeTrimite(false);
    }
  }

  async function descarcaPdf() {
    setSeDescarca(true);
    try {
      // pdf-lib + fontkit sunt grei de mari (~0,5–1 MB): se încarcă doar la descărcare, nu la deschiderea paginii.
      const { completeazaFormular230Pdf, downloadPdfBytes } = await import("@/lib/formular230-pdf");
      const bytes = await completeazaFormular230Pdf({ ...date, semnatura, an: anTrimitere }, beneficiar);
      downloadPdfBytes(bytes, `Formular 230 - ${date.nume} ${date.prenume}.pdf`);
    } finally {
      setSeDescarca(false);
    }
  }

  if (trimis) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: `${accent}1a`, color: accent }}>
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">Mulțumim, {date.prenume} {date.nume}!</h1>
        <p className="mt-2 text-sm text-muted">
          Formularul 230 pentru <strong className="text-ink">{orgName}</strong> a fost înregistrat cu succes.
        </p>
        <button
          onClick={descarcaPdf}
          disabled={seDescarca}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: accent, color: culoareTextPeFundal(accent) }}
        >
          {seDescarca ? "Se generează…" : "Descarcă formularul completat (PDF)"}
        </button>
        <p className="mt-3 text-xs text-muted-2">Exact formularul 230 oficial, cu datele tale și semnătura completate.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">Formularul 230</p>
        <h1 className="font-display mt-1 text-2xl font-bold text-ink">
          Redirecționează 3,5% din impozit către <span className="org-nume-brand" style={{ "--org-accent": accent } as CSSProperties}>{orgName}</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Nu te costă nimic — banii sunt oricum reținuți din salariu de stat. Completezi o dată, ANAF face restul.
        </p>
      </div>

      {cauze.length > 0 && (
        <section aria-labelledby="cauze-230" className="mb-6 rounded-2xl border border-line bg-panel p-5 shadow-sm">
          <h2 id="cauze-230" className="font-display text-base font-bold text-ink">
            Cauzele pe care le susținem acum
          </h2>
          <p className="mt-1 text-[13px] text-muted">Prin {orgName}, redirecționarea ta ajută oameni și proiecte ca acestea:</p>
          <ul className="mt-3 divide-y divide-line">
            {cauze.map((c) => (
              <li key={c.href} className="flex items-center gap-3 py-2.5">
                <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px]" style={{ background: `${accent}1a`, color: accent }}>♥</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{c.titlu}</p>
                  {c.judet && <p className="text-xs text-muted-2">{c.judet}</p>}
                </div>
                <a href={c.href} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold hover:underline" style={{ color: accent }}>
                  Vezi campania
                  <span className="sr-only"> {c.titlu} (se deschide în filă nouă)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form onSubmit={trimite} className="space-y-6 rounded-2xl border border-line bg-panel p-6 shadow-sm">
        <input
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />

        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-ink">Date de identificare</legend>
          <div className="grid grid-cols-2 gap-3">
            {CAMPURI.filter((c) => c.grup === "identitate").map((c) => (
              <Field key={c.key} campo={c} value={date[c.key]} onChange={(v) => setCamp(c.key, v)} />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-ink">Adresă de domiciliu</legend>
          <div className="grid grid-cols-2 gap-3">
            {CAMPURI.filter((c) => c.grup === "adresa").map((c) => (
              <Field key={c.key} campo={c} value={date[c.key]} onChange={(v) => setCamp(c.key, v)} />
            ))}
          </div>
        </fieldset>

        <NotaInformare230 orgName={orgName} beneficiarNume={beneficiar.nume} beneficiarCif={beneficiar.cif} />

        <label className="flex items-start gap-2.5 text-sm text-ink">
          <input type="checkbox" checked={distributie2Ani} onChange={(e) => setDistributie2Ani(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line" />
          Sunt de acord ca susținerea să fie valabilă pentru o perioadă de 2 ani (altfel, doar anul curent).
        </label>
        <label className="flex items-start gap-2.5 text-sm text-ink">
          <input type="checkbox" checked={consimtamant} onChange={(e) => setConsimtamant(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line" />
          Am citit Nota de informare de mai sus și sunt de acord ca datele mele să fie folosite EXCLUSIV pentru completarea și depunerea Formularului 230. *
        </label>
        <label className="flex items-start gap-2.5 text-sm text-ink">
          <input type="checkbox" checked={termeni} onChange={(e) => setTermeni(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line" />
          Declar pe propria răspundere că datele completate sunt corecte. *
        </label>

        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink">Semnătură olografă *</p>
          <SignaturePad value={semnatura} onChange={setSemnatura} />
        </div>

        {eroare && <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{eroare}</p>}

        <button
          type="submit"
          disabled={seTrimite}
          className="flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: accent, color: culoareTextPeFundal(accent) }}
        >
          {seTrimite ? "Se trimite…" : "Trimite formularul"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-2">
        Formular securizat — datele ajung direct la {orgName}, nu sunt vizibile public.
      </p>
    </main>
  );
}

// Câmpurile cu text lung (CNP, email, telefon, adresă) ocupă tot rândul pe mobil; cele scurte (număr, bloc, scară, cod poștal…) rămân câte două.
const LATE_PE_MOBIL = new Set<Camp>(["nume", "prenume", "cnp", "email", "telefon", "strada", "localitate", "judet"]);

// Tastatura potrivită pe telefon (numerică pentru CNP și cod poștal). Fără maxLength: un CNP lipit cu spații nu trebuie trunchiat.
const INPUT_MODE: Partial<Record<Camp, "numeric" | "tel">> = {
  cnp: "numeric",
  codPostal: "numeric",
  telefon: "tel",
};

const AUTOCOMPLETE: Partial<Record<Camp, string>> = {
  // CNP-ul nu trebuie salvat în completarea automată a browserului.
  cnp: "off",
  nume: "family-name",
  prenume: "given-name",
  email: "email",
  telefon: "tel",
  strada: "address-line1",
  localitate: "address-level2",
  codPostal: "postal-code",
};

function Field({
  campo,
  value,
  onChange,
}: {
  campo: { key: Camp; label: string; obligatoriu?: boolean; tip?: string; select?: boolean };
  value: string;
  onChange: (v: string) => void;
}) {
  const className = "mt-1 h-9 w-full rounded-lg border border-line bg-canvas px-3 text-base text-ink focus:border-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue sm:text-sm";
  // Completare automată a browserului (și evită zoom-ul iOS la focus, cu text de minim 16px pe mobil).
  const autoComplete = AUTOCOMPLETE[campo.key];
  return (
    <label className={`block text-xs font-medium text-muted ${LATE_PE_MOBIL.has(campo.key) ? "col-span-2 sm:col-span-1" : ""}`}>
      {campo.label}
      {campo.obligatoriu && " *"}
      {campo.select ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} required={campo.obligatoriu} className={className}>
          <option value="" disabled>
            — alege —
          </option>
          {JUDETE.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={campo.tip ?? "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={campo.obligatoriu}
          autoComplete={autoComplete}
          inputMode={INPUT_MODE[campo.key]}
          className={className}
        />
      )}
    </label>
  );
}

function SignaturePad({ value, onChange }: { value: string; onChange: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const initedRef = useRef(false);
  // true doar dacă s-a tras efectiv o linie: un simplu tap nu trebuie să conteze drept semnătură.
  const areCerneala = useRef(false);

  function ctxPregatit() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    if (!initedRef.current) {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * ratio;
      canvas.height = canvas.clientHeight * ratio;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(ratio, ratio);
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#111827";
      }
      initedRef.current = true;
    }
    return canvas.getContext("2d");
  }

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = ctxPregatit();
    if (!ctx) return;
    drawingRef.current = true;
    areCerneala.current = false;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    areCerneala.current = true;
  }

  function end() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas && areCerneala.current) onChange(canvas.toDataURL("image/png"));
  }

  function sterge() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="h-36 w-full touch-none rounded-lg border border-line bg-white"
      />
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-xs text-muted-2">{value ? "Semnătură înregistrată." : "Semnează cu mouse-ul sau cu degetul, aici sus."}</span>
        <button type="button" onClick={sterge} className="text-xs font-medium text-muted underline">Șterge</button>
      </div>
    </div>
  );
}
