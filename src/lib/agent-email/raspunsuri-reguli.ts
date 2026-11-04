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
  // toate valorile antetului Authentication-Results (verdictul DKIM / SPF / DMARC dat de serverul de email care a primit mesajul)
  authenticationResults?: string[];
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

// ===== Autenticitatea expeditorului (antetul Authentication-Results) =====
// Un răspuns fals (expeditor falsificat) ar putea suprima un contact („stop”), ar putea pune consimțământul pe „nu” sau ar muta firma în etapa „telefon”.
// Serverul de email care a primit mesajul scrie în Authentication-Results verdictul DKIM / SPF / DMARC. Un răspuns care pică verificarea (sau trece doar
// pentru alt domeniu decât al expeditorului declarat) se salvează și se arată, dar NU declanșează acțiuni automate: un om îl confirmă.
// Lipsa totală a antetului nu blochează nimic (unele servere nu îl pun).

export type VerdictAutenticitate = "verificat" | "neverificat" | "necunoscut";
export type RezultatAutenticitate = { verdict: VerdictAutenticitate; motiv: string };

type Metoda = "dkim" | "spf" | "dmarc";
type RezultatMetoda = { rezultat: string; domeniu: string | null };

// Domeniul organizatoric (aproximare fără lista sufixelor publice): ultimele 2 etichete, sau 3 pentru sufixe de tip com.ro / co.uk.
function domeniuBaza(d: string): string {
  const et = d.toLowerCase().replace(/^.*@/, "").replace(/\.$/, "").split(".").filter(Boolean);
  if (et.length <= 2) return et.join(".");
  const sufixCompus = et[et.length - 1].length === 2 && ["com", "co", "org", "net", "gov", "edu", "ac", "ltd", "srl"].includes(et[et.length - 2]);
  return et.slice(sufixCompus ? -3 : -2).join(".");
}

// Fără domeniu (în antet sau la expeditor) nu avem ce compara: se consideră aliniat.
const aliniat = (verificat: string | null, expeditor: string | null): boolean => !verificat || !expeditor || domeniuBaza(verificat) === domeniuBaza(expeditor);

// Rezultatele unui singur antet, pe metodă. Comentariile dintre paranteze se ignoră (pot conține „spf=fail” în text liber).
function metodeDinAntet(antet: string): Record<Metoda, RezultatMetoda[]> {
  const iesire: Record<Metoda, RezultatMetoda[]> = { dkim: [], spf: [], dmarc: [] };
  const fara = antet.replace(/\([^()]*\)/g, " ").replace(/\s+/g, " ");
  for (const seg of fara.split(";")) {
    const m = /^\s*(dkim|spf|dmarc)\s*=\s*([a-z]+)/i.exec(seg);
    if (!m) continue;
    // domeniul pe care s-a făcut verificarea: header.d / header.i (DKIM), smtp.mailfrom / smtp.helo (SPF)
    const d = /\b(?:header\.d|header\.i|smtp\.mailfrom|smtp\.helo)\s*=\s*"?@?([^\s;"]+)/i.exec(seg);
    iesire[m[1].toLowerCase() as Metoda].push({ rezultat: m[2].toLowerCase(), domeniu: d ? d[1].replace(/^.*@/, "") : null });
  }
  return iesire;
}

const VERIFICAT: RezultatAutenticitate = { verdict: "verificat", motiv: "" };
const NECUNOSCUT: RezultatAutenticitate = { verdict: "necunoscut", motiv: "" };
const nu = (motiv: string): RezultatAutenticitate => ({ verdict: "neverificat", motiv });

function evalueazaUnAntet(antet: string, domeniuExpeditor: string | null): RezultatAutenticitate {
  const x = metodeDinAntet(antet);
  if (!x.dkim.length && !x.spf.length && !x.dmarc.length) return NECUNOSCUT;
  if (x.dmarc.some((r) => r.rezultat === "pass")) return VERIFICAT; // DMARC trecut = expeditorul declarat e autentificat (DKIM sau SPF aliniat)
  if (x.dmarc.some((r) => r.rezultat === "fail")) return nu("dmarc=fail");
  if (x.spf.some((r) => r.rezultat === "fail" || r.rezultat === "hardfail")) return nu("spf=fail");
  const dkimTrecut = x.dkim.filter((r) => r.rezultat === "pass");
  // O semnătură DKIM care pică contează doar dacă nu există și una validă (listele de discuții adaugă propria semnătură).
  if (!dkimTrecut.length && x.dkim.some((r) => r.rezultat === "fail")) return nu("dkim=fail");
  const spfTrecut = x.spf.filter((r) => r.rezultat === "pass");
  if (dkimTrecut.some((r) => aliniat(r.domeniu, domeniuExpeditor)) || spfTrecut.some((r) => aliniat(r.domeniu, domeniuExpeditor))) return VERIFICAT;
  const spfSlab = x.spf.find((r) => ["softfail", "none", "neutral"].includes(r.rezultat));
  if (spfSlab) return nu(`spf=${spfSlab.rezultat}`);
  // A trecut ceva, dar pentru ALT domeniu decât al expeditorului declarat: așa arată un expeditor falsificat.
  if (dkimTrecut.length || spfTrecut.length) return nu("domeniu-nealiniat");
  return NECUNOSCUT;
}

// `antete`: toate valorile antetului Authentication-Results (în ordinea din mesaj, primul = cel mai nou, adăugat de serverul nostru de email).
// Orice antet care arată o problemă face răspunsul „neverificat”; „verificat” se acordă doar după primul antet (un antet fals adăugat de expeditor e mai jos în mesaj).
export function evalueazaAutenticitate(antete: readonly string[] | null | undefined, adresaExpeditor?: string | null): RezultatAutenticitate {
  const lista = (antete ?? []).map((a) => String(a ?? "")).filter((a) => a.trim());
  if (!lista.length) return NECUNOSCUT;
  const domeniu = adresaExpeditor && adresaExpeditor.includes("@") ? adresaExpeditor.slice(adresaExpeditor.lastIndexOf("@") + 1) : null;
  const rezultate = lista.map((a) => evalueazaUnAntet(a, domeniu));
  const rau = rezultate.find((r) => r.verdict === "neverificat");
  if (rau) return rau;
  return rezultate[0].verdict === "verificat" ? VERIFICAT : NECUNOSCUT;
}

export type DecizieRaspuns = {
  // nota pe fișa firmei: și un răspuns neverificat primește notă, ca să fie văzut de un om
  nota: boolean;
  // acțiunile automate: toate false pentru un răspuns neverificat
  suprima: boolean;
  consimtamantNu: boolean;
  mutaEtapa: boolean;
  deConfirmat: boolean;
};

// Ce are voie să facă platforma singură cu un răspuns. Răspunsurile automate (concediu) nu declanșează nimic.
export function decideActiuniRaspuns(x: { eticheta: EtichetaRaspunsPura; automat: boolean; verdict: VerdictAutenticitate }): DecizieRaspuns {
  if (x.automat || x.eticheta === "automat") return { nota: false, suprima: false, consimtamantNu: false, mutaEtapa: false, deConfirmat: false };
  if (x.verdict === "neverificat") return { nota: true, suprima: false, consimtamantNu: false, mutaEtapa: false, deConfirmat: true };
  const opozitie = x.eticheta === "stop" || x.eticheta === "refuz";
  return { nota: true, suprima: opozitie, consimtamantNu: opozitie, mutaEtapa: x.eticheta === "interesat" || x.eticheta === "detalii", deConfirmat: false };
}

// Începutul textului salvat pentru un răspuns neverificat: se vede în listă și în răspunsul deschis (fără coloană nouă în baza de date).
export const MARCAJ_NEVERIFICAT = "⚠ Neverificat / Unverified — de confirmat de un om / a person must confirm (expeditorul nu a trecut verificarea DKIM/SPF/DMARC).";
export const marcheazaNeverificat = (fragment: string): string => `${MARCAJ_NEVERIFICAT}\n\n${fragment}`.slice(0, 1700);
export const esteMarcatNeverificat = (fragment: string): boolean => fragment.startsWith(MARCAJ_NEVERIFICAT);
export const faraMarcaj = (fragment: string): string => (esteMarcatNeverificat(fragment) ? fragment.slice(MARCAJ_NEVERIFICAT.length).trim() : fragment);

// ===== Redactarea datelor personale înainte să plece textul la model =====
// Fragmentul unui răspuns poate conține semnături cu telefon, emailuri, IBAN sau CNP. La AI pleacă doar ce e nevoie pentru etichetă; textul salvat în baza de date rămâne neschimbat.
export function redactaPentruAi(text: string, max = 1500): string {
  let s = String(text ?? "").slice(0, max * 3);
  s = s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]");
  s = s.replace(/\b(?:https?:\/\/|www\.)\S+/gi, "[link]");
  // IBAN (cu sau fără spații între grupe): două litere mari + 2 cifre + 10–30 de caractere alfanumerice
  s = s.replace(/\b[A-Z]{2}\d{2}(?:[ -]?[A-Z0-9]){10,30}\b/g, "[cont]");
  // CNP: 13 cifre, prima 1–8
  s = s.replace(/\b[1-8]\d{12}\b/g, "[cnp]");
  // telefon / alte șiruri lungi de cifre: 9+ cifre cu separatori obișnuiți (datele, sumele și anii nu ajung la atât)
  s = s.replace(/(?:\+?\d[ .\-()]*){9,}/g, (m) => (/^\s*\d{4}-\d{2}-\d{2}\s*$/.test(m) || /^\s*\d{1,2}[./]\d{1,2}[./]\d{4}\s*$/.test(m) ? m : "[telefon]"));
  return s.replace(/[ \t]+\n/g, "\n").slice(0, max);
}
