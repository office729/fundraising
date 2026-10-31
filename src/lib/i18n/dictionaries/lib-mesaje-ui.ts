import type { Locale } from "../config";

// Mesaje pe care bibliotecile din src/lib le întorc deja formulate în română, prin funcții care nu primesc `locale`
// (adaptoarele de prospectare, sincronizarea Meta). În engleză se traduc aici; ce nu e cunoscut rămâne neschimbat
// (de exemplu mesajul brut al unui furnizor). Mesajele cu `locale` direct în bibliotecă (granturi, câmpuri personalizate,
// cote de pachet etc.) NU trec pe aici. tests/lib-mesaje-en.test.mjs generează mesajele reale ale bibliotecilor și verifică
// că fiecare are traducere: dacă un text sursă se schimbă, testul pică în loc să apară româna în interfața engleză.

type Tabel = Record<string, string>;
type Tipar = [RegExp, (m: RegExpExecArray) => string];

function traduce(text: string, locale: Locale, exact: Tabel, tipare: Tipar[]): string {
  if (locale === "ro") return text;
  const direct = exact[text];
  if (direct) return direct;
  for (const [re, f] of tipare) {
    const m = re.exec(text);
    if (m) return f(m);
  }
  return text;
}

// ---- Prospectare de decidenți: lib/prospectare/motor.ts ----

const PROSPECTARE_EXACT: Tabel = {
  "Cheia Waalaxy nu mai e acceptată. Un administrator o poate actualiza în Setări → Prospectare.": "The Waalaxy key is no longer accepted. An administrator can update it in Settings → Prospecting.",
  "Limita zilnică de căutări a organizației a fost atinsă; continuă mâine.": "The organization's daily search limit has been reached; continue tomorrow.",
  "Căutarea a durat prea mult și s-a oprit; rezultatele de până acum au fost păstrate. Încearcă din nou.": "The search took too long and was stopped; the results so far have been kept. Try again.",
  "Hunter a fost sărit: firma nu are site completat, iar Hunter caută după domeniu. Completează site-ul firmei sau adaugă un contact cu e-mail de firmă (nu Gmail, Yahoo etc.).":
    "Hunter was skipped: the company has no website filled in, and Hunter searches by domain. Fill in the company's website or add a contact with a company email (not Gmail, Yahoo, etc.).",
};

const PROSPECTARE_TIPARE: Tipar[] = [
  [/^Cheia (.+) nu mai e acceptată \(poate a expirat sau a fost înlocuită\)\. Un administrator o poate actualiza în Setări → Prospectare\.$/, (m) => `The ${m[1]} key is no longer accepted (it may have expired or been replaced). An administrator can update it in Settings → Prospecting.`],
  [/^Limita contului tău de la (.+) a fost atinsă; încearcă mai târziu\.$/, (m) => `Your ${m[1]} account limit has been reached; try again later.`],
  [/^(.+) are o problemă temporară \(eroarea (\d+)\)\. Cheia ta nu a fost modificată; încearcă din nou peste câteva minute\.$/, (m) => `${m[1]} has a temporary problem (error ${m[2]}). Your key was not changed; try again in a few minutes.`],
  [/^(.+) a răspuns cu eroarea (\d+)\.$/, (m) => `${m[1]} responded with error ${m[2]}.`],
  [/^(.+) nu răspunde acum\. Cheia ta nu a fost modificată; încearcă din nou peste câteva minute\.$/, (m) => `${m[1]} is not responding right now. Your key was not changed; try again in a few minutes.`],
];

// Traduce un mesaj de eroare/avertisment al motorului de prospectare (motor.ts: erori ale furnizorilor, limite, timp depășit).
export function traduEroareProspectare(text: string, locale: Locale): string {
  return traduce(text, locale, PROSPECTARE_EXACT, PROSPECTARE_TIPARE);
}

// ---- Performanța reclamelor, conexiunea Meta: lib/reclame/meta-api.ts și meta-sync.ts ----

const META_EXACT: Tabel = {
  "Tokenul de acces a expirat sau a fost revocat. Generează unul nou și reconectează contul.": "The access token has expired or been revoked. Generate a new one and reconnect the account.",
  "Tokenul nu are permisiunea ads_read pe acest cont publicitar.": "The token does not have the ads_read permission on this ad account.",
  "Interogarea întoarce prea multe date; intervalul se restrânge.": "The query returns too much data; the range is being narrowed.",
  "Meta a limitat temporar cererile. Sincronizarea se reia mai târziu.": "Meta has temporarily limited requests. The sync will resume later.",
  "Contul publicitar nu a fost găsit sau tokenul nu are acces la el. Verifică ID-ul contului.": "The ad account was not found or the token has no access to it. Check the account ID.",
  "Meta nu a răspuns corect. Sincronizarea se reia mai târziu.": "Meta did not respond correctly. The sync will resume later.",
  "Nu am putut contacta Meta. Sincronizarea se reia mai târziu.": "We could not reach Meta. The sync will resume later.",
  "Prea multe pagini de rezultate; restrânge perioada.": "Too many pages of results; narrow the period.",
  "Sincronizarea nu a reușit. Încearcă din nou peste puțin timp.": "The sync did not succeed. Try again in a little while.",
  "Conexiunea cere reconectare: generează un token nou și reconectează contul.": "The connection needs to be reconnected: generate a new token and reconnect the account.",
  "O sincronizare e deja în curs.": "A sync is already in progress.",
  "Sincronizarea a depășit timpul alocat; intervalul rămas se reia la următoarea rulare.": "The sync exceeded its time limit; the remaining range will resume on the next run.",
  "ID-ul contului publicitar nu e valid. Îl găsești în Ads Manager (cifre, cu sau fără act_).": "The ad account ID is not valid. You can find it in Ads Manager (digits, with or without act_).",
  "Tokenul nu pare valid. Lipește tokenul de acces generat pentru utilizatorul de sistem, fără spații.": "The token does not look valid. Paste the access token generated for the system user, without spaces.",
  "Conectarea automată nu e disponibilă momentan. Scrie echipei Alexandrit; între timp poți folosi Import costuri.": "Automatic connection is not available right now. Write to the Alexandrit team; in the meantime you can use Cost import.",
  "Nu am putut verifica contul acum. Încearcă din nou peste puțin timp.": "We could not verify the account right now. Try again in a little while.",
};

const META_TIPARE: Tipar[] = [
  [/^Meta a refuzat cererea \(cod (.+)\)\.$/, (m) => `Meta rejected the request (code ${m[1]}).`],
  [/^Contul folosește moneda (.+): setează cursul de conversie în lei la reconectare\.$/, (m) => `The account uses the ${m[1]} currency: set the conversion rate to lei when reconnecting.`],
  [/^Moneda contului s-a schimbat \((.+) față de (.+)\)\. Reconectează contul\.$/, (m) => `The account currency has changed (${m[1]} versus ${m[2]}). Reconnect the account.`],
  [/^Contul folosește moneda (.+)\. Introdu cursul de conversie în lei \(de exemplu 4,60\)\.$/, (m) => `The account uses the ${m[1]} currency. Enter the conversion rate to lei (for example 4.60).`],
];

// Traduce un mesaj al conexiunii Meta (conectare, sincronizare, „ultima eroare” păstrată pe conexiune).
export function traduEroareMeta(text: string, locale: Locale): string {
  return traduce(text, locale, META_EXACT, META_TIPARE);
}

// ---- Curățarea adreselor de e-mail la import: lib/curatare-contacte.ts (evalueazaEmail) ----

const EMAIL_EXACT: Tabel = {
  "Adresă de e-mail lipsă": "Email address missing",
  "Mai multe adrese în aceeași celulă: am păstrat-o pe prima": "Several addresses in the same cell: kept the first one",
  "Am scos caracterele din jurul adresei": "Removed the characters around the address",
  "Am scos spațiile din adresă": "Removed the spaces from the address",
  "Adresa nu conține @": "The address does not contain @",
  "Adresa conține mai multe @": "The address contains more than one @",
  "Adresa nu are nimic înainte de @": "The address has nothing before the @",
  "Adresa nu are domeniu după @": "The address has no domain after the @",
  "Partea dinainte de @ e prea lungă": "The part before the @ is too long",
  "Adresa conține litere cu diacritice": "The address contains letters with diacritics",
  "Adresă imposibilă": "Impossible address",
  "Am reparat punctele din adresă": "Fixed the dots in the address",
  "Adresa conține caractere nepermise": "The address contains disallowed characters",
  "Domeniul nu are terminație (ex. .ro, .com)": "The domain has no ending (e.g. .ro, .com)",
  "Domeniul conține caractere nepermise": "The domain contains disallowed characters",
  "Terminația domeniului nu e validă": "The domain ending is not valid",
  "Adresă fictivă": "Fake address",
  "Adresă de exemplu, nu a unei persoane": "A sample address, not a real person's",
};
const EMAIL_TIPARE: Tipar[] = [
  [/^Am completat domeniul: (.+)$/, (m) => `Completed the domain: ${m[1]}`],
  [/^Am corectat domeniul: (.+) → (.+)$/, (m) => `Corrected the domain: ${m[1]} → ${m[2]}`],
];

// Traduce motivul unei adrese de e-mail respinse sau corectate la import; mai multe motive unite cu „; ” se traduc pe rând.
export function traduMotivEmail(text: string, locale: Locale): string {
  if (locale === "ro" || !text) return text;
  return text
    .split("; ")
    .map((p) => traduce(p, locale, EMAIL_EXACT, EMAIL_TIPARE))
    .join("; ");
}
