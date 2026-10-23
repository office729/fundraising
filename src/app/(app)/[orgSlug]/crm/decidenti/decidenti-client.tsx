"use client";

import { Check, ClipboardCopy, ExternalLink, Mail, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { stareTermen, vechime } from "@/lib/prospectare/afisare";
import { NUME_FURNIZOR, grupRol, type Furnizor } from "@/lib/prospectare/motor";
import { prenumeDin, sabloanePentru } from "@/lib/prospectare/sabloane";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { cautaDecidentiPentruFirma } from "../companii/[id]/prospectare-actions";
import { aprobaInLotAction, pasUrmarireAction, type DateCautareMasa, type DateCoada, type DateDeAprobat, type RandCoada } from "./actions";

const MAX_IN_LOT = 25;
const MAX_CAUTARE_MASA = 15;
const APELURI_ESTIMATE_PER_FIRMA = 5; // căutare la 1–2 instrumente, e-mail pentru primii aleși, verificare

// ============================================================================
// De contactat azi
// ============================================================================

function Sabloane({ r, ong, semnatura }: { r: RandCoada; ong: string; semnatura: string }) {
  const [tab, setTab] = useState<"email" | "linkedin" | "follow">("email");
  const [copiat, setCopiat] = useState<string | null>(null);
  const grup = grupRol(r.prioritate);
  const s = sabloanePentru(grup === "hr" ? "altul" : grup, { prenume: prenumeDin(r.nume), firma: r.firma, rol: r.rol, ong, semnatura });
  const text = tab === "email" ? s.email.corp : tab === "linkedin" ? s.linkedin : s.followUp;
  const copiaza = async (cheie: string, valoare: string) => {
    try {
      await navigator.clipboard.writeText(valoare);
      setCopiat(cheie);
      setTimeout(() => setCopiat(null), 2500);
    } catch {
      setCopiat("eroare");
    }
  };
  return (
    <div className="mt-3 rounded-lg bg-[var(--ci-surface-2)] p-3">
      <p className="text-xs font-semibold text-[var(--ci-text)]">{s.titlu}</p>
      <p className="mt-0.5 text-xs text-[var(--ci-text-muted)]">Ciornă de adaptat înainte de trimitere (sume, termene, mecanismul fiscal se verifică cu contabilul organizației). Primul e-mail conține informarea art. 14 GDPR.</p>
      <div role="tablist" aria-label="Tipul mesajului" className="mt-2 flex flex-wrap gap-1.5">
        {(
          [
            ["email", "Primul e-mail"],
            ["linkedin", "Cerere LinkedIn"],
            ["follow", "Follow-up (după 3–4 zile)"],
          ] as const
        ).map(([k, eticheta]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={`min-h-9 rounded-md border px-3 text-xs font-medium ${tab === k ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary-hover)]" : "border-[var(--ci-border)] bg-[var(--ci-surface)] text-[var(--ci-text-muted)]"}`}>
            {eticheta}
          </button>
        ))}
      </div>
      {tab === "email" && <p className="mt-2 text-xs text-[var(--ci-text-muted)]">Subiect: <strong className="text-[var(--ci-text)]">{s.email.subiect}</strong></p>}
      <textarea readOnly value={text} rows={tab === "email" ? 14 : 6} aria-label="Textul mesajului" className="mt-2 w-full rounded-md border border-[var(--ci-border)] bg-[var(--ci-surface)] p-2 text-[13px] leading-relaxed text-[var(--ci-text)]" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="sm" className="min-h-10" onClick={() => copiaza("corp", text)}>
          <ClipboardCopy className="h-4 w-4" aria-hidden /> Copiază mesajul
        </Button>
        {tab === "email" && (
          <Button size="sm" className="min-h-10" onClick={() => copiaza("subiect", s.email.subiect)}>
            Copiază subiectul
          </Button>
        )}
        {tab === "email" && r.email && (
          <a href={`mailto:${r.email}?subject=${encodeURIComponent(s.email.subiect)}&body=${encodeURIComponent(s.email.corp)}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 text-[13px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
            <Mail className="h-4 w-4" aria-hidden /> Deschide în programul de e-mail
          </a>
        )}
        <span role="status" className="text-xs text-[var(--ci-text-muted)]">
          {copiat === "eroare" ? "Nu am putut copia; selectează textul manual." : copiat ? "Copiat." : ""}
        </span>
      </div>
    </div>
  );
}

export function CoadaAzi({ orgSlug, date, toate }: { orgSlug: string; date: DateCoada; toate: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [eroare, setEroare] = useState<string | null>(null);
  const [notita, setNotita] = useState<string | null>(null);
  const [deschis, setDeschis] = useState<string | null>(null);
  const [deInchis, setDeInchis] = useState<string | null>(null);
  const scadente = date.rows.filter((r) => !r.urmatorPasLa || r.urmatorPasLa <= date.azi);
  const programate = date.rows.filter((r) => r.urmatorPasLa && r.urmatorPasLa > date.azi);

  const pas = (r: RandCoada, p: "contactat" | "raspuns" | "inchis" | "preia", mesaj: string) =>
    startTransition(async () => {
      setEroare(null);
      setNotita(null);
      const x = await pasUrmarireAction(orgSlug, r.id, p);
      if (x.error) setEroare(x.error);
      else setNotita(mesaj);
      setDeInchis(null);
      router.refresh();
    });

  const Rand = ({ r }: { r: RandCoada }) => {
    const termen = stareTermen(r.urmatorPasLa, date.azi);
    return (
      <li className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[var(--ci-text)]">
              {r.nume}
              {r.rol && <span className="font-normal text-[var(--ci-text-muted)]"> · {r.rol}</span>}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--ci-text-muted)]">
              <Link href={`/${orgSlug}/crm/companii/${r.companyId}`} className="font-medium text-[var(--ci-blue)] underline-offset-2 hover:underline">
                {r.firma}
              </Link>
              {r.eticheta && (
                <Badge tone="green" icon={false}>
                  {r.eticheta}
                </Badge>
              )}
              {r.email ? <span>{r.email}</span> : <span>{r.linkedin ? "fără e-mail" : "fără date de contact"}</span>}
              {r.linkedin && (
                <a href={r.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[var(--ci-blue)] underline-offset-2 hover:underline">
                  LinkedIn <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              )}
              <span>{r.nrAtingeri === 0 ? "nicio atingere încă" : `${r.nrAtingeri} ${r.nrAtingeri === 1 ? "atingere" : "atingeri"}`}</span>
              {toate && <span>responsabil: {r.responsabil ?? "—"}</span>}
              {termen && (
                <Badge tone={termen.intarziat ? "red" : termen.text === "azi" ? "amber" : "neutral"} icon={false}>
                  {r.stadiu === "contactat" ? "urmărire" : "primul contact"}: {termen.text}
                </Badge>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!r.responsabil && !r.esteAlMeu ? (
              <Button className="min-h-10" disabled={pending} onClick={() => pas(r, "preia", `Ai preluat-o pe ${r.nume}.`)}>
                Preia
              </Button>
            ) : null}
            <Button variant="primary" className="min-h-10" disabled={pending} aria-label={`Am contactat-o pe ${r.nume}`} onClick={() => pas(r, "contactat", `${r.nume}: marcat contactat. Următorul pas peste 4 zile lucrătoare.`)}>
              <Check className="h-4 w-4" aria-hidden /> Contactat
            </Button>
            <Button className="min-h-10" disabled={pending} aria-label={`${r.nume} a răspuns`} onClick={() => pas(r, "raspuns", `${r.nume} a răspuns: o scoatem din coadă. Continuă discuția din fișa firmei.`)}>
              A răspuns
            </Button>
            <Button variant="ghost" className="min-h-10" aria-expanded={deschis === r.id} onClick={() => setDeschis(deschis === r.id ? null : r.id)}>
              Mesaj gata
            </Button>
          </div>
        </div>
        {deschis === r.id && <Sabloane r={r} ong={date.ong} semnatura={date.semnatura} />}
        {deInchis === r.id ? (
          <div role="alertdialog" aria-label={`Închide urmărirea pentru ${r.nume}`} className="mt-2 rounded-md bg-[var(--ci-surface-2)] p-3 text-[13px] text-[var(--ci-text)]">
            <p>Închizi urmărirea pentru {r.nume}? Dispare din coadă; contactul rămâne în fișa firmei.</p>
            <div className="mt-2 flex gap-2">
              <Button variant="danger" size="sm" className="min-h-10" disabled={pending} onClick={() => pas(r, "inchis", `Urmărirea pentru ${r.nume} a fost închisă.`)}>
                Închide urmărirea
              </Button>
              <Button size="sm" className="min-h-10" onClick={() => setDeInchis(null)}>
                Renunță
              </Button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setDeInchis(r.id)} className="mt-1 min-h-8 text-xs text-[var(--ci-text-muted)] underline underline-offset-2 hover:text-[var(--ci-text)]">
            Nu mai urmăresc
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-[var(--ci-text-muted)]">Persoanele aprobate, cu primul contact sau urmărirea cu termen. Ce e scadent apare primul.</p>
        <Link href={`/${orgSlug}/crm/decidenti${toate ? "" : "?al=toate"}`} className="inline-flex min-h-10 items-center rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-[13px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
          {toate ? "Arată doar ale mele" : "Arată toată echipa"}
        </Link>
      </div>
      {eroare && (
        <p role="alert" className="rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[#9b1c1c]">
          {eroare}
        </p>
      )}
      {notita && (
        <p role="status" className="rounded-lg bg-[var(--ci-green-soft)] px-3 py-2 text-[13px] text-[#17602f]">
          {notita}
        </p>
      )}
      {date.rows.length === 0 ? (
        <Card>
          <p className="text-center text-[13px] text-[var(--ci-text-muted)]">
            Nimeni de contactat acum. Persoanele apar aici după ce le aprobi din „De aprobat” sau de pe fișa unei firme ({toate ? "toată echipa" : "ale tale"}).
          </p>
        </Card>
      ) : (
        <>
          <section aria-label="De contactat azi">
            <h2 className="mb-2 text-[13px] font-semibold text-[var(--ci-text)]">De făcut azi și întârziate ({scadente.length})</h2>
            {scadente.length === 0 ? <p className="text-[13px] text-[var(--ci-text-muted)]">Nimic scadent azi.</p> : <ul className="space-y-2">{scadente.map((r) => <Rand key={r.id} r={r} />)}</ul>}
          </section>
          {programate.length > 0 && (
            <section aria-label="Programate">
              <h2 className="mb-2 text-[13px] font-semibold text-[var(--ci-text)]">Programate ({programate.length})</h2>
              <ul className="space-y-2">{programate.map((r) => <Rand key={r.id} r={r} />)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// De aprobat (toate firmele)
// ============================================================================

export function DeAprobatGlobal({ orgSlug, date }: { orgSlug: string; date: DateDeAprobat }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectate, setSelectate] = useState<Set<string>>(new Set());
  const [trimiteWaalaxy, setTrimiteWaalaxy] = useState(false);
  const [confirma, setConfirma] = useState(false);
  const [mesaj, setMesaj] = useState<{ tip: "ok" | "eroare"; text: string; extra: string[] } | null>(null);

  const alterna = (id: string) =>
    setSelectate((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else if (n.size < MAX_IN_LOT) n.add(id);
      return n;
    });
  const sigure = date.rows.filter((r) => r.scor >= 90 && r.emailStatus === "valid").slice(0, MAX_IN_LOT);

  const aproba = () =>
    startTransition(async () => {
      setConfirma(false);
      const r = await aprobaInLotAction(orgSlug, [...selectate], trimiteWaalaxy);
      setSelectate(new Set());
      setMesaj({
        tip: r.aprobati > 0 || r.erori.length === 0 ? "ok" : "eroare",
        text: `${r.aprobati} ${r.aprobati === 1 ? "persoană adăugată" : "persoane adăugate"} la contacte${r.aprobati > 0 ? ". Le găsești în „De contactat azi”, cu primul contact în 2 zile lucrătoare. Informează-le despre prelucrarea datelor (art. 14 GDPR)." : "."}`,
        extra: [...r.erori, ...r.avertismente],
      });
      router.refresh();
    });

  if (date.rows.length === 0) {
    return (
      <Card>
        <p className="text-center text-[13px] text-[var(--ci-text-muted)]">Nicio persoană de aprobat. Caută decidenți pe fișa unei firme sau din „Căutare în masă”.</p>
      </Card>
    );
  }
  const nSel = selectate.size;
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--ci-text-muted)]">Persoanele propuse de la toate firmele, cele mai probabile decidente primele. Poți aproba până la {MAX_IN_LOT} odată.</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="min-h-10" onClick={() => setSelectate(new Set(sigure.map((r) => r.id)))} disabled={sigure.length === 0}>
          Selectează cele sigure ({sigure.length}): rol clar și e-mail verificat
        </Button>
        <Button size="sm" className="min-h-10" onClick={() => setSelectate(new Set())} disabled={nSel === 0}>
          Deselectează
        </Button>
        {date.waalaxyGata && (
          <label className="flex min-h-10 items-center gap-2 text-xs text-[var(--ci-text-muted)]">
            <input type="checkbox" className="h-4 w-4" checked={trimiteWaalaxy} onChange={(e) => setTrimiteWaalaxy(e.target.checked)} />
            Trimite în Waalaxy cele cu LinkedIn
          </label>
        )}
        <Button variant="primary" className="min-h-10" disabled={nSel === 0 || pending} onClick={() => setConfirma(true)}>
          Adaugă la contacte ({nSel})
        </Button>
      </div>
      {confirma && (
        <div role="alertdialog" aria-label="Confirmă adăugarea" className="rounded-lg bg-[var(--ci-surface-2)] p-3 text-[13px] text-[var(--ci-text)]">
          <p>
            Adaugi {nSel} {nSel === 1 ? "persoană" : "persoane"} la contacte? Fiecare primește un responsabil (tu) și un prim contact în 2 zile lucrătoare{trimiteWaalaxy ? "; cele cu LinkedIn sunt trimise și în Waalaxy" : ""}. Datele lor vin de la terți: informează-le despre prelucrare în cel mult 30 de zile.
          </p>
          <div className="mt-2 flex gap-2">
            <Button variant="primary" size="sm" className="min-h-10" onClick={aproba} disabled={pending}>
              Confirmă
            </Button>
            <Button size="sm" className="min-h-10" onClick={() => setConfirma(false)}>
              Renunță
            </Button>
          </div>
        </div>
      )}
      {mesaj && (
        <div role={mesaj.tip === "ok" ? "status" : "alert"} className={`rounded-lg px-3 py-2 text-[13px] ${mesaj.tip === "ok" ? "bg-[var(--ci-green-soft)] text-[#17602f]" : "bg-[var(--ci-red-soft)] text-[#9b1c1c]"}`}>
          <p>{mesaj.text}</p>
          {mesaj.extra.length > 0 && (
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {mesaj.extra.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <ul className="space-y-2" aria-busy={pending}>
        {date.rows.map((r) => (
          <li key={r.id} className="flex items-start gap-3 rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3">
            <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={selectate.has(r.id)} onChange={() => alterna(r.id)} aria-label={`Selectează ${r.nume}, ${r.firma}`} />
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[var(--ci-text)]">
                {r.nume}
                {r.rol && <span className="font-normal text-[var(--ci-text-muted)]"> · {r.rol}</span>}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--ci-text-muted)]">
                <Link href={`/${orgSlug}/crm/companii/${r.companyId}`} className="font-medium text-[var(--ci-blue)] underline-offset-2 hover:underline">
                  {r.firma}
                </Link>
                {r.eticheta && (
                  <Badge tone="green" icon={false}>
                    {r.eticheta}
                  </Badge>
                )}
                <Badge tone="blue" icon={false}>
                  {NUME_FURNIZOR[r.sursa as Furnizor] ?? r.sursa}
                </Badge>
                {r.email ? (
                  <span>
                    {r.email}{" "}
                    {r.emailStatus === "valid" && (
                      <Badge tone="green" icon={false}>
                        e-mail verificat
                      </Badge>
                    )}
                    {r.emailStatus === "risky" && (
                      <Badge tone="amber" icon={false}>
                        e-mail riscant
                      </Badge>
                    )}
                  </span>
                ) : (
                  <span>{r.linkedin ? "fără e-mail" : "fără date de contact"}</span>
                )}
                <span>găsit {vechime(r.gasitLa)}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Căutare în masă
// ============================================================================

type StareFirma = "asteapta" | "cauta" | "gata" | "sarita" | "eroare";
type ProgresFirma = { stare: StareFirma; text: string };

export function CautareMasa({ orgSlug, date, benzi }: { orgSlug: string; date: DateCautareMasa; benzi: "A" | "AB" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const maxPosibil = Math.min(MAX_CAUTARE_MASA, date.firme.length, Math.floor(date.ramaseAzi / APELURI_ESTIMATE_PER_FIRMA));
  const [selectate, setSelectate] = useState<Set<string>>(new Set(date.firme.slice(0, Math.max(0, Math.min(10, maxPosibil))).map((f) => f.id)));
  const [confirma, setConfirma] = useState(false);
  const [progres, setProgres] = useState<Record<string, ProgresFirma>>({});
  const [ruleaza, setRuleaza] = useState(false);
  const [sfarsit, setSfarsit] = useState<string | null>(null);
  const opreste = useRef(false);

  const alterna = (id: string) =>
    setSelectate((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else if (n.size < MAX_CAUTARE_MASA) n.add(id);
      return n;
    });

  const porneste = () =>
    startTransition(async () => {
      setConfirma(false);
      setRuleaza(true);
      setSfarsit(null);
      opreste.current = false;
      const ordine = date.firme.filter((f) => selectate.has(f.id));
      setProgres(Object.fromEntries(ordine.map((f) => [f.id, { stare: "asteapta" as StareFirma, text: "în așteptare" }])));
      let gasiti = 0;
      let motivOprire: string | null = null;
      for (const f of ordine) {
        if (opreste.current) {
          motivOprire = "Ai oprit căutarea.";
          break;
        }
        setProgres((p) => ({ ...p, [f.id]: { stare: "cauta", text: "se caută…" } }));
        const r = await cautaDecidentiPentruFirma(orgSlug, f.id, false);
        if (!r.ok) {
          const limita = /Limita zilnică|nicio cheie/i.test(r.eroare ?? "");
          setProgres((p) => ({ ...p, [f.id]: { stare: r.deja ? "sarita" : "eroare", text: r.deja ? "căutată recent, sărită" : (r.eroare ?? "căutarea nu a reușit") } }));
          if (limita) {
            motivOprire = r.eroare ?? "Limita a fost atinsă.";
            break;
          }
          continue;
        }
        const noi = r.noi ?? 0;
        gasiti += noi;
        const esuata = noi === 0 && (r.gasiti ?? 0) === 0 && (r.avertismente?.length ?? 0) > 0;
        setProgres((p) => ({ ...p, [f.id]: { stare: esuata ? "eroare" : "gata", text: esuata ? (r.avertismente?.[0] ?? "căutarea n-a putut fi făcută complet") : noi > 0 ? `${noi} ${noi === 1 ? "persoană găsită" : "persoane găsite"}` : "nimeni nou" } }));
        if (r.avertismente?.some((a) => /Limita zilnică/.test(a))) {
          motivOprire = "Limita zilnică de apeluri a fost atinsă; continuă mâine.";
          break;
        }
      }
      setRuleaza(false);
      setSfarsit(`${motivOprire ? `${motivOprire} ` : ""}${gasiti} ${gasiti === 1 ? "persoană găsită" : "persoane găsite"} în total, în „De aprobat”.`);
      router.refresh();
    });

  if (!date.areChei) {
    return (
      <Card>
        <p className="text-[13px] text-[var(--ci-text-muted)]">Pentru căutare ai nevoie de cel puțin un instrument conectat (Apollo, Prospeo, Hunter sau Lusha). Un administrator le adaugă în Setări → Prospectare.</p>
      </Card>
    );
  }
  const nSel = selectate.size;
  const estimare = nSel * APELURI_ESTIMATE_PER_FIRMA;
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--ci-text-muted)]">
        Firmele eligibile D177 din {benzi === "A" ? "banda A (abordabile acum)" : "benzile A și B"} care nu au fost căutate încă. Căutarea merge firmă cu firmă, cu aceleași reguli ca pe fișa firmei: începe cu instrumentele gratuite sau ieftine și plătește e-mailul doar pentru primele persoane.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/${orgSlug}/crm/decidenti?tab=masa&benzi=${benzi === "A" ? "AB" : "A"}`} className="inline-flex min-h-10 items-center rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-[13px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
          {benzi === "A" ? "Include și banda B" : "Doar banda A"}
        </Link>
        <p className="text-xs text-[var(--ci-text-muted)]">
          Azi mai ai {date.ramaseAzi} din {date.limita} apeluri. O firmă folosește de regulă ~{APELURI_ESTIMATE_PER_FIRMA}, deci ajung pentru ~{Math.floor(date.ramaseAzi / APELURI_ESTIMATE_PER_FIRMA)} firme.
        </p>
      </div>

      {date.firme.length === 0 ? (
        <Card>
          <p className="text-center text-[13px] text-[var(--ci-text-muted)]">Nicio firmă de căutat: toate firmele eligibile din aceste benzi au fost deja căutate sau n-ai firme eligibile D177 în CRM.</p>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" className="min-h-10" disabled={nSel === 0 || ruleaza || pending || nSel * APELURI_ESTIMATE_PER_FIRMA > date.ramaseAzi + APELURI_ESTIMATE_PER_FIRMA} onClick={() => setConfirma(true)}>
              <Search className="h-4 w-4" aria-hidden /> Caută decidenți la {nSel} {nSel === 1 ? "firmă" : "firme"} (≈ {estimare} apeluri)
            </Button>
            {ruleaza && (
              <Button className="min-h-10" onClick={() => (opreste.current = true)}>
                Oprește după firma curentă
              </Button>
            )}
            <span className="text-xs text-[var(--ci-text-muted)]">Maximum {MAX_CAUTARE_MASA} firme odată.</span>
          </div>
          {confirma && (
            <div role="alertdialog" aria-label="Confirmă căutarea în masă" className="rounded-lg bg-[var(--ci-amber-soft)] p-3 text-[13px] text-[#7a3e00]">
              <p>
                Cauți decidenți la {nSel} firme? Se consumă credite din conturile tale (≈ {estimare} apeluri, unele gratuite). Poți opri oricând; ce s-a găsit până atunci rămâne în „De aprobat”. Lasă pagina deschisă cât durează.
              </p>
              <div className="mt-2 flex gap-2">
                <Button variant="primary" size="sm" className="min-h-10" onClick={porneste}>
                  Pornește
                </Button>
                <Button size="sm" className="min-h-10" onClick={() => setConfirma(false)}>
                  Renunță
                </Button>
              </div>
            </div>
          )}
          {sfarsit && (
            <p role="status" className="rounded-lg bg-[var(--ci-surface-2)] px-3 py-2 text-[13px] text-[var(--ci-text)]">
              {sfarsit}{" "}
              <Link href={`/${orgSlug}/crm/decidenti?tab=aprobare`} className="font-medium text-[var(--ci-blue)] underline">
                Vezi persoanele de aprobat
              </Link>
            </p>
          )}
          <ul className="space-y-1.5" aria-busy={ruleaza}>
            {date.firme.map((f) => {
              const p = progres[f.id];
              return (
                <li key={f.id} className="flex items-center gap-3 rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2">
                  <input type="checkbox" className="h-4 w-4 shrink-0" checked={selectate.has(f.id)} disabled={ruleaza} onChange={() => alterna(f.id)} aria-label={`Selectează ${f.nume}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-[var(--ci-text)]">{f.nume}</p>
                    <p className="text-xs text-[var(--ci-text-muted)]">
                      Banda {f.banda}
                      {f.sumaDisponibila ? ` · potențial ${new Intl.NumberFormat("ro-RO").format(f.sumaDisponibila)} lei` : ""}
                      {f.angajati ? ` · ${f.angajati} angajați` : ""}
                    </p>
                  </div>
                  {p && (
                    <span className={`text-xs ${p.stare === "eroare" ? "text-[#9b1c1c]" : p.stare === "gata" ? "text-[#17602f]" : "text-[var(--ci-text-muted)]"}`} role={p.stare === "eroare" ? "alert" : undefined}>
                      {p.text}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
