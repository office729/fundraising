// Evenimentele trimise de Waalaxy (LinkedIn) prin webhook: citirea tolerantă a încărcăturii, detectarea unui refuz, tipul evenimentului și regula de stare a persoanei
// (invitat → conectat → a răspuns → refuz, fără retrogradare). Modul pur, fără importuri: se testează direct; accesul la baza de date e în lib/waalaxy-server.ts.
// Răspunsurile nu pot fi citite prin API-ul Waalaxy, ci doar prin webhook (funcția „CRM Sync” a planului lor), de aceea formatul încărcăturii variază și se citește tolerant.

export type TipEveniment = "invitat" | "conectat" | "raspuns";
export type StareOutreach = "invitat" | "conectat" | "a_raspuns" | "refuz";

export const ETICHETE_STARE_OUTREACH: Record<StareOutreach, string> = { invitat: "invitat", conectat: "conectat", a_raspuns: "a răspuns", refuz: "refuz" };
export const RANG_STARE: Record<StareOutreach, number> = { invitat: 1, conectat: 2, a_raspuns: 3, refuz: 4 };

export type EvenimentWaalaxy = {
  tip: TipEveniment;
  refuz: boolean; // răspuns care cere să nu mai fie contactat
  nume: string;
  rol: string;
  firma: string;
  linkedin: string;
  email: string;
  telefon: string;
  campanie: string;
  mesaj: string; // doar pentru clasificare; NU se păstrează în baza de date
};

export const esteStareOutreach = (x: unknown): x is StareOutreach => x === "invitat" || x === "conectat" || x === "a_raspuns" || x === "refuz";

// ===== Refuz =====
// Conservator: „nu acum” sau „nu încă” NU sunt refuz (sunt amânări). Textul se compară fără diacritice și cu litere mici.
const RE_REFUZ = /(nu ma intereseaza|nu sunt interesat|nu doresc|nu,? multumesc|nu multumesc|fara multumesc|\bstop\b|dezabon|retrage[ti]|scoate[ti]?i?[ -]?ma|nu ma mai contacta|nu contactati|va rog nu|renunt)/;

function faraDiacritice(s: string): string {
  return s
    .replace(/[șş]/gi, "s")
    .replace(/[țţ]/gi, "t")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function esteRefuz(mesaj: string | null | undefined): boolean {
  return RE_REFUZ.test(faraDiacritice(mesaj ?? ""));
}

// ===== Citirea încărcăturii =====
// Caută, în obiecte și liste imbricate (până la adâncimea 5), prima valoare text a unei chei din listă (fără diferență între majuscule și minuscule);
// o valoare care e un obiect cu „name” text dă numele. Cheile din prototip nu se citesc niciodată.
function gaseste(obiect: unknown, chei: readonly string[], adancime = 0): string {
  if (!obiect || typeof obiect !== "object" || adancime > 5) return "";
  const dorite = new Set(chei.map((k) => k.toLowerCase()));
  const intrari = Array.isArray(obiect) ? obiect.map((v) => ["", v] as const) : Object.entries(obiect as Record<string, unknown>);
  for (const [k, v] of intrari) {
    if (k && dorite.has(k.toLowerCase())) {
      if (typeof v === "string" && v.trim()) return v.trim();
      if (typeof v === "number" && Number.isFinite(v)) return String(v);
      if (v && typeof v === "object" && typeof (v as { name?: unknown }).name === "string" && (v as { name: string }).name.trim()) return (v as { name: string }).name.trim();
    }
  }
  for (const [, v] of intrari) {
    if (v && typeof v === "object") {
      const r = gaseste(v, chei, adancime + 1);
      if (r) return r;
    }
  }
  return "";
}

const CONTAINERE_PERSOANA = ["prospect", "contact", "lead", "person", "profile"];
const CONTAINERE_ENVELOPA = ["data", "payload", "body", "event"];
function numeDinPersoana(p: unknown, adancime = 0): string {
  if (!p || typeof p !== "object" || Array.isArray(p) || adancime > 5) return "";
  const o = p as Record<string, unknown>;
  if (typeof o.name === "string" && o.name.trim()) return o.name.trim();
  if (typeof o.nume === "string" && o.nume.trim()) return o.nume.trim();
  for (const [k, v] of Object.entries(o)) {
    const cheie = k.toLowerCase();
    if (CONTAINERE_PERSOANA.includes(cheie) || CONTAINERE_ENVELOPA.includes(cheie)) {
      const r = numeDinPersoana(v, adancime + 1);
      if (r) return r;
    }
  }
  return "";
}

const taie = (s: string, n: number) => s.replace(/\s+/g, " ").trim().slice(0, n);

// Un eveniment din încărcătură, sau null dacă nu conține nicio persoană (nici nume, nici LinkedIn, nici e-mail).
export function citesteEveniment(p: unknown): EvenimentWaalaxy | null {
  const prenume = gaseste(p, ["firstname", "first_name", "prenume"]);
  const nume2 = gaseste(p, ["lastname", "last_name"]);
  // Numele persoanei: „fullname” oriunde; altfel prenume + nume; altfel „name” DOAR de la rădăcină sau din obiectul persoanei (prospect, contact, lead, person, profile),
  // nu din companie sau campanie (ambele au și ele un „name”).
  const complet = gaseste(p, ["fullname", "full_name"]) || [prenume, nume2].filter(Boolean).join(" ") || numeDinPersoana(p);
  const nume = taie(complet, 160);
  const linkedin = taie(gaseste(p, ["linkedinurl", "linkedin_url", "profileurl", "profile_url", "linkedin", "salesnavigatorurl"]), 300);
  const email = taie(gaseste(p, ["proemail", "pro_email", "email", "emailaddress"]), 200);
  if (!nume && !linkedin && !email) return null;
  const mesaj = taie(gaseste(p, ["message", "lastmessage", "last_message", "reply", "replycontent", "content", "text"]), 1000);
  const tipBrut = gaseste(p, ["event", "type", "trigger", "action", "status", "state"]).toLowerCase();
  const raspuns = /repl|answer|respon|raspun|răspun/.test(tipBrut) || (Boolean(mesaj) && !/sent|trimis|invit|accept|connect/.test(tipBrut));
  const conectat = /accept|connect/.test(tipBrut);
  const tip: TipEveniment = raspuns ? "raspuns" : conectat ? "conectat" : "invitat";
  return {
    tip,
    refuz: tip === "raspuns" && esteRefuz(mesaj),
    nume,
    rol: taie(gaseste(p, ["occupation", "jobtitle", "job_title", "title", "position", "headline", "rol"]), 200),
    firma: taie(gaseste(p, ["companyname", "company_name", "company", "currentcompany", "current_company", "organization", "firma"]), 200),
    linkedin,
    email,
    telefon: taie(gaseste(p, ["phone", "phonenumber", "phone_number", "telefon"]), 60),
    campanie: taie(gaseste(p, ["campaignname", "campaign_name", "campaign", "campanie"]), 200),
    mesaj,
  };
}

// Încărcătura poate fi un obiect sau o listă (cel mult 50 de evenimente); fiecare element cu o persoană devine un eveniment.
export function citesteEvenimente(corp: unknown): EvenimentWaalaxy[] {
  const lista = Array.isArray(corp) ? corp.slice(0, 50) : [corp];
  const rez: EvenimentWaalaxy[] = [];
  for (const e of lista) {
    const ev = citesteEveniment(e);
    if (ev) rez.push(ev);
  }
  return rez;
}

// ===== Starea persoanei =====
// Starea evenimentului: refuz > răspuns > conectat > invitat.
export function stareDinEveniment(e: Pick<EvenimentWaalaxy, "tip" | "refuz">): StareOutreach {
  return e.refuz ? "refuz" : e.tip === "raspuns" ? "a_raspuns" : e.tip === "conectat" ? "conectat" : "invitat";
}

// Starea nouă a persoanei: nu se retrogradează niciodată (un „invitat” întârziat nu șterge un „conectat”), iar „refuz” e definitiv.
export function stareNoua(existenta: StareOutreach | null | undefined, noua: StareOutreach): StareOutreach {
  if (!existenta || !esteStareOutreach(existenta)) return noua;
  if (existenta === "refuz") return "refuz";
  if (noua === "refuz") return "refuz";
  return RANG_STARE[noua] > RANG_STARE[existenta] ? noua : existenta;
}

// ===== Potrivirea firmei =====
// Numele firmei fără forma juridică de la sfârșit (SRL, SA, SCA, SCS, SNC, PFA, II, IF), fără diacritice și punctuație, cu litere mici.
export function numeFirmaCurat(nume: string): string {
  return faraDiacritice(nume)
    .replace(/[\s,]+(s\.?\s?r\.?\s?l\.?|s\.?\s?a\.?|s\.?\s?c\.?\s?a\.?|s\.?\s?c\.?\s?s\.?|s\.?\s?n\.?\s?c\.?|p\.?\s?f\.?\s?a\.?|i\.?\s?i\.?|i\.?\s?f\.?)\s*$/, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(srl|sa|sca|scs|snc|pfa|ii|if)\b\s*$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cuvantulCelMaiLung(nume: string): string {
  return numeFirmaCurat(nume)
    .split(" ")
    .filter(Boolean)
    .reduce((a, b) => (b.length > a.length ? b : a), "");
}

// Dintre firmele candidate, cea al cărei nume curat coincide EXACT; ambiguu (două sau mai multe) sau lipsă = null.
export function potrivesteFirma<T extends { nume: string }>(numeCautat: string, candidate: readonly T[]): T | null {
  const k = numeFirmaCurat(numeCautat);
  if (k.length < 3) return null;
  const potriviri = candidate.filter((c) => numeFirmaCurat(c.nume) === k);
  return potriviri.length === 1 ? potriviri[0] : null;
}

// Cheia de idempotență a unui eveniment: aceeași încărcătură retrimisă (reîncercările Waalaxy) dă aceeași cheie. Textul mesajului intră în cheie, dar nu se păstrează.
export function cheieIdempotenta(e: EvenimentWaalaxy): string {
  const persoana = (e.linkedin || e.email || e.nume).toLowerCase().replace(/[?#].*$/, "").replace(/\/+$/, "");
  return [persoana, e.tip, e.campanie.toLowerCase(), e.mesaj.toLowerCase()].join("|");
}
