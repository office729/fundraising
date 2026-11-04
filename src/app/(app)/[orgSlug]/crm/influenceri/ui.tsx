"use client";

import type { Locale } from "@/lib/i18n/config";
import { CATEGORII, ETAPE, ETAPE_ACCEPTATE, ETAPE_FARA_CONTACT, PLATFORME, type Eticheta } from "@/lib/influenceri/reguli";

import { Avatar } from "../components/ui/avatar";
import { Badge, type StatusTone } from "../components/ui/badge";

// Piese comune ale paginii Influenceri: etichete în limba curentă, date, poza și etapa.

export const textLocale = (x: Eticheta | undefined, locale: Locale): string => (x ? x[locale] : "");
export const etichetaEtapa = (k: string, locale: Locale): string => textLocale(ETAPE.find((e) => e.k === k), locale) || k;
export const etichetaCategorie = (k: string, locale: Locale): string => textLocale(CATEGORII.find((c) => c.k === k), locale) || k;
export const etichetaPlatforma = (k: string, locale: Locale): string => textLocale(PLATFORME.find((p) => p.k === k), locale) || (k === "email" ? "Email" : k);

const REGIUNE: Record<Locale, string> = { ro: "ro-RO", en: "en-GB" };
const FUS = "Europe/Bucharest";

export function formateazaData(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(REGIUNE[locale], { day: "numeric", month: "short", year: "numeric", timeZone: FUS });
}

export function formateazaDataOra(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(REGIUNE[locale], { dateStyle: "short", timeStyle: "short", timeZone: FUS });
}

// „Azi” în ora României, ca zi (YYYY-MM-DD).
export const aziRo = (): string => new Intl.DateTimeFormat("en-CA", { timeZone: FUS, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export const ziRo = (iso: string): string => new Intl.DateTimeFormat("en-CA", { timeZone: FUS, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

export const scurt = (n: number): string => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(".0", "")}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : n > 0 ? String(n) : "—");

export function Foto({ nume, fotoUrl, mare }: { nume: string; fotoUrl: string | null; mare?: boolean }) {
  // Poza publică de profil, doar https și fără trimiterea adresei paginii noastre.
  if (fotoUrl && /^https:\/\//i.test(fotoUrl)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fotoUrl} alt="" referrerPolicy="no-referrer" className={`${mare ? "h-14 w-14" : "h-9 w-9"} shrink-0 rounded-full object-cover`} />;
  }
  return <Avatar name={nume} size={mare ? "lg" : "md"} />;
}

export function EtapaChip({ etapa, locale }: { etapa: string; locale: Locale }) {
  const ton: StatusTone = ETAPE_FARA_CONTACT.has(etapa) ? "red" : ETAPE_ACCEPTATE.has(etapa) ? "green" : etapa === "raspuns" ? "amber" : etapa === "asteptam" ? "blue" : "neutral";
  return (
    <Badge tone={ton} icon={false} className="whitespace-nowrap">
      {etichetaEtapa(etapa, locale)}
    </Badge>
  );
}

// Un câmp de formular cu etichetă, fără dependențe de numele ID-urilor.
export function Camp({ eticheta, children, className }: { eticheta: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 text-[12.5px] text-[var(--ci-text-muted)] ${className ?? ""}`}>
      <span>{eticheta}</span>
      {children}
    </label>
  );
}

// Legătură care arată ca un buton (deschide într-o filă nouă; nu marchează nimic).
export function LinkButon({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3.5 text-sm font-medium text-[var(--ci-text)] transition-colors hover:border-[var(--ci-border-strong)] hover:bg-[var(--ci-surface-2)]"
    >
      {children}
    </a>
  );
}

export async function copiaza(textul: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(textul);
    return true;
  } catch {
    return false;
  }
}

// Mesaj de stare sub o acțiune (succes sau eroare), anunțat cititoarelor de ecran.
export function MesajStare({ mesaj }: { mesaj: { ok: boolean; text: string } | null }) {
  if (!mesaj || !mesaj.text) return null;
  return (
    <p role={mesaj.ok ? "status" : "alert"} className={`rounded-[var(--ci-radius-btn)] px-3 py-2 text-[13px] text-[var(--ci-text)] ${mesaj.ok ? "bg-[var(--ci-green-soft)]" : "bg-[var(--ci-red-soft)]"}`}>
      {mesaj.text}
    </p>
  );
}
