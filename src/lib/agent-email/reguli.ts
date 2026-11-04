// Regulile PURE ale agentului email către companii: salut, momentul propunerii de apel, verificările ciornei, alegerea destinatarului, eligibilitatea,
// zilele lucrătoare, corpul HTML al emailului. Fără importuri de valori și fără acces la rețea sau la baza de date: se testează direct (tests/agent-email.test.mjs).
// Sărbătorile legale (lib/sarbatori-ro.ts) și ferestrele fiscale vin din afară, ca parametri, de la codul de server.

export type Mecanism = "sponsorizare" | "d177" | "caz";
export const MECANISME: readonly Mecanism[] = ["sponsorizare", "d177", "caz"];
export const esteMecanism = (v: unknown): v is Mecanism => typeof v === "string" && (MECANISME as readonly string[]).includes(v);

export type StareMesaj = "ciorna" | "se_trimite" | "trimis" | "eroare" | "respinsa";
export type TipMesaj = "prim" | "revenire";
export type EtichetaRaspuns = "interesat" | "detalii" | "nu_acum" | "refuz" | "alt_contact" | "stop" | "automat" | "altul";
export const ETICHETE_RASPUNS: readonly EtichetaRaspuns[] = ["interesat", "detalii", "nu_acum", "refuz", "alt_contact", "stop", "automat", "altul"];

export const LIMITA_ZI_IMPLICITA = 40; // emailuri / expeditor / zi (protejează reputația domeniului)
export const LIMITA_ZI_MAXIMA = 200;
export const ZILE_VALABILITATE_CIORNA = 14; // ciornele netrimise mai vechi se șterg
export const ZILE_PANA_LA_REVENIRE = 5; // zile lucrătoare fără răspuns
export const ZILE_FARA_DUBLURA = 60; // aceeași firmă nu primește două prime emailuri în această perioadă
export const MAX_FIRME_PE_GENERARE = 10;
export const MINUTE_BLOCARE_TRIMITERE = 10; // o trimitere „se_trimite” mai veche poate fi reluată
export const MAX_ZILE_REVENIRE = 45; // peste atât, nu mai scriem revenire

const ZI_MS = 86_400_000;
const TZ = "Europe/Bucharest";

// ===== Text =====

export function faraDiacritice(s: string): string {
  return s
    .replace(/[șş]/gi, "s")
    .replace(/[țţ]/gi, "t")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export const numarCuvinte = (t: string): number => t.trim().split(/\s+/).filter(Boolean).length;

// Numele din CRM vin uneori cu resturi de la import („Mădălina Diaconu —”, „Ion Pop,”).
export function numeCurat(n: string): string {
  const t = n
    .replace(/[\s\-–—,;:|·.]+$/u, "")
    .replace(/^[\s\-–—,;:|·.]+/u, "")
    .replace(/\s+/g, " ")
    .trim();
  return t || n.trim();
}

// ===== Stiluri de deschidere (fiecare email primește unul, ca să nu semene între ele) =====
export const STILURI_EMAIL: readonly string[] = [
  "Începe direct cu propunerea, într-o frază, apoi spune de ce le scrii tocmai lor.",
  "Începe cu o întrebare scurtă, firească, legată de domeniul sau orașul firmei.",
  "Începe cu momentul fiscal (câmpul „fereastra_fiscala”), ca motiv concret pentru care scrii acum.",
  "Începe cu legătura locală: județul sau orașul firmei și faptul că organizația lucrează cu oameni din zonă (fără să inventezi cazuri sau cifre).",
  "Începe sobru, cu o frază despre ce schimbă sprijinul firmelor pentru oamenii pe care îi ajutăm; fără dramatism.",
  "Ton de la om la om: fraze scurte, simple, ca un mesaj scris personal, nu ca o ofertă.",
  "Ton formal și concis: trei paragrafe scurte, fără adjective inutile.",
  "Începe cu ce câștigă firma (impozit redirecționat sau sponsorizare deductibilă), apoi cu impactul.",
];

// ===== Data în ora României =====

export type DataBuc = { an: number; luna: number; zi: number; dow: number };

export function dataBucuresti(d: Date): DataBuc {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const v = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  const an = v("year");
  const luna = v("month");
  const zi = v("day");
  return { an, luna, zi, dow: new Date(Date.UTC(an, luna - 1, zi)).getUTCDay() };
}

export const isoZi = (x: { an: number; luna: number; zi: number }): string => `${x.an}-${String(x.luna).padStart(2, "0")}-${String(x.zi).padStart(2, "0")}`;

// „2026-11-04” în ora României.
export const ziBucuresti = (d: Date): string => isoZi(dataBucuresti(d));

export type EsteSarbatoare = (isoData: string) => boolean;

function adaugaZile(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function esteZiLucratoare(iso: string, sarbatoare?: EsteSarbatoare): boolean {
  const dow = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return dow !== 0 && dow !== 6 && !(sarbatoare?.(iso) ?? false);
}

// Zile lucrătoare (luni–vineri, fără sărbători legale) scurse după ziua `dela`, până la ziua `panaLa` inclusiv, în ora României.
export function zileLucratoare(dela: Date, panaLa: Date, sarbatoare?: EsteSarbatoare): number {
  let zi = ziBucuresti(dela);
  const sfarsit = ziBucuresti(panaLa);
  let n = 0;
  for (let i = 0; i < 400 && zi < sfarsit; i++) {
    zi = adaugaZile(zi, 1);
    if (esteZiLucratoare(zi, sarbatoare)) n++;
  }
  return n;
}

// ===== Propunerea de apel: 2–3 intervale concrete, în zile lucrătoare, începând de poimâine =====
const INTERVALE: readonly string[] = ["între 10:00 și 12:00", "între 14:00 și 16:00", "între 9:30 și 11:00"];

export function sloturiApel(azi: Date, sarbatoare?: EsteSarbatoare, cate = 3): string {
  const n = Math.max(2, Math.min(3, cate));
  const zile: string[] = [];
  let zi = adaugaZile(ziBucuresti(azi), 2);
  for (let i = 0; i < 30 && zile.length < n * 2; i++, zi = adaugaZile(zi, 1)) if (esteZiLucratoare(zi, sarbatoare)) zile.push(zi);
  // O zi între ele, ca propunerile să nu fie în zile consecutive.
  const alese = [zile[0], zile[2], zile[4]].slice(0, n).filter(Boolean);
  const f = new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const text = alese.map((z, i) => `${f.format(new Date(`${z}T12:00:00Z`))}, ${INTERVALE[i % INTERVALE.length]}`);
  return text.length <= 1 ? text.join("") : `${text.slice(0, -1).join("; ")} sau ${text[text.length - 1]}`;
}

// ===== Salutul =====
const BARBATI_IN_A = new Set(["mihnea", "luca", "toma", "horia", "mircea", "costea", "sava", "nicola", "ilia", "andrea", "barbu", "vasilica", "gica", "nicusor"]);
const SUFIX_NUME = /(escu|eanu|anu|ianu|ache|oiu|aru|ovici|ici|ski|schi)$/;

// „doamna <Nume>” / „domnule <Nume>” doar când e clar din nume; altfel numele complet. E o presupunere: colegul o vede în ciornă și o poate corecta.
export function salutPentru(numeComplet: string): { salut: string; ghicit: boolean } {
  const parti = numeCurat(numeComplet).replace(/[^\p{L}\s'-]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (parti.length < 2) return { salut: `Bună ziua, ${numeCurat(numeComplet)},`, ghicit: false };
  const n = parti.map(faraDiacritice);
  const feminine = n.map((x, i) => (x.endsWith("a") && !BARBATI_IN_A.has(x) && !SUFIX_NUME.test(x) ? i : -1)).filter((i) => i >= 0);
  if (feminine.length === 1 && parti.length <= 3) {
    const rest = parti.filter((_, i) => i !== feminine[0]);
    return { salut: `Bună ziua, doamna ${rest.join(" ")},`, ghicit: true };
  }
  if (feminine.length === 0 && parti.length === 2) {
    const fam = n.findIndex((x) => SUFIX_NUME.test(x));
    if (fam >= 0 && !SUFIX_NUME.test(n[1 - fam])) return { salut: `Bună ziua, domnule ${parti[fam]},`, ghicit: true };
  }
  return { salut: `Bună ziua, ${parti.join(" ")},`, ghicit: false };
}

const RE_ARE_SALUT = /^\s*(bun[aă] (ziua|dimineata|seara)|stimat[ae]?\b|draga\b|dragi\b|salut\b|buna\b)/;

// Modelul trebuie să înceapă cu salutul calculat de platformă; dacă nu o face, îl punem noi (nu lăsăm un email fără salut sau cu gen ghicit greșit de model).
export function asiguraSalut(mesaj: string, salut: string): string {
  const m = mesaj.trim();
  if (faraDiacritice(m).startsWith(faraDiacritice(salut).replace(/,\s*$/, ""))) return m;
  if (!RE_ARE_SALUT.test(faraDiacritice(m))) return `${salut}\n\n${m}`;
  const [prima, ...rest] = m.split("\n");
  // Salutul propriu-zis e pe primul rând, scurt, terminat cu virgulă: îl înlocuim cu cel calculat. Altfel (salut lipit de text) îl lăsăm și colegul vede avertismentul „salut diferit”.
  return prima.length <= 70 && /,\s*$/.test(prima) ? [salut, ...rest].join("\n") : m;
}

// ===== Verificările automate ale ciornei =====
export type GravitateProblema = "bloc" | "atentie";
export type CodProblema =
  | "firma_lipsa" // numele firmei nu apare
  | "destinatar_lipsa" // numele destinatarului nu apare
  | "loc_de_completat" // [..], <..>, {..}, xxx, TODO
  | "prea_lung"
  | "prea_scurt"
  | "link" // link care nu e în lista permisă
  | "alt_coleg" // numele altui coleg în text
  | "alta_firma" // numele altei firme din lotul de ciorne
  | "salut_lipsa"
  | "salut_schimbat"
  | "subiect_gol"
  | "subiect_lung";
export type Problema = { cod: CodProblema; gravitate: GravitateProblema; detaliu?: string; numar?: number; maxim?: number };

const FORMA = /\b(s\.?r\.?l\.?|s\.?a\.?|s\.?c\.?|s\.?n\.?c\.?|pfa|ii|srl-d|ltd|gmbh|impex|com|prod|trading|group|grup)\b/g;
const cuvinteFirma = (f: string) => faraDiacritice(f).replace(/[„”"'.,&()-]/g, " ").replace(FORMA, " ").split(/\s+/).filter((w) => w.length >= 3);
const RE_SALUT = /^\s*(bun[aă] (ziua|dimineata|seara)|stimat[ae]?\b|draga\b|dragi\b|salut\b|buna\b)/;
const RE_LOC = /\[[^\]]*\]|<[^>]{1,40}>|\{[^}]*\}|\bxxx+\b|\bTODO\b|lorem ipsum/i;
const RE_LINK = /(?:https?:\/\/|www\.)[^\s<>"')]+|\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:ro|com|org|net|eu|info|biz|io)\b(?:\/[^\s<>"')]*)?/gi;
export const MAX_CUVINTE = { prim: 170, revenire: 110 } as const;
export const MIN_CUVINTE = { prim: 25, revenire: 12 } as const;

export type IntrareVerificare = {
  firma: string;
  contactNume: string;
  subiect: string;
  mesaj: string;
  tip?: TipMesaj;
  // Numele altor firme din coada de ciorne (să nu se amestece textele).
  alteFirme?: string[];
  // Numele colegilor din organizație, în afară de expeditor: textul nu are voie să vorbească în numele lor.
  alteNumeColegi?: string[];
  // Linkuri care au voie în text (ex. pagina publică a cazului propus).
  linkuriPermise?: string[];
  // Salutul calculat de platformă; dacă textul începe altfel, e semnalat (nu blochează).
  salutAsteptat?: string;
};

export function verificaCiorna(x: IntrareVerificare): Problema[] {
  const p: Problema[] = [];
  const tip: TipMesaj = x.tip ?? "prim";
  const mesaj = x.mesaj.trim();
  const subiect = x.subiect.trim();
  const text = faraDiacritice(`${subiect}\n${mesaj}`);
  const textMesaj = faraDiacritice(mesaj);

  if (!subiect) p.push({ cod: "subiect_gol", gravitate: "bloc" });
  else if (subiect.length > 120) p.push({ cod: "subiect_lung", gravitate: "atentie", numar: subiect.length, maxim: 120 });

  const cf = cuvinteFirma(x.firma);
  if (tip !== "revenire" && cf.length && !cf.some((w) => text.includes(w))) p.push({ cod: "firma_lipsa", gravitate: "atentie", detaliu: x.firma });
  const numeParti = faraDiacritice(x.contactNume).split(/\s+/).filter((w) => w.length >= 3);
  if (tip !== "revenire" && numeParti.length && !numeParti.some((w) => textMesaj.includes(w))) p.push({ cod: "destinatar_lipsa", gravitate: "atentie", detaliu: x.contactNume });

  if (RE_LOC.test(`${subiect}\n${mesaj}`)) p.push({ cod: "loc_de_completat", gravitate: "bloc" });

  const cuvinte = numarCuvinte(mesaj);
  if (cuvinte > MAX_CUVINTE[tip]) p.push({ cod: "prea_lung", gravitate: "bloc", numar: cuvinte, maxim: MAX_CUVINTE[tip] });
  if (cuvinte < MIN_CUVINTE[tip]) p.push({ cod: "prea_scurt", gravitate: "bloc", numar: cuvinte, maxim: MIN_CUVINTE[tip] });

  // Salutul: textul trebuie să înceapă cu un salut; dacă diferă de cel calculat (doamna / domnule), colegul e atenționat.
  if (!RE_SALUT.test(faraDiacritice(mesaj))) p.push({ cod: "salut_lipsa", gravitate: "bloc" });
  else if (x.salutAsteptat && !faraDiacritice(mesaj).startsWith(faraDiacritice(x.salutAsteptat).replace(/,\s*$/, ""))) p.push({ cod: "salut_schimbat", gravitate: "atentie", detaliu: x.salutAsteptat });

  // Linkuri: doar cele din lista permisă (platforma nu inventează linkuri, iar un link necunoscut poate ajunge în spam).
  const permise = (x.linkuriPermise ?? []).map((l) => l.toLowerCase().replace(/\/+$/, ""));
  const gasite = `${subiect}\n${mesaj}`.match(RE_LINK) ?? [];
  const nepermise = gasite
    .map((l) => l.replace(/[.,;:!?]+$/, ""))
    .filter((l) => {
      const n = l.toLowerCase().replace(/\/+$/, "");
      return !permise.some((a) => n === a || n.startsWith(`${a}/`) || a.endsWith(n.replace(/^https?:\/\//, "")));
    });
  if (nepermise.length) p.push({ cod: "link", gravitate: "bloc", detaliu: nepermise[0] });

  for (const nume of x.alteNumeColegi ?? []) {
    const n = faraDiacritice(nume).trim();
    if (n.split(/\s+/).length >= 2 && textMesaj.includes(n)) {
      p.push({ cod: "alt_coleg", gravitate: "bloc", detaliu: nume });
      break;
    }
  }
  for (const alta of x.alteFirme ?? []) {
    const ca = cuvinteFirma(alta).filter((w) => w.length >= 4 && !cf.includes(w));
    if (ca.length && ca.every((w) => text.includes(w))) {
      p.push({ cod: "alta_firma", gravitate: "bloc", detaliu: alta });
      break;
    }
  }
  return p;
}

export const areProbleme = (p: readonly Problema[]): boolean => p.some((x) => x.gravitate === "bloc");

// ===== Destinatarul =====
export type ContactCandidat = {
  id: string;
  nume: string;
  rol: string | null;
  dept: string | null;
  email: string | null;
  acord: "da" | "nu" | "necunoscut";
  cheie: boolean; // „contact direct” (inimioara)
  emailStatus: string | null;
  creat: string;
};
export type MotivRespins = "fara_email" | "email_invalid" | "email_marcat_invalid" | "adresa_generica" | "acord_refuzat" | "fara_acord" | "suprimat";

const RE_EMAIL = /^[^\s@<>(),;:\\"]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;
const RE_FARA_RASPUNS = /^(no[-_.]?reply|do[-_.]?not[-_.]?reply|donotreply|mailer-daemon|postmaster|bounce|abuse|unsubscribe)/i;

export function emailValid(e: string | null | undefined): boolean {
  const t = (e ?? "").trim();
  return t.length <= 254 && !t.includes("..") && RE_EMAIL.test(t);
}

export type OptiuniEligibilitate = { doarCuAcord: boolean; suprimat?: (emailMinuscule: string) => boolean };

export function contactEligibil(c: Pick<ContactCandidat, "email" | "acord" | "emailStatus">, opt: OptiuniEligibilitate): { ok: true } | { ok: false; motiv: MotivRespins } {
  const email = (c.email ?? "").trim().toLowerCase();
  if (!email) return { ok: false, motiv: "fara_email" };
  if (!emailValid(email)) return { ok: false, motiv: "email_invalid" };
  if ((c.emailStatus ?? "").toLowerCase() === "invalid") return { ok: false, motiv: "email_marcat_invalid" };
  if (RE_FARA_RASPUNS.test(email.split("@")[0])) return { ok: false, motiv: "adresa_generica" };
  if (c.acord === "nu") return { ok: false, motiv: "acord_refuzat" };
  if (opt.doarCuAcord && c.acord !== "da") return { ok: false, motiv: "fara_acord" };
  if (opt.suprimat?.(email)) return { ok: false, motiv: "suprimat" };
  return { ok: true };
}

// Cât de aproape de decizie e funcția: 1 = conducere / decident final, 2 = sponsorizări, CSR și buget, 3 = marketing / comunicare, 4 = alte funcții de conducere, 5 = HR, 9 = fără funcție, 10 = secretariat.
export function prioritateRol(rol: string | null | undefined, dept?: string | null): number {
  const t = faraDiacritice(`${rol ?? ""} ${dept ?? ""}`);
  if (!t.trim()) return 9;
  if (/(secretar|asistent|assistant|receptie|office manager)/.test(t)) return 10;
  if (/(administrator|director general|general manager|manager general|\bceo\b|managing|fondator|founder|proprietar|\bowner\b|patron|presedinte|asociat unic)/.test(t)) return 1;
  if (/(csr|sponsoriz|responsabilitate|sustenab|\besg\b|filantrop|comunitate|\bcfo\b|financ|economic|buget|contabil sef)/.test(t)) return 2;
  if (/(marketing|comunicare|communication|\bpr\b|relatii publice|brand)/.test(t)) return 3;
  if (/(director|manager|sef|head of|coordonator)/.test(t)) return 4;
  if (/(resurse umane|\bhr\b|human resources|people)/.test(t)) return 5;
  return 6;
}

export type AlegereDestinatar = { contact: ContactCandidat | null; respinse: { contactId: string; motiv: MotivRespins }[] };

// Destinatarul = persoana marcată „contact direct” (inimioara), altfel decidentul cu cel mai bun rol; contactele cu email invalid, cu acord refuzat sau suprimate nu intră.
export function alegeDestinatar(contacte: readonly ContactCandidat[], opt: OptiuniEligibilitate): AlegereDestinatar {
  const respinse: AlegereDestinatar["respinse"] = [];
  const bune: ContactCandidat[] = [];
  for (const c of contacte) {
    const r = contactEligibil(c, opt);
    if (r.ok) bune.push(c);
    else respinse.push({ contactId: c.id, motiv: r.motiv });
  }
  bune.sort(
    (a, b) =>
      Number(b.cheie) - Number(a.cheie) ||
      prioritateRol(a.rol, a.dept) - prioritateRol(b.rol, b.dept) ||
      Number(b.acord === "da") - Number(a.acord === "da") ||
      a.creat.localeCompare(b.creat) ||
      a.id.localeCompare(b.id),
  );
  return { contact: bune[0] ?? null, respinse };
}

// ===== Eligibilitatea firmei =====
export type MotivFirma = "stearsa" | "respinsa" | "in_contract" | "scris_recent" | "alt_coleg_scrie";
// Etape în care firma e deja în negociere sau contractată: nu îi mai trimitem un email de prim contact. Sponsorii („sponsorizat”) pot fi recontactați pentru anul curent.
export const ETAPE_IN_NEGOCIERE: readonly string[] = ["contract_trimis", "contract_asteptare", "contract_semnat"];
// Etape de început de drum: de aici pleacă emailurile de prim contact (sponsorii sunt recontactați din orice etapă).
export const ETAPE_INITIALE: readonly string[] = ["nou", "pe_viitor", "email", "mesaj"];

export function firmaEligibila(f: { stergeLa?: string | null; status: string | null; stage: string | null; tip: TipMesaj; ultimulPrimMail?: Date | null }, acum: Date): MotivFirma | null {
  if (f.stergeLa) return "stearsa";
  if (f.status === "lost") return "respinsa";
  if (f.tip !== "revenire" && f.stage && ETAPE_IN_NEGOCIERE.includes(f.stage)) return "in_contract";
  if (f.tip !== "revenire" && f.ultimulPrimMail && acum.getTime() - f.ultimulPrimMail.getTime() < ZILE_FARA_DUBLURA * ZI_MS) return "scris_recent";
  return null;
}

// ===== Revenirile =====
export type MesajPentruRevenire = { tip: TipMesaj; stare: StareMesaj; trimisLa: Date | null; areRaspunsReal: boolean; areRevenire: boolean };

export function revenireScadenta(m: MesajPentruRevenire, acum: Date, sarbatoare?: EsteSarbatoare): boolean {
  if (m.tip !== "prim" || m.stare !== "trimis" || !m.trimisLa || m.areRaspunsReal || m.areRevenire) return false;
  if (acum.getTime() - m.trimisLa.getTime() > MAX_ZILE_REVENIRE * ZI_MS) return false;
  return zileLucratoare(m.trimisLa, acum, sarbatoare) >= ZILE_PANA_LA_REVENIRE;
}

export const ciornaExpirata = (creatLa: Date, acum: Date): boolean => acum.getTime() - creatLa.getTime() > ZILE_VALABILITATE_CIORNA * ZI_MS;

// ===== Trimiterea =====
// O trimitere „se_trimite” mai veche de 10 minute poate fi reluată (procesul a murit între revendicare și răspunsul serverului).
export const trimitereBlocata = (seTrimiteLa: Date | null, acum: Date): boolean => !!seTrimiteLa && acum.getTime() - seTrimiteLa.getTime() > MINUTE_BLOCARE_TRIMITERE * 60_000;

// Eroare SMTP SIGURĂ (mesajul n-a plecat): conectare/autentificare eșuată sau respingere clară înainte de DATA. La timeout sau cădere a conexiunii în timpul DATA nu știm dacă a plecat.
export function esecSigurDeTrimitere(e: unknown): boolean {
  const x = (e ?? {}) as { code?: unknown; command?: unknown; responseCode?: unknown };
  const cod = typeof x.code === "string" ? x.code : "";
  const comanda = typeof x.command === "string" ? x.command : "";
  const rc = typeof x.responseCode === "number" ? x.responseCode : null;
  if (["EAUTH", "EENVELOPE", "EDNS", "ECONNREFUSED", "ENOTFOUND", "EPROTOCOL", "ETLS", "EMESSAGE"].includes(cod)) return true;
  if (rc !== null && rc >= 400 && rc < 600 && comanda !== "DATA END" && comanda !== ".") return true;
  if (["ETIMEDOUT", "ESOCKET", "ECONNECTION", "ECONNRESET"].includes(cod)) return comanda === "CONN" || comanda === "EHLO" || comanda === "HELO" || comanda.startsWith("AUTH") || comanda === "STARTTLS" || comanda === "MAIL FROM" || comanda === "RCPT TO";
  return false;
}

// Message-ID-ul emailului nostru: poartă prefixul „agt.” ca răspunsurile să se recunoască, iar domeniul expeditorului, ca antetul să fie valid pentru serverul lui.
export function genereazaMessageId(idMesaj: string, adresaExpeditor: string): string {
  const domeniu = (adresaExpeditor.split("@")[1] ?? "localhost").toLowerCase().replace(/[^a-z0-9.-]/g, "");
  return `<agt.${idMesaj.replace(/-/g, "")}@${domeniu || "localhost"}>`;
}
export const esteMessageIdAgent = (id: string): boolean => id.trim().toLowerCase().startsWith("<agt.");

// ===== Corpul emailului =====
export const escHtml = (s: string): string => s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string);

export const curataSemnatura = (s: string): string => s.replace(/\r/g, "").split("\n").map((l) => l.trim().slice(0, 120)).filter(Boolean).slice(0, 8).join("\n");

export function semnaturaHtml(semnatura: string): string {
  const linii = curataSemnatura(semnatura);
  return linii ? `<div style="margin-top:16px;color:#444;font-size:13px">${escHtml(linii).replace(/\n/g, "<br>")}</div>` : "";
}

export type SubsolEmail = { text: string; linkDezabonare?: string; etichetaLink?: string };

// Subsolul de dezabonare: răspunsul „STOP” e mereu valabil; linkul semnat (lib/dezabonare.ts) se adaugă când e disponibil.
export function subsolHtml(s: SubsolEmail): string {
  const link = s.linkDezabonare ? ` <a href="${escHtml(s.linkDezabonare)}" style="color:#888">${escHtml(s.etichetaLink ?? "Dezabonare")}</a>` : "";
  return `<div style="margin-top:20px;border-top:1px solid #eee;padding-top:8px;color:#888;font-size:11px">${escHtml(s.text)}${link}</div>`;
}

export function corpEmailHtml(mesaj: string, semnatura: string, opt: { subsol?: SubsolEmail; pixelUrl?: string } = {}): string {
  return (
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1f1f1f">` +
    mesaj
      .trim()
      .split(/\n\s*\n/)
      .map((p) => `<p style="margin:0 0 12px">${escHtml(p).replace(/\n/g, "<br>")}</p>`)
      .join("") +
    semnaturaHtml(semnatura) +
    (opt.subsol ? subsolHtml(opt.subsol) : "") +
    (opt.pixelUrl ? `<img src="${escHtml(opt.pixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0">` : "") +
    `</div>`
  );
}

export function corpEmailText(mesaj: string, semnatura: string, subsol?: SubsolEmail): string {
  const sem = curataSemnatura(semnatura);
  return `${mesaj.trim()}${sem ? `\n\n${sem}` : ""}${subsol ? `\n\n--\n${subsol.text}${subsol.linkDezabonare ? ` ${subsol.linkDezabonare}` : ""}` : ""}`;
}

// Un singur rând din antet nu are voie să conțină CR/LF (injectare de antete).
export const faraRanduriNoi = (s: string): string => s.replace(/[\r\n]+/g, " ").trim();

// ===== Extragerea JSON din răspunsul modelului =====
export function extrageJson(text: string): Record<string, unknown> | null {
  const t = text.replace(/```(?:json)?/gi, "");
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    const v: unknown = JSON.parse(t.slice(a, b + 1));
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
