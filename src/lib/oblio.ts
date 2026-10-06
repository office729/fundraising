import "server-only";

// Facturare fiscală automată pentru abonamentul PLATFORMEI (nu pentru donații),
// prin Oblio — vezi termeni.ts secțiunea 6, unde promitem deja emiterea prin
// Oblio. Chemat DUPĂ ce IPN-ul Netopia a confirmat plata (api/netopia/ipn) —
// niciodată înainte, ca să nu emitem o factură pentru bani neîncasați încă.
//
// Config minimă (2 variabile în Vercel, din contul Oblio al MEDIGROUPPLUS SRL):
//   OBLIO_EMAIL   — emailul de autentificare în Oblio
//   OBLIO_SECRET  — token-ul din Oblio → Setări → Date Cont (secretul se
//                   regenerează la fiecare resetare de parolă a contului)
//   OBLIO_CIF     — (recomandat) CIF-ul firmei emitente; obligatoriu dacă
//                   contul Oblio are mai multe firme, altfel emiterea se oprește
// Restul (seria de facturi, cota de TVA) se află
// SINGUR, din contul Oblio — nu mai trebuie configurate separat, ca să nu
// rămână nesincronizate dacă se schimbă din Oblio direct.
// Documentație: https://www.oblio.eu/api

const BAZA = "https://www.oblio.eu/api";

export function oblioConfigurata(): boolean {
  return Boolean(process.env.OBLIO_EMAIL && process.env.OBLIO_SECRET);
}

// Facturile fiscale (și mai ales cele validate în SPV, care se pot corecta doar prin storno) se emit DOAR când plățile
// sunt reale: NETOPIA_ENV=live. În sandbox, plățile sunt de test, iar o factură emisă pentru ele e un document fiscal
// fals. Excepție explicită, pentru testarea integrării Oblio: OBLIO_FACTUREAZA_IN_SANDBOX=1.
export const MARCAJ_NEFACTURAT_SANDBOX = "NEFACTURAT-SANDBOX";

export function facturareFiscalaPermisa(): boolean {
  return process.env.NETOPIA_ENV === "live" || process.env.OBLIO_FACTUREAZA_IN_SANDBOX === "1";
}

// --- Token OAuth2 --------------------------------------------------------
// Cache în memoria procesului (valabil 3600s) — la fiecare invocare Vercel nouă
// se cere un token nou, dar în cadrul aceleiași instanțe calde nu cerem un
// token la fiecare factură (limita Oblio e generoasă, dar fără rost să insistăm).
let tokenCache: { valoare: string; expiraLa: number } | null = null;

async function obtineToken(): Promise<string> {
  if (tokenCache && tokenCache.expiraLa > Date.now() + 30_000) return tokenCache.valoare;

  const email = process.env.OBLIO_EMAIL;
  const secret = process.env.OBLIO_SECRET;
  if (!email || !secret) throw new Error("oblio_neconfigurat");

  const res = await fetch(`${BAZA}/authorize/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: email, client_secret: secret }).toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: string } | null;
  if (!res.ok || !json?.access_token) {
    console.error("Oblio: autentificare eșuată", res.status, json);
    throw new Error("oblio_autentificare_esuata");
  }
  tokenCache = { valoare: json.access_token, expiraLa: Date.now() + Number(json.expires_in ?? 3600) * 1000 };
  return tokenCache.valoare;
}

async function apelOblio<T>(cale: string, init?: RequestInit): Promise<T> {
  const token = await obtineToken();
  const res = await fetch(`${BAZA}${cale}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => null)) as { status?: number; statusMessage?: string; data?: T } | null;
  if (!res.ok || json?.status !== 200) {
    console.error("Oblio: cerere eșuată", cale, res.status, json?.statusMessage);
    throw new Error(`oblio_cerere_esuata: ${json?.statusMessage ?? res.status}`);
  }
  return json.data as T;
}

// --- Descoperire automată: firma emitentă, seria implicită, cota de TVA implicită ---
let cifCache: { valoare: string; expiraLa: number } | null = null;

async function cifFirma(): Promise<string> {
  if (cifCache && cifCache.expiraLa > Date.now()) return cifCache.valoare;
  const companii = await apelOblio<{ cif: string; company: string }[]>("/nomenclature/companies");
  if (companii.length === 0) throw new Error("oblio_fara_firma");

  // Dacă OBLIO_CIF e setat, emitem DOAR pe acea firmă (verificată în contul
  // Oblio). Fără el, acceptăm firma doar când contul are una singură — la mai
  // multe, a o alege pe prima ar putea emite facturi pe firma greșită.
  const dorit = process.env.OBLIO_CIF?.trim();
  const normalizeaza = (c: string) => c.replace(/\s+/g, "").replace(/^RO/i, "");
  let firma: { cif: string; company: string } | undefined;
  if (dorit) {
    firma = companii.find((c) => normalizeaza(c.cif) === normalizeaza(dorit));
    if (!firma) throw new Error("oblio_cif_necunoscut");
  } else {
    if (companii.length > 1) throw new Error("oblio_firma_ambigua");
    firma = companii[0];
  }
  cifCache = { valoare: firma.cif, expiraLa: Date.now() + 3_600_000 };
  return firma.cif;
}

async function serieFacturiImplicita(cif: string): Promise<string> {
  const serii = await apelOblio<{ type: string; name: string; default: boolean }[]>(`/nomenclature/series?cif=${encodeURIComponent(cif)}`);
  const serie = serii.find((s) => s.type === "Factura" && s.default) ?? serii.find((s) => s.type === "Factura");
  if (!serie) throw new Error("oblio_fara_serie_factura");
  return serie.name;
}

async function cotaTvaImplicita(cif: string): Promise<{ name: string; percent: number }> {
  const cote = await apelOblio<{ name: string; percent: number; default: boolean }[]>(`/nomenclature/vat_rates?cif=${encodeURIComponent(cif)}`);
  const cota = cote.find((c) => c.default) ?? cote[0];
  return cota ? { name: cota.name, percent: cota.percent } : { name: "Normala", percent: 0 };
}

// --- Emiterea facturii de abonament ---------------------------------------
export type ClientFactura = {
  nume: string; // denumirea organizației (sau numele persoanei, dacă nu are CIF)
  cif: string | null; // CIF-ul organizației, dacă l-a completat în Setări
  adresa: string | null; // adresa sediului social, completată din Setări
  judet: string | null;
  iban: string | null;
  // Emailul owner-ului organizației — și destinatarul facturii, dacă
  // "Document prin email" e activat în contul Oblio (Setări → E-mailuri
  // alarmă); indiferent de asta, e trimis oricum separat, prin
  // lib/oblio-invoice-email-template.ts (vezi netopia-confirm.ts).
  email: string | null;
};

export type FacturaEmisa = { seriesName: string; number: string; link: string };

// `idempotencyKey` = orderId-ul plății — o retrimitere a aceleiași chei NU
// creează o a doua factură (vezi documentația Oblio), deci reîncercarea unei
// facturi eșuate e sigură.
export async function emiteFacturaAbonament(p: {
  orderId: string;
  client: ClientFactura;
  descriere: string; // ex. "Alexandrit — Pachet START (o lună)"
  sumaLei: number;
  // Referința încasării, cerută de Oblio pentru `collect.documentNumber` —
  // obligatorie când încasarea NU e prin chitanță (cazul nostru, mereu card).
  // Preferăm ntpID-ul Netopia (identificatorul real al tranzacției la
  // procesator); orderId e doar un fallback, pentru cazul rar în care
  // ntpID lipsește.
  referintaIncasare: string;
}): Promise<FacturaEmisa> {
  if (!oblioConfigurata()) throw new Error("oblio_neconfigurat");

  const cif = await cifFirma();
  const [serie, tva] = await Promise.all([serieFacturiImplicita(cif), cotaTvaImplicita(cif)]);

  const azi = new Date().toISOString().slice(0, 10);
  const data = await apelOblio<{ seriesName: string; number: string; link: string }>("/docs/invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cif,
      client: {
        name: p.client.nume,
        cif: p.client.cif ?? undefined,
        address: p.client.adresa ?? undefined,
        state: p.client.judet ?? undefined,
        iban: p.client.iban ?? undefined,
        email: p.client.email ?? undefined,
        // Autocomplete (preluare din firme.ro pe baza CIF-ului) DOAR când
        // organizația nu și-a completat singură adresa în Setări — altfel
        // nu riscăm ca datele scrise explicit de ea să fie suprascrise de
        // ce găsește Oblio automat.
        autocomplete: p.client.cif && !p.client.adresa ? 1 : 0,
      },
      sendEmail: p.client.email ? 1 : 0,
      issueDate: azi,
      collectDate: azi, // se emite DUPĂ ce IPN-ul a confirmat plata — încasarea e deja un fapt
      seriesName: serie,
      language: "RO",
      currency: "RON",
      products: [{ name: p.descriere, price: p.sumaLei, measuringUnit: "buc", quantity: 1, vatName: tva.name, vatPercentage: tva.percent, vatIncluded: 1, productType: "Serviciu" }],
      // `documentNumber` e obligatoriu la Oblio când încasarea nu e prin
      // chitanță ("Parametrul documentNumber lipsește" altfel) — vezi
      // comentariul de la `referintaIncasare` de mai sus.
      collect: { type: "Card", documentNumber: p.referintaIncasare },
      mentions: "Plată online prin Netopia Payments.",
      internalNote: `Comandă ${p.orderId}`,
      idempotencyKey: p.orderId,
    }),
  });

  return { seriesName: data.seriesName, number: data.number, link: data.link };
}
