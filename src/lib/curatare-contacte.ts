// Curățarea datelor de contact la import: corectarea greșelilor tipice de e-mail (gmial.com, yaho.ro), semnalarea adreselor imposibile sau fictive, nume cu
// majuscule corecte, telefoane aduse la o formă unică și găsirea dublurilor probabile. Fișier fără importuri, ca să se poată testa direct.
//
// Principiu: corectăm doar ce e aproape sigur (domeniile furnizorilor mari de e-mail) și arătăm mereu ce am schimbat; nimic din ce poate uni două persoane
// diferite (nume, telefon) nu se unește singur: se propune, iar un om confirmă.

const faraDiacritice = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// ============================================================================
// E-mail
// ============================================================================

export type StareEmail = "valid" | "corectat" | "invalid";
export type EvaluareEmail = {
  stare: StareEmail;
  email: string; // forma curată (goală dacă e invalidă)
  original: string;
  motiv: string | null; // ce s-a corectat sau de ce e invalidă
  generic: boolean; // adresă de birou (info@, office@…), nu a unei persoane
};

// Furnizori mari de e-mail: pentru ei corectăm greșelile de scriere ale domeniului.
const FURNIZORI: Record<string, { domeniu: string; variante?: string[] }> = {
  gmail: { domeniu: "gmail.com" },
  yahoo: { domeniu: "yahoo.com", variante: ["ro", "com"] },
  hotmail: { domeniu: "hotmail.com", variante: ["ro", "com"] },
  outlook: { domeniu: "outlook.com", variante: ["com"] },
  icloud: { domeniu: "icloud.com" },
  protonmail: { domeniu: "protonmail.com" },
};

// Domenii reale apropiate de numele unui furnizor: nu se „corectează” niciodată (ex. mail.com, cloud.com).
const DOMENII_REALE_APROPIATE = new Set(["mail", "cloud", "email", "gmx", "live", "yahoo", "hotmail", "outlook", "icloud", "gmail", "protonmail", "proton", "me", "aol", "yandex", "zoho"]);

// Greșeli de scriere ale numelui unui furnizor: o literă lipsă, două litere inversate, o literă dublată (generate, apoi curățate de cuvinte reale).
function variantiGreseli(nume: string): Set<string> {
  const rezultat = new Set<string>();
  for (let i = 0; i < nume.length; i++) {
    rezultat.add(nume.slice(0, i) + nume.slice(i + 1)); // lipsește o literă
    rezultat.add(nume.slice(0, i) + nume[i] + nume.slice(i)); // literă dublată
    if (i < nume.length - 1) rezultat.add(nume.slice(0, i) + nume[i + 1] + nume[i] + nume.slice(i + 2)); // litere inversate
  }
  rezultat.delete(nume);
  for (const r of rezultat) if (r.length < 4 || DOMENII_REALE_APROPIATE.has(r)) rezultat.delete(r);
  return rezultat;
}
const GRESELI_FURNIZOR: Map<string, string> = (() => {
  const harta = new Map<string, string>();
  for (const nume of Object.keys(FURNIZORI)) for (const v of variantiGreseli(nume)) if (!harta.has(v)) harta.set(v, nume);
  // înlocuiri de litere vecine pe tastatură, frecvente
  for (const [v, nume] of [["gnail", "gmail"], ["gmeil", "gmail"], ["gmsil", "gmail"], ["gmqil", "gmail"], ["yahho", "yahoo"], ["uahoo", "yahoo"], ["ysh00", "yahoo"], ["hotnail", "hotmail"], ["outlok", "outlook"], ["outloock", "outlook"], ["hotmal", "hotmail"]]) harta.set(v, nume);
  return harta;
})();

// Terminații de domeniu scrise greșit, fără sens ca domenii reale.
const TLD_GRESIT: Record<string, string> = { con: "com", comm: "com", cim: "com", vom: "com", ocm: "com", c0m: "com", coom: "com", cmo: "com", r0: "ro", roo: "ro", "ro.": "ro" };

const PLACEHOLDER_DOMENII = new Set(["example.com", "example.org", "example.net", "test.com", "test.ro", "exemplu.ro", "exemplu.com", "xxx.com", "xxx.ro", "nomail.com", "nomail.ro", "noemail.com", "noemail.ro", "none.com", "fara.email", "fara-email.ro", "email.ro.invalid", "mail.invalid", "invalid.com", "domain.com", "domeniu.ro", "yourdomain.com"]);
const PLACEHOLDER_LOCAL = new Set(["test", "teste", "testing", "nu", "nu-am", "nuam", "fara", "faraemail", "fara-email", "noemail", "no-email", "nomail", "no", "none", "nimic", "xxx", "xx", "asd", "asdf", "abc", "email", "adresa", "n", "na", "nu.are", "nuare"]);

const PLACEHOLDER_COMPLET = new Set(["nu@are.ro", "nu@are.com", "nu@am.ro", "nu@am.com", "nu@exista.ro", "nu@exista.com", "nu@nu.ro", "nu@nu.com", "fara@mail.ro", "fara@mail.com"]);

const GENERICE = new Set(["info", "office", "contact", "admin", "administrator", "secretariat", "hello", "salut", "noreply", "no-reply", "donotreply", "do-not-reply", "support", "suport", "sales", "vanzari", "marketing", "contabilitate", "birou", "mail", "newsletter", "postmaster", "webmaster", "relatii", "hr", "resurseumane", "reception", "receptie", "comenzi", "abuse", "presa", "pr"]);

const RE_DOMENIU_ETICHETA = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

function invalid(original: string, motiv: string): EvaluareEmail {
  return { stare: "invalid", email: "", original, motiv, generic: false };
}

export function evalueazaEmail(brut: unknown): EvaluareEmail {
  const original = String(brut ?? "").trim();
  if (!original) return invalid(original, "Adresă de e-mail lipsă");
  const modificari: string[] = [];

  let s = original.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
  s = s.replace(/^mailto:/i, "");
  // Mai multe adrese în aceeași celulă: o păstrăm pe prima care arată a e-mail.
  const bucati = s.split(/[;,\s]+/).filter((b) => b.includes("@"));
  if (bucati.length > 1) {
    s = bucati[0];
    modificari.push("Mai multe adrese în aceeași celulă: am păstrat-o pe prima");
  }
  const curatat = s.replace(/^[<"'(\s]+|[>"')\s.,;:]+$/g, "");
  if (curatat !== s) modificari.push("Am scos caracterele din jurul adresei");
  s = curatat.toLowerCase();
  if (/\s/.test(s)) {
    s = s.replace(/\s+/g, "");
    modificari.push("Am scos spațiile din adresă");
  }

  const poz = s.indexOf("@");
  if (poz < 0) return invalid(original, "Adresa nu conține @");
  if (poz !== s.lastIndexOf("@")) return invalid(original, "Adresa conține mai multe @");
  let local = s.slice(0, poz);
  let domeniu = s.slice(poz + 1);
  if (!local) return invalid(original, "Adresa nu are nimic înainte de @");
  if (!domeniu) return invalid(original, "Adresa nu are domeniu după @");
  if (local.length > 64) return invalid(original, "Partea dinainte de @ e prea lungă");
  if (/[^\x00-\x7f]/.test(local)) return invalid(original, "Adresa conține litere cu diacritice");
  if (/\.\./.test(local) || local.startsWith(".") || local.endsWith(".")) {
    const reparat = local.replace(/\.{2,}/g, ".").replace(/^\.+|\.+$/g, "");
    if (!reparat) return invalid(original, "Adresă imposibilă");
    local = reparat;
    modificari.push("Am reparat punctele din adresă");
  }
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return invalid(original, "Adresa conține caractere nepermise");

  // Domeniu: fără punct final, litere latine, etichete valide.
  domeniu = domeniu.replace(/\.+$/g, "").replace(/\.{2,}/g, ".");
  if (/[^\x00-\x7f]/.test(domeniu)) domeniu = faraDiacritice(domeniu);
  if (!domeniu.includes(".")) {
    // „ion@gmail” lipsește terminația: completăm doar pentru furnizorii mari
    const f = FURNIZORI[domeniu] ?? (GRESELI_FURNIZOR.has(domeniu) ? FURNIZORI[GRESELI_FURNIZOR.get(domeniu)!] : undefined);
    if (!f) return invalid(original, "Domeniul nu are terminație (ex. .ro, .com)");
    domeniu = f.domeniu;
    modificari.push(`Am completat domeniul: ${domeniu}`);
  }
  const etichete = domeniu.split(".");
  if (etichete.some((e) => !RE_DOMENIU_ETICHETA.test(e))) return invalid(original, "Domeniul conține caractere nepermise");
  let tld = etichete[etichete.length - 1];
  if (tld.length < 2 || /^\d+$/.test(tld)) return invalid(original, "Terminația domeniului nu e validă");

  // Corectări de domeniu (doar cazuri aproape sigure).
  const initial = domeniu;
  if (TLD_GRESIT[tld]) {
    etichete[etichete.length - 1] = TLD_GRESIT[tld];
    tld = TLD_GRESIT[tld];
  }
  if (etichete.length === 2) {
    const nume = etichete[0];
    const tinta = GRESELI_FURNIZOR.get(nume);
    const furnizor = tinta ? FURNIZORI[tinta] : undefined;
    if (furnizor) {
      const tldFurnizor = furnizor.variante?.includes(tld) ? tld : furnizor.domeniu.split(".")[1];
      etichete[0] = tinta!;
      etichete[1] = tldFurnizor;
    } else if (nume === "gmail" && tld !== "com") {
      // gmail există doar cu .com (gmail.ro, gmail.co, gmail.cm nu sunt adrese reale)
      etichete[1] = "com";
    } else if (FURNIZORI[nume] && ["co", "cm", "om", "cpm", "ne"].includes(tld)) {
      // la ceilalți furnizori corectăm doar terminațiile care nu există (yahoo.co, hotmail.cm); yahoo.fr, hotmail.it etc. sunt reale
      etichete[1] = FURNIZORI[nume].domeniu.split(".")[1];
    }
  }
  domeniu = etichete.join(".");
  if (domeniu !== initial) modificari.push(`Am corectat domeniul: ${initial} → ${domeniu}`);

  if (PLACEHOLDER_COMPLET.has(`${local}@${domeniu}`)) return invalid(original, "Adresă fictivă");
  if (PLACEHOLDER_DOMENII.has(domeniu)) return invalid(original, "Adresă de exemplu, nu a unei persoane");
  const localFaraPunct = local.replace(/[._-]/g, "");
  const primaEticheta = domeniu.split(".")[0];
  if ((PLACEHOLDER_LOCAL.has(local) || PLACEHOLDER_LOCAL.has(localFaraPunct)) && ["test", "exemplu", "example", "xxx", "email", "nomail", "noemail", "none", "fara", "nu"].includes(primaEticheta)) return invalid(original, "Adresă fictivă");
  if (/^(.)\1{3,}$/.test(localFaraPunct)) return invalid(original, "Adresă fictivă");

  const email = `${local}@${domeniu}`;
  const generic = GENERICE.has(localFaraPunct) || GENERICE.has(local);
  // Doar schimbarea majusculelor sau a spațiilor din jur nu e o „corectare”: se raportează doar ce a contat.
  return { stare: modificari.length > 0 ? "corectat" : "valid", email, original, motiv: modificari.length ? modificari.join("; ") : null, generic };
}

// ============================================================================
// Nume
// ============================================================================

const PARTICULE = new Set(["de", "la", "von", "van", "der", "den", "di", "da", "del", "al", "el"]);

function titluCuvant(cuvant: string): string {
  // cratima și apostroful păstrează fiecare parte cu inițială mare (Popescu-Ionescu, D'Angelo)
  return cuvant
    .split(/([-'’])/)
    .map((p) => (/^[-'’]$/.test(p) || !p ? p : p.charAt(0).toLocaleUpperCase("ro") + p.slice(1).toLocaleLowerCase("ro")))
    .join("");
}

// Numele cu majuscule corecte: „POPESCU ion” → „Popescu Ion”. Un nume deja scris cu litere mari și mici amestecate rămâne cum e.
export function curataNume(brut: unknown): { nume: string; schimbat: boolean } {
  const primit = String(brut ?? "").trim();
  const original = primit.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  if (!original) return { nume: "", schimbat: false };
  const fara = original.replace(/^[\s.,;:_-]+|[\s.,;:_-]+$/g, "");
  if (fara.includes("@") || !/[a-zăâîșțşţ]/i.test(fara)) return { nume: "", schimbat: true };
  const litere = fara.replace(/[^a-zăâîșțşţ]/gi, "");
  if (litere.length < 2) return { nume: "", schimbat: true };
  const areMari = litere !== litere.toLocaleLowerCase("ro");
  const areMici = litere !== litere.toLocaleUpperCase("ro");
  if (areMari && areMici) return { nume: fara, schimbat: fara !== primit };
  const titlu = fara
    .split(" ")
    .map((c, i) => (i > 0 && PARTICULE.has(c.toLocaleLowerCase("ro")) ? c.toLocaleLowerCase("ro") : titluCuvant(c)))
    .join(" ");
  return { nume: titlu, schimbat: titlu !== primit };
}

// ============================================================================
// Telefon (România și număr internațional)
// ============================================================================

export type TelefonCurat = { valid: boolean; canonic: string; afisat: string; tip: "mobil" | "fix" | "strain" | null; original: string };

// Forma canonică (+40…) servește la comparare; forma afișată e cea națională pentru România (0757 401 042) sau +… pentru restul.
export function curataTelefon(brut: unknown): TelefonCurat {
  const original = String(brut ?? "").trim();
  const gol: TelefonCurat = { valid: false, canonic: "", afisat: original, tip: null, original };
  if (!original) return gol;
  // „+40 (0) 757…” sau „0040…” aduse la o singură formă; extensiile („int. 12”) se ignoră.
  const s = original.replace(/(int\.?|ext\.?|interior)\s*\d+.*$/i, "").replace(/\(0\)/g, "");
  let plus = s.trim().startsWith("+");
  let cifre = s.replace(/\D/g, "");
  if (!plus && cifre.startsWith("00")) {
    plus = true;
    cifre = cifre.slice(2);
  }
  if (!cifre) return gol;

  let national = "";
  if (plus) {
    if (cifre.startsWith("40")) national = "0" + cifre.slice(2).replace(/^0/, "");
    else if (cifre.length >= 8 && cifre.length <= 15) return { valid: true, canonic: `+${cifre}`, afisat: `+${cifre}`, tip: "strain", original };
    else return gol;
  } else if (cifre.startsWith("40") && cifre.length === 11) national = "0" + cifre.slice(2);
  else if (cifre.length === 9 && /^[237]/.test(cifre)) national = "0" + cifre;
  else national = cifre;

  if (!/^0[2-3]\d{8}$|^07\d{8}$/.test(national)) return gol;
  const mobil = national.startsWith("07");
  const afisat = mobil ? `${national.slice(0, 4)} ${national.slice(4, 7)} ${national.slice(7)}` : national;
  return { valid: true, canonic: `+40${national.slice(1)}`, afisat, tip: mobil ? "mobil" : "fix", original };
}

// ============================================================================
// Dubluri
// ============================================================================

// Aceeași persoană = același cont de poștă: fără „+eticheta” și fără puncte la Gmail.
export function emailCanonic(email: string): string {
  const brut = (email || "").trim().toLowerCase();
  const [local0, domeniu0] = brut.split("@");
  if (!domeniu0) return brut;
  let local = local0.split("+")[0];
  let domeniu = domeniu0;
  if (domeniu === "gmail.com" || domeniu === "googlemail.com") {
    local = local.replace(/\./g, "");
    domeniu = "gmail.com";
  }
  return `${local}@${domeniu}`;
}

// Numele fără diacritice, litere mici, cuvintele în ordine alfabetică: „Popescu Ion” = „ion popescu”.
export function cheieNumeDublura(nume: string): string {
  return faraDiacritice(nume)
    .replace(/[^a-z\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

const cuvinteNume = (nume: string) => cheieNumeDublura(nume).split(" ").filter((c) => c.length > 1);
// Două nume „seamănă” dacă au aceleași cuvinte sau măcar un cuvânt comun (la nume de cel puțin două cuvinte).
function numeSemanatoare(a: string, b: string): boolean {
  const ca = cuvinteNume(a);
  const cb = cuvinteNume(b);
  if (ca.length === 0 || cb.length === 0) return false;
  if (ca.join(" ") === cb.join(" ")) return true;
  const comune = ca.filter((c) => cb.includes(c)).length;
  return comune >= 1 && Math.min(ca.length, cb.length) >= 2 && comune >= Math.min(ca.length, cb.length) - (Math.min(ca.length, cb.length) > 2 ? 1 : 0);
}

export type PersoanaDubla = { id: string; nume: string; email?: string | null; telefon?: string | null; localitate?: string | null };
export type GrupDubluri = { ids: string[]; motive: ("email" | "telefon" | "nume+localitate")[]; incredere: "mare" | "medie" };

// Grupează persoanele care par aceeași persoană. Reguli:
//  - același e-mail canonic → încredere mare;
//  - același telefon și nume asemănătoare → mare; același telefon cu nume diferite (familie, birou) → medie;
//  - același nume (în orice ordine) și aceeași localitate → medie.
// Nimic nu se îmbină aici: rezultatul e o propunere pentru un om.
export function gasesteDubluri(persoane: readonly PersoanaDubla[]): GrupDubluri[] {
  const parinte = new Map<string, string>();
  const gaseste = (x: string): string => {
    let r = x;
    while (parinte.get(r) !== r) r = parinte.get(r)!;
    let c = x;
    while (parinte.get(c) !== r) {
      const urm = parinte.get(c)!;
      parinte.set(c, r);
      c = urm;
    }
    return r;
  };
  const uneste = (a: string, b: string) => {
    const ra = gaseste(a);
    const rb = gaseste(b);
    if (ra !== rb) parinte.set(ra, rb);
  };
  for (const p of persoane) parinte.set(p.id, p.id);

  const legaturi = new Map<string, { motive: Set<"email" | "telefon" | "nume+localitate">; puternica: boolean }>();
  const noteaza = (a: string, b: string, motiv: "email" | "telefon" | "nume+localitate", puternica: boolean) => {
    uneste(a, b);
    const radacina = a < b ? `${a}|${b}` : `${b}|${a}`;
    const l = legaturi.get(radacina) ?? { motive: new Set(), puternica: false };
    l.motive.add(motiv);
    l.puternica ||= puternica;
    legaturi.set(radacina, l);
  };

  const dupa = (cheie: (p: PersoanaDubla) => string | null) => {
    const harta = new Map<string, PersoanaDubla[]>();
    for (const p of persoane) {
      const k = cheie(p);
      if (!k) continue;
      harta.set(k, [...(harta.get(k) ?? []), p]);
    }
    return [...harta.values()].filter((g) => g.length > 1);
  };

  for (const g of dupa((p) => (p.email ? emailCanonic(p.email) : null))) for (let i = 1; i < g.length; i++) noteaza(g[0].id, g[i].id, "email", true);
  for (const g of dupa((p) => {
    const t = curataTelefon(p.telefon);
    return t.valid ? t.canonic : null;
  })) {
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) noteaza(g[i].id, g[j].id, "telefon", numeSemanatoare(g[i].nume, g[j].nume));
  }
  for (const g of dupa((p) => {
    const n = cheieNumeDublura(p.nume);
    const l = faraDiacritice(p.localitate ?? "").replace(/[^a-z]/g, "");
    return n && n.includes(" ") && l ? `${n}|${l}` : null;
  })) for (let i = 1; i < g.length; i++) noteaza(g[0].id, g[i].id, "nume+localitate", false);

  const grupuri = new Map<string, { ids: Set<string>; motive: Set<"email" | "telefon" | "nume+localitate">; puternica: boolean }>();
  for (const [cheie, l] of legaturi) {
    const [a, b] = cheie.split("|");
    const r = gaseste(a);
    const gr = grupuri.get(r) ?? { ids: new Set(), motive: new Set(), puternica: false };
    gr.ids.add(a);
    gr.ids.add(b);
    for (const m of l.motive) gr.motive.add(m);
    gr.puternica ||= l.puternica;
    grupuri.set(r, gr);
  }
  return [...grupuri.values()]
    .map((g) => ({ ids: [...g.ids], motive: [...g.motive], incredere: (g.puternica ? "mare" : "medie") as "mare" | "medie" }))
    .sort((a, b) => (a.incredere === b.incredere ? b.ids.length - a.ids.length : a.incredere === "mare" ? -1 : 1));
}
