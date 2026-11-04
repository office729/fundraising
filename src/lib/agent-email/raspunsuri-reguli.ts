// Partea PURĂ a citirii răspunsurilor: fragmentul nou dintr-un răspuns, recunoașterea răspunsurilor automate, etichetele, potrivirea pe fir (Message-ID). Fără rețea, fără bază de date.

export type EtichetaRaspunsPura = "interesat" | "detalii" | "nu_acum" | "refuz" | "alt_contact" | "stop" | "automat" | "altul";

const fara = (s: string): string =>
  s
    .replace(/[șş]/gi, "s")
    .replace(/[țţ]/gi, "t")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Partea NOUĂ a răspunsului: fără textul citat („> ...”, „On ... wrote:”, „În data de ... a scris:”, „De la: ...”).
export function fragmentRaspuns(text: string, maxim = 1200): string {
  const linii: string[] = [];
  for (const l of text.replace(/\r/g, "").split("\n")) {
    if (/^\s*>/.test(l)) break;
    if (/^\s*(On .+wrote:|În data de .+a scris:|In data de .+a scris:|Pe .+a scris:|-{3,}\s*(Original Message|Mesaj original)|_{5,}|From:\s|De la:\s|Sent from my|Trimis de pe)/i.test(l)) break;
    linii.push(l);
  }
  return linii.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, maxim);
}

// „Re: Re[2]: Fwd: Subiect” -> „subiect” (pentru potrivirea când clientul de email pierde antetele firului).
export function subiectNormalizat(s: string): string {
  return fara(s)
    .replace(/^(\s*((re|fw|fwd|raspuns|r|sv|aw)(\[\d+\])?\s*:\s*)+)/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Lista de Message-ID-uri dintr-un antet In-Reply-To / References (șir sau listă), normalizate: minuscule, între < >.
export function idUri(v: unknown): string[] {
  const brut = Array.isArray(v) ? v.map(String) : typeof v === "string" ? v.split(/\s+/) : [];
  return brut
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .map((x) => (x.startsWith("<") ? x : `<${x.replace(/^<|>$/g, "")}>`));
}

export type AnteteRaspuns = {
  autoSubmitted?: string | null;
  precedence?: string | null;
  xAutoreply?: string | null;
  xAutorespond?: string | null;
  xAutoResponseSuppress?: string | null;
  returnPath?: string | null;
};

const RE_SUBIECT_AUTOMAT = /(auto[- ]?reply|automatic reply|automatische antwort|out of office|autoreply|raspuns automat|răspuns automat|nu sunt in birou|nu sunt în birou|undeliverable|delivery status notification|mail delivery (failed|subsystem)|returned mail|nu a putut fi livrat|failure notice)/i;
const RE_TEXT_AUTOMAT = /(sunt (in|în) concediu|sunt plecat|sunt plecată|voi reveni (pe|la|dupa|după)|this is an automatic|acesta este un (mesaj|raspuns|răspuns) automat|i am out of the office|i will be out of (the )?office|nu mai lucrez (la|in|în)|nu mai fac parte din)/i;
const RE_EXPEDITOR_AUTOMAT = /^(mailer-daemon|postmaster|no-?reply|noreply|do-?not-?reply)@/i;

// Răspuns automat (concediu, „nu mai lucrez aici”, raportul unui server): nu contează ca răspuns al omului și nu oprește revenirea.
export function esteRaspunsAutomat(x: { antete?: AnteteRaspuns; subiect: string; text: string; deLa?: string }): boolean {
  const a = x.antete ?? {};
  const auto = (a.autoSubmitted ?? "").trim().toLowerCase();
  if (auto && auto !== "no") return true;
  if (/^(auto_reply|auto-reply|bulk|junk|list)$/i.test((a.precedence ?? "").trim())) return true;
  if ((a.xAutoreply ?? "").trim() || (a.xAutorespond ?? "").trim()) return true;
  if ((a.returnPath ?? "").replace(/\s/g, "") === "<>") return true;
  if (x.deLa && RE_EXPEDITOR_AUTOMAT.test(x.deLa.trim())) return true;
  if (RE_SUBIECT_AUTOMAT.test(x.subiect)) return true;
  // Textul scurt care anunță concediul; pe mesaje lungi nu hotărâm după text (un om poate scrie „voi reveni după ce vorbesc cu conducerea”).
  return x.text.trim().length < 600 && RE_TEXT_AUTOMAT.test(x.text);
}

// Etichetele sigure, fără AI: STOP / dezabonare. Răspunsurile automate se recunosc separat (esteRaspunsAutomat).
export function etichetaRapida(subiect: string, fragment: string): EtichetaRaspunsPura | null {
  const t = fara(`${subiect}\n${fragment}`);
  if (/^\s*(stop|dezabon\w*|unsubscribe)\b/.test(fara(fragment)) || /\b(dezabon\w*|unsubscribe|nu mai trimiteti|nu ne mai scrieti|nu mai doresc|stergeti-ma|scoateti-ma din|remove me)\b/.test(t)) return "stop";
  return null;
}

const SINONIME: Record<string, EtichetaRaspunsPura> = {
  interesat: "interesat", interested: "interesat",
  detalii: "detalii", details: "detalii",
  nu_acum: "nu_acum", nuacum: "nu_acum", mai_tarziu: "nu_acum", maitarziu: "nu_acum", later: "nu_acum",
  refuz: "refuz", nu: "refuz", no: "refuz", refuza: "refuz",
  alt_contact: "alt_contact", altcontact: "alt_contact", redirectionat: "alt_contact",
  stop: "stop",
  automat: "automat",
  altul: "altul", altceva: "altul",
};

// Răspunsul modelului (un singur cuvânt) -> etichetă; orice altceva => „altul”.
export function parseazaEticheta(raw: string): EtichetaRaspunsPura {
  const w = fara(raw).replace(/[^a-z_ ]/g, "").trim().split(/\s+/)[0]?.replace(/-/g, "_") ?? "";
  return SINONIME[w] ?? "altul";
}

export type MesajAsteptat = { id: string; messageId: string | null; subiect: string; trimisLa: Date };
export type RaspunsDePotrivit = { fir: string[]; subiect: string; primitLa: Date | null };

const esteAgent = (id: string) => id.startsWith("<agt.");
const TOLERANTA_MS = 5 * 60_000; // ceasurile a două servere nu sunt perfect sincronizate

// Căută emailul nostru la care răspunde mesajul primit.
//  1) potrivire exactă: răspunsul citează (In-Reply-To / References) Message-ID-ul nostru;
//  2) răspunsul citează un email al agentului, dar altul decât cele așteptate din această căsuță: nu îl legăm de altceva;
//  3) altfel (serverul a rescris Message-ID-ul sau clientul a pierdut firul): același subiect („Re: ...”), trimis ÎNAINTE de răspuns; dacă sunt mai multe, cel mai recent.
export function potrivesteMesaj<T extends MesajAsteptat>(r: RaspunsDePotrivit, candidati: readonly T[]): T | null {
  const dupaId = new Map(candidati.filter((c) => c.messageId).map((c) => [c.messageId!.trim().toLowerCase(), c]));
  for (const id of r.fir) {
    const c = dupaId.get(id);
    if (c && (!r.primitLa || r.primitLa.getTime() >= c.trimisLa.getTime() - TOLERANTA_MS)) return c;
  }
  if (r.fir.some(esteAgent)) return null;
  const subiect = subiectNormalizat(r.subiect);
  if (!subiect) return null;
  const posibile = candidati
    .filter((c) => subiectNormalizat(c.subiect) === subiect && (!r.primitLa || r.primitLa.getTime() >= c.trimisLa.getTime() - TOLERANTA_MS))
    .sort((a, b) => b.trimisLa.getTime() - a.trimisLa.getTime());
  return posibile[0] ?? null;
}
