// Cronologia unui donator: tot ce s-a întâmplat cu el, într-un singur șir (donații, e-mailuri trimise de parcursuri, notițe, apeluri, acord, dezabonare, adresă respinsă).
// Fără importuri, ca să se poată testa direct; interogările stau în donatori/queries.ts.

import type { Locale } from "./i18n/config";

export type TipEveniment = "donatie" | "donatie_importata" | "nota" | "apel" | "intalnire" | "email_echipa" | "parcurs" | "acord_email" | "dezabonare" | "adresa" | "marcaj";
export type TonEveniment = "verde" | "albastru" | "galben" | "rosu" | "neutru";

export type EvenimentCronologie = {
  id: string;
  tip: TipEveniment;
  la: string; // ISO
  titlu: string;
  detaliu?: string | null;
  autor?: string | null;
  ton: TonEveniment;
};

// Tipurile de înregistrări făcute de echipă în fișă (tabelul donator_notite).
export const TIPURI_NOTA = ["nota", "apel", "intalnire", "email"] as const;
export type TipNota = (typeof TIPURI_NOTA)[number];
export const ETICHETE_TIP_NOTA: Record<TipNota, string> = { nota: "Notiță", apel: "Apel", intalnire: "Întâlnire", email: "E-mail trimis de echipă" };
export const ETICHETE_TIP_NOTA_EN: Record<TipNota, string> = { nota: "Note", apel: "Call", intalnire: "Meeting", email: "Email sent by the team" };
export function esteTipNota(x: unknown): x is TipNota {
  return typeof x === "string" && (TIPURI_NOTA as readonly string[]).includes(x);
}

export const REZULTATE_APEL = ["raspuns", "fara_raspuns", "mesaj_vocal", "reapel", "refuz"] as const;
export type RezultatApel = (typeof REZULTATE_APEL)[number];
export const ETICHETE_REZULTAT_APEL: Record<RezultatApel, string> = { raspuns: "A răspuns", fara_raspuns: "Nu a răspuns", mesaj_vocal: "Mesaj vocal", reapel: "De sunat din nou", refuz: "A refuzat" };
export const ETICHETE_REZULTAT_APEL_EN: Record<RezultatApel, string> = { raspuns: "Answered", fara_raspuns: "No answer", mesaj_vocal: "Voicemail", reapel: "Call again", refuz: "Declined" };
export function esteRezultatApel(x: unknown): x is RezultatApel {
  return typeof x === "string" && (REZULTATE_APEL as readonly string[]).includes(x);
}

const STATUS_DONATIE: Record<string, { text: string; ton: TonEveniment }> = {
  reusita: { text: "Donație", ton: "verde" },
  in_asteptare: { text: "Donație în așteptare", ton: "galben" },
  esuata: { text: "Donație eșuată", ton: "rosu" },
  rambursata: { text: "Donație rambursată", ton: "galben" },
};

const STATUS_DONATIE_EN: Record<string, string> = { reusita: "Donation", in_asteptare: "Pending donation", esuata: "Failed donation", rambursata: "Refunded donation" };

const lei = (n: number, locale: Locale = "ro") => `${Math.round(n).toLocaleString(locale === "en" ? "en-GB" : "ro-RO")} lei`;

// Toate funcțiile care compun texte primesc `locale` (implicit română); datele utilizatorului (proiect, procesator, autor, text) rămân cum sunt.
export function evenimentDonatie(d: { id: string; la: Date | string; suma: number; status: string; recurenta: boolean; proiect?: string | null }, locale: Locale = "ro"): EvenimentCronologie {
  const en = locale === "en";
  const s = STATUS_DONATIE[d.status] ?? { text: `Donație (${d.status})`, ton: "neutru" as TonEveniment };
  const text = en ? (STATUS_DONATIE_EN[d.status] ?? `Donation (${d.status})`) : s.text;
  return {
    id: `d:${d.id}`,
    tip: "donatie",
    la: new Date(d.la).toISOString(),
    titlu: `${text}: ${lei(d.suma, locale)}${d.recurenta ? (en ? " (monthly)" : " (lunară)") : ""}`,
    detaliu: d.proiect ? `${en ? "Project" : "Proiect"}: ${d.proiect}` : null,
    ton: s.ton,
  };
}

export function evenimentDonatieImportata(d: { id: string; la: Date | string; suma: number; proiect?: string | null; procesator?: string | null }, locale: Locale = "ro"): EvenimentCronologie {
  const en = locale === "en";
  const parti = [d.proiect ? `${en ? "Project" : "Proiect"}: ${d.proiect}` : null, d.procesator ? `${en ? "Processor" : "Procesator"}: ${d.procesator}` : null].filter(Boolean);
  return { id: `i:${d.id}`, tip: "donatie_importata", la: new Date(d.la).toISOString(), titlu: `${en ? "Imported donation" : "Donație importată"}: ${lei(d.suma, locale)}`, detaliu: parti.length ? parti.join(" · ") : null, ton: "verde" };
}

// O înregistrare a echipei: notiță, apel (cu rezultat), întâlnire sau e-mail trimis manual.
export function evenimentNota(n: { id: string; la: Date | string; tip: string; text: string; rezultat?: string | null; autor?: string | null }, locale: Locale = "ro"): EvenimentCronologie {
  const tip: TipNota = esteTipNota(n.tip) ? n.tip : "nota";
  const etichetaTip = (locale === "en" ? ETICHETE_TIP_NOTA_EN : ETICHETE_TIP_NOTA)[tip];
  const rezultat = tip === "apel" && esteRezultatApel(n.rezultat) ? (locale === "en" ? ETICHETE_REZULTAT_APEL_EN : ETICHETE_REZULTAT_APEL)[n.rezultat] : null;
  const evTip: TipEveniment = tip === "nota" ? "nota" : tip === "apel" ? "apel" : tip === "intalnire" ? "intalnire" : "email_echipa";
  return {
    id: `n:${n.id}`,
    tip: evTip,
    la: new Date(n.la).toISOString(),
    titlu: rezultat ? `${etichetaTip}: ${rezultat}` : etichetaTip,
    detaliu: n.text,
    autor: n.autor ?? null,
    ton: tip === "apel" && n.rezultat === "refuz" ? "rosu" : "albastru",
  };
}

// Un e-mail din parcursurile automate: trimis, în curs de trimitere sau „control” (ales să nu primească mesajul).
export function evenimentParcurs(p: { id: string; la: Date | string; numeParcurs: string; pas: number; stare: string }, locale: Locale = "ro"): EvenimentCronologie {
  const control = p.stare === "control";
  const en = locale === "en";
  return {
    id: `p:${p.id}`,
    tip: "parcurs",
    la: new Date(p.la).toISOString(),
    titlu: en
      ? control ? `Journey “${p.numeParcurs}”: in the control group (did not receive the email)` : `Email from the journey “${p.numeParcurs}”, step ${p.pas}${p.stare === "in_curs" ? " (being sent)" : ""}`
      : control ? `Parcurs „${p.numeParcurs}”: în grupul de control (nu a primit e-mail)` : `E-mail din parcursul „${p.numeParcurs}”, pasul ${p.pas}${p.stare === "in_curs" ? " (în curs de trimitere)" : ""}`,
    ton: control ? "neutru" : "albastru",
  };
}

// Evenimente de stare ale donatorului: acordul, dezabonarea, adresa respinsă, marcajele „sunat”/„mulțumit”.
export function evenimenteDeStare(s: {
  acordLa?: Date | string | null;
  acordSursa?: string | null;
  dezabonatLa?: Date | string | null;
  adresaLa?: Date | string | null;
  adresaStare?: string | null;
  adresaMotiv?: string | null;
  sunatLa?: Date | string | null;
  multumitLa?: Date | string | null;
}, locale: Locale = "ro"): EvenimentCronologie[] {
  const en = locale === "en";
  const ev: EvenimentCronologie[] = [];
  if (s.acordLa) {
    ev.push({ id: "acord", tip: "acord_email", la: new Date(s.acordLa).toISOString(), titlu: en ? "Accepted emails from the organization" : "A acceptat e-mailurile de la organizație", detaliu: s.acordSursa === "declarat_echipa" ? (en ? "Consent declared by the team (not included in the automatic journeys)" : "Acord declarat de echipă (nu intră în parcursurile automate)") : en ? "Ticked by the donor, on the donation form" : "Bifat de donator, în formularul de donație", ton: "verde" });
  }
  if (s.dezabonatLa) ev.push({ id: "dezabonare", tip: "dezabonare", la: new Date(s.dezabonatLa).toISOString(), titlu: en ? "Unsubscribed from emails" : "S-a dezabonat de la e-mailuri", ton: "galben" });
  if (s.adresaLa && s.adresaStare && s.adresaStare !== "ok") {
    ev.push({ id: "adresa", tip: "adresa", la: new Date(s.adresaLa).toISOString(), titlu: s.adresaStare === "reclamat" ? (en ? "Marked a message as spam" : "A marcat un mesaj ca spam") : en ? "The email address bounced" : "Adresa de e-mail a fost respinsă", detaliu: s.adresaMotiv ?? null, ton: "rosu" });
  }
  if (s.sunatLa) ev.push({ id: "sunat", tip: "marcaj", la: new Date(s.sunatLa).toISOString(), titlu: en ? "Marked as called" : "Marcat ca sunat", ton: "neutru" });
  if (s.multumitLa) ev.push({ id: "multumit", tip: "marcaj", la: new Date(s.multumitLa).toISOString(), titlu: en ? "Marked as thanked" : "Marcat ca mulțumit", ton: "neutru" });
  return ev;
}

// Cele mai noi întâi; datele invalide se ignoră; la dată egală, ordinea rămâne stabilă.
export function ordoneazaCronologie(evenimente: readonly EvenimentCronologie[], max = 500): EvenimentCronologie[] {
  return evenimente
    .map((e, i) => ({ e, i, t: Date.parse(e.la) }))
    .filter((x) => Number.isFinite(x.t))
    .sort((a, b) => b.t - a.t || a.i - b.i)
    .slice(0, Math.max(0, max))
    .map((x) => x.e);
}

// Grupare pe luni, pentru titluri de secțiune („octombrie 2026”), în ordinea primită.
export function grupeazaPeLuni(evenimente: readonly EvenimentCronologie[], locale: Locale = "ro"): { luna: string; evenimente: EvenimentCronologie[] }[] {
  const grupuri: { luna: string; evenimente: EvenimentCronologie[] }[] = [];
  for (const e of evenimente) {
    const luna = new Date(e.la).toLocaleDateString(locale === "en" ? "en-GB" : "ro-RO", { timeZone: "Europe/Bucharest", month: "long", year: "numeric" });
    const ultimul = grupuri[grupuri.length - 1];
    if (ultimul && ultimul.luna === luna) ultimul.evenimente.push(e);
    else grupuri.push({ luna, evenimente: [e] });
  }
  return grupuri;
}

export const MAX_TEXT_NOTA = 4000;
export const MAX_REZULTAT = 40;

// Textul notiței: fără caractere de control (în afară de rând nou), tăiat la limită; gol = nimic de salvat.
export function curataTextNota(brut: unknown): string | null {
  if (typeof brut !== "string") return null;
  const t = brut.replace(/\r\n/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, MAX_TEXT_NOTA);
  return t === "" ? null : t;
}
