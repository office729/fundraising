"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { sugereazaServere } from "@/lib/agent-email/retea";
import { AGENT_EMAIL_SETARI_UI_DICT } from "@/lib/i18n/dictionaries/agent-email-setari-ui";
import { AGENT_EMAIL_UI_DICT } from "@/lib/i18n/dictionaries/agent-email-ui";

import { useLocale } from "../crm/lib/locale-context";
import { deconecteazaContEmail, salveazaContEmail, testeazaContImap, testeazaContSmtp, type StareContEmail } from "./agent-email-actions";

// Setări → „Căsuța mea de email”: adresa proprie a fiecărui utilizator pentru Agentul email. Parola se trimite o singură dată spre server (criptată acolo) și nu se mai întoarce în browser.
export function ContEmailSection({ orgSlug, stare }: { orgSlug: string; stare: StareContEmail }) {
  const router = useRouter();
  const locale = useLocale();
  const d = AGENT_EMAIL_SETARI_UI_DICT[locale];
  const c = stare.cont;
  const [adresa, setAdresa] = useState(c?.adresa ?? "");
  const [parola, setParola] = useState("");
  const [smtpHost, setSmtpHost] = useState(c?.smtpHost ?? "");
  const [smtpPort, setSmtpPort] = useState(String(c?.smtpPort ?? 465));
  const [smtpUser, setSmtpUser] = useState(c?.smtpUser ?? "");
  const [imapHost, setImapHost] = useState(c?.imapHost ?? "");
  const [imapPort, setImapPort] = useState(String(c?.imapPort ?? 993));
  const [imapUser, setImapUser] = useState(c?.imapUser ?? "");
  const [semnatura, setSemnatura] = useState(c?.semnatura ?? "");
  const [eroare, setEroare] = useState<string | null>(null);
  const [campuriGresite, setCampuriGresite] = useState<string[]>([]);
  const [reusit, setReusit] = useState<string | null>(null);
  const [lucreaza, setLucreaza] = useState<"salveaza" | "smtp" | "imap" | "sterge" | null>(null);
  const [confirmaStergere, setConfirmaStergere] = useState(false);
  const [pending, startTransition] = useTransition();
  const sugestie = sugereazaServere(adresa);
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(locale === "ro" ? "ro-RO" : "en-GB", { day: "2-digit", month: "short", year: "numeric" });

  useEffect(() => {
    if (!reusit) return;
    const t = setTimeout(() => setReusit(null), 6000);
    return () => clearTimeout(t);
  }, [reusit]);

  // La o adresă de furnizor cunoscut, serverele goale se completează singure (colegii ne-tehnici nu le știu).
  function completeaza() {
    if (!sugestie) return;
    if (!smtpHost) {
      setSmtpHost(sugestie.smtpHost);
      setSmtpPort(String(sugestie.smtpPort));
    }
    if (!imapHost) {
      setImapHost(sugestie.imapHost);
      setImapPort(String(sugestie.imapPort));
    }
  }

  const ruleaza = (eticheta: NonNullable<typeof lucreaza>, f: () => Promise<{ error: string | null; campuri?: string[] }>, mesaj: string, dupa?: () => void) =>
    startTransition(async () => {
      setEroare(null);
      setReusit(null);
      setCampuriGresite([]);
      setLucreaza(eticheta);
      const r = await f();
      setLucreaza(null);
      if (r.error) {
        setEroare(r.error);
        setCampuriGresite(r.campuri ?? []);
      } else {
        setReusit(mesaj);
        dupa?.();
        router.refresh();
      }
    });

  const camp = "mt-1 h-10 w-full rounded-md border bg-panel px-2.5 text-sm text-ink";
  const bordura = (k: string) => (campuriGresite.includes(k) ? "border-red-500" : "border-line");

  return (
    <section id="cont-email" className="mt-8 scroll-mt-4 rounded-xl border border-line bg-panel p-5">
      <h2 className="font-medium text-ink">{d.titlu}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">{d.intro}</p>
      <ol className="mt-3 space-y-1.5 rounded-lg bg-panel-2 p-3 text-xs leading-relaxed text-ink">
        <li>
          <strong>1.</strong> {d.pas1}
        </li>
        <li>
          <strong>2.</strong> {d.pas2}
        </li>
        <li>
          <strong>3.</strong> {d.pas3}
        </li>
      </ol>
      {!stare.criptareActiva && (
        <p role="alert" className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900">
          {d.faraCriptare}
        </p>
      )}

      <div className="mt-4 rounded-lg border border-line p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-ink">
          <span>{d.stare}</span>
          {c ? <span className="text-xs font-medium text-brand-green">{d.conectat(c.adresa, c.amprenta)}</span> : <span className="text-xs font-normal text-muted">{d.neconectat}</span>}
        </div>
        {c && (
          <ul className="mt-2 space-y-1 text-xs text-muted">
            <li>{c.smtpTestatLa ? d.smtpOk(fmt(c.smtpTestatLa)) : `SMTP: ${d.netestat}`}</li>
            <li>{c.imapTestatLa ? d.imapOk(fmt(c.imapTestatLa)) : `IMAP: ${d.netestat}`}</li>
            {c.smtpEroare && <li className="text-red-700">{c.smtpEroare}</li>}
            {c.imapEroare && <li className="text-red-700">{AGENT_EMAIL_UI_DICT[locale].azi.erorImap[c.imapEroare.split(":")[0]] ?? c.imapEroare}</li>}
          </ul>
        )}

        <form
          className="mt-3 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (pending || !stare.criptareActiva) return;
            ruleaza(
              "salveaza",
              () => salveazaContEmail(orgSlug, { adresa, parola, smtpHost, smtpPort: Number(smtpPort), smtpUser, imapHost, imapPort: Number(imapPort), imapUser, semnatura }),
              d.salvat,
              () => setParola(""),
            );
          }}
        >
          <label className="text-xs text-muted sm:col-span-2">
            {d.adresa}
            <input type="email" autoComplete="off" value={adresa} onChange={(e) => setAdresa(e.target.value)} onBlur={completeaza} className={`${camp} ${bordura("adresa")}`} />
            {campuriGresite.includes("adresa") && <span className="text-red-700">{d.campuri.adresa}</span>}
          </label>
          <label className="text-xs text-muted sm:col-span-2">
            {d.parola}
            <input type="password" autoComplete="new-password" spellCheck={false} value={parola} onChange={(e) => setParola(e.target.value)} placeholder={c ? d.parolaSalvata : ""} className={`${camp} ${bordura("parola")}`} />
            {sugestie?.nota === "parola_aplicatie" && <span className="block text-amber-800">{d.notaParolaAplicatie}</span>}
            {campuriGresite.includes("parola") && <span className="text-red-700">{d.campuri.parola}</span>}
          </label>
          <label className="text-xs text-muted">
            {d.serverSmtp}
            <input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.firma.ro" className={`${camp} ${bordura("smtp_host")}`} />
            {campuriGresite.includes("smtp_host") && <span className="text-red-700">{d.campuri.smtp_host}</span>}
          </label>
          <label className="text-xs text-muted">
            {d.portSmtp}
            <select value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} className={`${camp} ${bordura("smtp_port")}`}>
              {[465, 587, 2525].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            {d.serverImap}
            <input value={imapHost} onChange={(e) => setImapHost(e.target.value)} placeholder="imap.firma.ro" className={`${camp} ${bordura("imap_host")}`} />
            {campuriGresite.includes("imap_host") && <span className="text-red-700">{d.campuri.imap_host}</span>}
          </label>
          <label className="text-xs text-muted">
            {d.portImap}
            <select value={imapPort} onChange={(e) => setImapPort(e.target.value)} className={`${camp} ${bordura("imap_port")}`}>
              {[993, 143].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            {d.utilizatorSmtp}
            <input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder={adresa} className={`${camp} ${bordura("utilizator")}`} />
          </label>
          <label className="text-xs text-muted">
            {d.utilizatorImap}
            <input value={imapUser} onChange={(e) => setImapUser(e.target.value)} placeholder={adresa} className={`${camp} ${bordura("utilizator")}`} />
          </label>
          <p className="-mt-1 text-xs text-muted sm:col-span-2">{d.utilizatorAjutor}</p>
          <label className="text-xs text-muted sm:col-span-2">
            {d.semnatura}
            <textarea value={semnatura} onChange={(e) => setSemnatura(e.target.value)} rows={4} placeholder={d.semnaturaExemplu} className={`${camp} h-auto py-2`} />
            <span className="block">{d.semnaturaAjutor}</span>
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="submit" disabled={pending || !stare.criptareActiva || !adresa.trim()} className="h-10 rounded-md bg-brand-green px-3 text-sm font-semibold text-white transition hover:bg-brand-green-hover disabled:opacity-50">
              {lucreaza === "salveaza" ? d.seSalveaza : d.salveaza}
            </button>
            {c && (
              <>
                <button type="button" disabled={pending} onClick={() => ruleaza("smtp", () => testeazaContSmtp(orgSlug), d.testatOk)} className="h-10 rounded-md border border-line px-3 text-sm font-medium text-ink hover:bg-panel-2 disabled:opacity-50">
                  {lucreaza === "smtp" ? d.seTesteaza : d.testeazaSmtp}
                </button>
                <button type="button" disabled={pending} onClick={() => ruleaza("imap", () => testeazaContImap(orgSlug), d.testatOk)} className="h-10 rounded-md border border-line px-3 text-sm font-medium text-ink hover:bg-panel-2 disabled:opacity-50">
                  {lucreaza === "imap" ? d.seTesteaza : d.testeazaImap}
                </button>
                {!confirmaStergere && (
                  <button type="button" disabled={pending} onClick={() => setConfirmaStergere(true)} className="h-10 rounded-md border border-line px-3 text-sm font-medium text-ink hover:bg-panel-2 disabled:opacity-50">
                    {d.deconecteaza}
                  </button>
                )}
              </>
            )}
          </div>
        </form>

        {confirmaStergere && (
          <div role="alertdialog" aria-label={d.deconecteaza} className="mt-2 rounded-md bg-panel-2 p-3 text-xs text-ink">
            <p>{d.confirmaDeconectare}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setConfirmaStergere(false);
                  ruleaza("sterge", () => deconecteazaContEmail(orgSlug), d.deconectat);
                }}
                className="h-9 rounded-md bg-red-700 px-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {d.daDeconecteaza}
              </button>
              <button type="button" onClick={() => setConfirmaStergere(false)} className="h-9 rounded-md border border-line px-3 text-sm font-medium text-ink hover:bg-panel">
                {d.renunta}
              </button>
            </div>
          </div>
        )}
        <Link href={`/${orgSlug}/crm/agent-email`} className="mt-3 inline-block text-xs font-medium text-ink underline">
          {d.deschideAgent}
        </Link>
      </div>

      <div aria-live="polite" className="mt-2 min-h-5 text-xs">
        {eroare && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-red-800">
            {eroare}
          </p>
        )}
        {!eroare && reusit && <p className="rounded-md bg-green-50 px-3 py-2 text-green-800">{reusit}</p>}
      </div>
    </section>
  );
}
