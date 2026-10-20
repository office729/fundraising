// Curățare și mascare de date personale pentru jurnale de eroare și pentru ce vede echipa platformei la suport.
// Modul pur (fără importuri), ca să poată fi testat direct cu `npm test` și folosit din orice context.
//
// ATENȚIE: curățarea unui text liber e „cel mai bun efort”, nu o garanție (un nume propriu scris într-un mesaj nu poate fi
// recunoscut). De aceea jurnalul de erori păstrează doar mesajul tehnic, fără parametrii interogărilor, iar accesul
// echipei platformei la un cont cere acordul organizației (vezi suport_acces).

const REGULI: readonly [RegExp, string][] = [
  // Postgres: „Key (email)=(ion@x.ro) already exists” → valoarea dispare, numele coloanei rămâne (util la diagnoză).
  [/Key \(([^)]*)\)=\(([^)]*)\)/g, "Key ($1)=([valoare])"],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g, "[token]"],
  [/\b(?:sk|pk|rk|whsec)_(?:live|test)?_?[A-Za-z0-9]{8,}\b/g, "[cheie]"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, "[email]"],
  [/\bRO\d{2}[A-Z]{4}[A-Z0-9]{16}\b/gi, "[iban]"],
  // CNP: 13 cifre, prima nenulă — înaintea telefoanelor și a numerelor lungi, ca să nu fie tăiat pe bucăți.
  [/\b[1-9]\d{12}\b/g, "[cnp]"],
  // Telefon românesc (07xx xxx xxx, +40 7xx..., 0040...) și alte numere internaționale cu prefix „+”.
  [/(?:\+\s?40|0040|\b0)[\s.\-]?7\d{2}[\s.\-]?\d{3}[\s.\-]?\d{3}\b/g, "[telefon]"],
  [/\+\d[\d\s.\-]{7,16}\d/g, "[telefon]"],
  // Orice altă secvență lungă de cifre (carduri, conturi): 13–19 cifre, eventual separate.
  [/\b(?:\d[ -]?){13,19}\b/g, "[număr]"],
  // Tokenuri în adrese: /invite/<token>, /dezabonare/<token> și parametri sensibili din query string.
  [/\/(invite|invite-beneficiar|dezabonare|dezabonare-notificare|v|s)\/[A-Za-z0-9_-]{8,}/g, "/$1/:token"],
  [/([?&](?:token|code|key|secret|sig|signature|email)=)[^&\s"']+/gi, "$1[ascuns]"],
];

export function curataPersonale(text: string): string {
  // Erorile Drizzle atașează după „params:” valorile interogării (nume, e-mailuri, CNP criptat): se taie de acolo.
  const i = text.search(/\r?\n\s*params:/i);
  let rezultat = i >= 0 ? text.slice(0, i) : text;
  for (const [regula, inlocuire] of REGULI) rezultat = rezultat.replace(regula, inlocuire);
  return rezultat;
}

export function mascheazaEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const [local, domeniu] = email.split("@");
  if (!domeniu) return "***";
  const puncte = domeniu.split(".");
  const tld = puncte.length > 1 ? puncte[puncte.length - 1] : "";
  return `${local.slice(0, 1)}***@${puncte[0].slice(0, 1)}***${tld ? `.${tld}` : ""}`;
}

export function mascheazaTelefon(telefon: string | null | undefined): string {
  if (!telefon) return "—";
  const cifre = telefon.replace(/\D/g, "");
  if (cifre.length < 4) return "***";
  return `${"*".repeat(cifre.length - 2)}${cifre.slice(-2)}`;
}

export function mascheazaNume(nume: string | null | undefined): string {
  if (!nume || !nume.trim()) return "—";
  return nume
    .trim()
    .split(/\s+/)
    .map((p) => `${p.slice(0, 1).toUpperCase()}.`)
    .join(" ");
}

// Durate pe care o organizație le poate alege pentru accesul de suport (zile). Fără „permanent”: accesul expiră mereu.
export const DURATE_SUPORT_ZILE = [1, 3, 7] as const;
export type DurataSuport = (typeof DURATE_SUPORT_ZILE)[number];

export function esteDurataSuportValida(zile: number): zile is DurataSuport {
  return (DURATE_SUPORT_ZILE as readonly number[]).includes(zile);
}

export type StareAcces = "activ" | "expirat" | "retras";

export function stareAccesSuport(g: { expiraLa: Date | string; retrasLa: Date | string | null }, acum: Date = new Date()): StareAcces {
  if (g.retrasLa) return "retras";
  return new Date(g.expiraLa).getTime() > acum.getTime() ? "activ" : "expirat";
}
