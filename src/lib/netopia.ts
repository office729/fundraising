import "server-only";

import { createHash, createPublicKey, createVerify } from "node:crypto";

// Netopia Payments API v2 — încasarea abonamentelor PLATFORMEI (nu a donațiilor,
// care merg în contul Stripe al fiecărui ONG). Flux cu pagină de plată găzduită
// de Netopia: pornim plata FĂRĂ date de card (nu trec niciodată prin serverul
// nostru, deci nu intrăm sub cerințele PCI de manipulare a cardurilor), clientul
// e redirecționat pe `paymentURL`, iar confirmarea vine ASINCRON pe `notifyUrl`
// (IPN), verificată criptografic — niciodată din redirectul clientului.
//
// Mediu (toate obligatorii pentru a încasa):
//   NETOPIA_API_KEY        — cheia API din contul Netopia (Profil → Securitate)
//   NETOPIA_POS_SIGNATURE  — semnătura punctului de vânzare (POS)
//   NETOPIA_ENV            — "live" sau "sandbox" (implicit "sandbox", ca o
//                            configurare incompletă să nu încaseze bani reali)
// Documentație: https://doc.netopia-payments.com/docs/payment-api/v2.x/intro
//
// NU există o cheie publică per-comerciant pentru verificarea IPN-ului v2 —
// contrar a ce sugerează "Setări tehnice" din Puncte de Vânzare (acolo e
// perechea de chei pentru API-ul VECHI v1, criptare XML tip plic, nu JWT;
// confirmat din documentația lor v1: "certificate is available upon seller
// account creation in Points of sale - Technical settings"). Pentru v2,
// Netopia semnează header-ul `Verification-token` cu O SINGURĂ cheie fixă,
// identică pentru toți comercianții și pentru sandbox/live deopotrivă —
// confirmat din codul sursă oficial al pluginului lor WooCommerce v2
// (github.com/netopiapayments/WooCommerce, v2/wc-netopiapayments-gateway.php,
// `$ntpIpn->publicKeyStr`). Nu e un secret (e publică, deja în codul lor
// open-source), deci o ținem hardcodată aici, nu într-o variabilă de mediu.
const NETOPIA_IPN_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy6pUDAFLVul4y499gz1P
gGSvTSc82U3/ih3e5FDUs/F0Jvfzc4cew8TrBDrw7Y+AYZS37D2i+Xi5nYpzQpu7
ryS4W+qvgAA1SEjiU1Sk2a4+A1HeH+vfZo0gDrIYTh2NSAQnDSDxk5T475ukSSwX
L9tYwO6CpdAv3BtpMT5YhyS3ipgPEnGIQKXjh8GMgLSmRFbgoCTRWlCvu7XOg94N
fS8l4it2qrEldU8VEdfPDfFLlxl3lUoLEmCncCjmF1wRVtk4cNu+WtWQ4mBgxpt0
tX2aJkqp4PV3o5kI4bqHq/MS7HVJ7yxtj/p8kawlVYipGsQj3ypgltQ3bnYV/LRq
8QIDAQAB
-----END PUBLIC KEY-----`;

const BAZA = {
  sandbox: "https://secure.sandbox.netopia-payments.com",
  live: "https://secure.mobilpay.ro/pay",
} as const;

function mediu(): keyof typeof BAZA {
  return process.env.NETOPIA_ENV === "live" ? "live" : "sandbox";
}

export function netopiaConfigurata(): boolean {
  return Boolean(process.env.NETOPIA_API_KEY && process.env.NETOPIA_POS_SIGNATURE);
}

// NETOPIA_PUBLIC_KEY rămâne ca supra-scriere opțională (ex. dacă Netopia
// rotește vreodată cheia de semnare) — implicit, folosim constanta de mai sus.
function cheiePublicaPem(): string {
  const dinMediu = (process.env.NETOPIA_PUBLIC_KEY ?? "").replace(/\\n/g, "\n").trim();
  return dinMediu || NETOPIA_IPN_PUBLIC_KEY;
}

export type DateFacturare = {
  email: string;
  nume: string;
  prenume: string;
  telefon: string;
};

type OrderPentruStart = {
  orderId: string;
  sumaLei: number;
  descriere: string;
  facturare: DateFacturare;
  notifyUrl: string;
  redirectUrl: string;
  cancelUrl?: string;
};

// Corpul cererii e identic pentru toate tipurile de plată — diferă doar
// `payment.instrument` (card nou pe pagina găzduită vs. token salvat, fără
// pagină, fără redirect). Construit o singură dată, ca cele două fluxuri să nu
// diveargă silențios pe restul câmpurilor (facturare, produs, monedă).
function corpCerere(p: OrderPentruStart, instrument: { type: "card" } | { token: string }): unknown {
  const posSignature = process.env.NETOPIA_POS_SIGNATURE;
  const facturare = {
    email: p.facturare.email,
    phone: p.facturare.telefon,
    firstName: p.facturare.prenume,
    lastName: p.facturare.nume,
    city: "București",
    country: 642,
    countryName: "Romania",
    state: "București",
    postalCode: "010000",
    details: "-",
  };
  return {
    config: {
      emailTemplate: "",
      notifyUrl: p.notifyUrl,
      redirectUrl: p.redirectUrl,
      ...(p.cancelUrl ? { cancelUrl: p.cancelUrl } : {}),
      language: "ro",
    },
    payment: {
      options: { installments: 1, bonus: 0 },
      instrument,
      data: {},
    },
    order: {
      ntpID: "",
      posSignature,
      dateTime: new Date().toISOString(),
      description: p.descriere,
      orderID: p.orderId,
      amount: p.sumaLei,
      currency: "RON",
      billing: facturare,
      shipping: facturare,
      products: [{ name: p.descriere, code: "abonament", category: "abonament", price: p.sumaLei, vat: 0 }],
      installments: { selected: 1, available: [0] },
      data: {},
    },
  };
}

// Forma comună a rezultatului unei plăți — folosită atât pentru IPN
// (payment.* din corpul webhook-ului), cât și pentru răspunsul SINCRON al unei
// taxări cu token (fără redirect, deci fără IPN garantat) — ambele confirmate
// prin ACEEAȘI funcție (proceseazaRezultatPlataNetopia), ca logica banilor să
// nu existe în două locuri care ar putea diverge.
export type RezultatPlataNetopia = {
  status: number;
  suma: number | null;
  moneda: string | null;
  ntpId: string | null;
  // Token reutilizabil pentru taxări viitoare — preferăm binding.token (explicit
  // gândit pentru reutilizare, cu data expirării cardului), cu fallback pe
  // payment.token simplu dacă binding lipsește.
  cardToken: string | null;
  cardExpireMonth: number | null;
  cardExpireYear: number | null;
  cardMasked: string | null;
};

type PaymentJson = {
  status?: number;
  amount?: number | string;
  currency?: string;
  ntpID?: string;
  token?: string;
  binding?: { token?: string; expireMonth?: number; expireYear?: number };
  instrument?: { panMasked?: string };
};

function extrageRezultat(payment: PaymentJson | undefined): RezultatPlataNetopia {
  const suma = payment?.amount !== undefined ? Number(payment.amount) : null;
  return {
    status: Number(payment?.status),
    suma: Number.isFinite(suma) ? suma : null,
    moneda: payment?.currency ?? null,
    ntpId: payment?.ntpID ?? null,
    cardToken: payment?.binding?.token ?? payment?.token ?? null,
    cardExpireMonth: payment?.binding?.expireMonth ?? null,
    cardExpireYear: payment?.binding?.expireYear ?? null,
    cardMasked: payment?.instrument?.panMasked ?? null,
  };
}

// Parsează corpul brut al IPN-ului Netopia — folosit DOAR după ce
// verificaIpn() a confirmat semnătura (vezi api/netopia/ipn/route.ts).
export function extrageRezultatDinIpn(corpBrut: string): { orderId: string | null; rezultat: RezultatPlataNetopia } | null {
  let body: { payment?: PaymentJson; order?: { orderID?: string } };
  try {
    body = JSON.parse(corpBrut) as typeof body;
  } catch {
    return null;
  }
  return { orderId: body.order?.orderID ?? null, rezultat: extrageRezultat(body.payment) };
}

async function netopiaStart(body: unknown): Promise<{
  payment?: PaymentJson & { paymentURL?: string };
  error?: { code?: string; message?: string };
  ok: boolean;
  httpStatus: number;
}> {
  const apiKey = process.env.NETOPIA_API_KEY;
  if (!apiKey) throw new Error("netopia_neconfigurat");

  const res = await fetch(`${BAZA[mediu()]}/payment/card/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { payment?: PaymentJson & { paymentURL?: string }; error?: { code?: string; message?: string } } | null;
  return { payment: json?.payment, error: json?.error, ok: res.ok, httpStatus: res.status };
}

// Începe o plată NOUĂ (card încă necunoscut nouă) și întoarce URL-ul paginii
// găzduite de Netopia — clientul introduce cardul ACOLO, niciodată la noi.
export async function pornestePlata(p: OrderPentruStart): Promise<{ paymentUrl: string; ntpId: string | null }> {
  if (!process.env.NETOPIA_POS_SIGNATURE) throw new Error("netopia_neconfigurat");
  const { payment, error, ok } = await netopiaStart(corpCerere(p, { type: "card" }));
  if (!ok || !payment?.paymentURL) {
    console.error("Netopia: pornirea plății a eșuat", error);
    throw new Error("netopia_start_esuat");
  }
  return { paymentUrl: payment.paymentURL, ntpId: payment.ntpID ?? null };
}

// Interoghează statusul unei comenzi direct de la Netopia — cerere PORNITĂ DE
// NOI, autentificată cu API key-ul nostru (nu un webhook primit de la ei), deci
// nu necesită deloc verificarea semnăturii JWT a IPN-ului. Folosită ca fallback
// pe pagina de rezultat, dacă IPN-ul întârzie sau nu ajunge — vezi
// api/abonament/[orgSlug]/rezultat/data.ts. Necesită ntpID (întors sincron de
// pornestePlata la crearea comenzii, salvat separat — vezi netopia-checkout.ts).
export async function interogheazaStatus(p: { orderId: string; ntpId: string }): Promise<RezultatPlataNetopia | null> {
  const apiKey = process.env.NETOPIA_API_KEY;
  const posSignature = process.env.NETOPIA_POS_SIGNATURE;
  if (!apiKey || !posSignature) throw new Error("netopia_neconfigurat");

  const res = await fetch(`${BAZA[mediu()]}/operation/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ posID: posSignature, ntpID: p.ntpId, orderID: p.orderId }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { payment?: PaymentJson; error?: { code?: string; message?: string } } | null;
  // code "00" = găsită și returnată cu succes; orice alt cod (ex. "103" — comandă
  // negăsită) înseamnă că nu avem încă un rezultat de încredere.
  if (!res.ok || json?.error?.code !== "00" || !json.payment) return null;
  return extrageRezultat(json.payment);
}

// Taxează un card SALVAT dintr-o plată anterioară (reînnoire lunară automată,
// vezi api/cron/netopia-reinnoire) — server-to-server, fără pagină găzduită și
// fără să redirecționăm pe nimeni (donatorul/organizația nu e prezentă). Cardul
// nu trece niciodată prin noi: doar token-ul, primit de la Netopia la o plată
// anterioară reușită. Rezultatul vine SINCRON, în răspunsul acestui apel — un
// card recurent refuzat NU declanșează neapărat un IPN separat.
export async function taxeazaCuTokenSalvat(p: OrderPentruStart & { token: string }): Promise<RezultatPlataNetopia> {
  if (!process.env.NETOPIA_POS_SIGNATURE) throw new Error("netopia_neconfigurat");
  const { payment, error, ok, httpStatus } = await netopiaStart(corpCerere(p, { token: p.token }));
  if (!ok && !payment) {
    console.error("Netopia: taxarea cu token a eșuat la nivel de transport", httpStatus, error);
    throw new Error("netopia_token_esuat");
  }
  return extrageRezultat(payment);
}

// --- Verificarea IPN ---------------------------------------------------------
// Netopia trimite POST pe notifyUrl cu antetul `Verification-token`: un JWT
// semnat RSA (cheia lor privată) care trebuie să aibă iss "NETOPIA Payments",
// aud = semnătura POS-ului nostru și sub = SHA-512 (base64) al corpului brut al
// cererii. Verificăm cu cheia publică a POS-ului — fără asta, oricine ar putea
// trimite un IPN fals și ar activa un abonament nemeritat.

function b64urlLaBuffer(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

const ALGORITMI: Record<string, string> = { RS256: "RSA-SHA256", RS384: "RSA-SHA384", RS512: "RSA-SHA512" };

export function verificaIpn(corpBrut: string, tokenAntet: string | null): { ok: true } | { ok: false; motiv: string } {
  const posSignature = process.env.NETOPIA_POS_SIGNATURE;
  const pem = cheiePublicaPem();
  if (!posSignature || !pem) return { ok: false, motiv: "neconfigurat" };
  if (!tokenAntet) return { ok: false, motiv: "lipseste_token" };

  const parti = tokenAntet.trim().split(".");
  if (parti.length !== 3) return { ok: false, motiv: "token_invalid" };
  const [hdrB64, payloadB64, semnaturaB64] = parti;

  try {
    const antet = JSON.parse(b64urlLaBuffer(hdrB64).toString("utf8")) as { alg?: string };
    const algoritm = antet.alg ? ALGORITMI[antet.alg] : undefined;
    if (!algoritm) return { ok: false, motiv: "algoritm_nepermis" };

    const verificator = createVerify(algoritm);
    verificator.update(`${hdrB64}.${payloadB64}`);
    if (!verificator.verify(createPublicKey(pem), b64urlLaBuffer(semnaturaB64))) {
      return { ok: false, motiv: "semnatura_invalida" };
    }

    const claims = JSON.parse(b64urlLaBuffer(payloadB64).toString("utf8")) as {
      iss?: string;
      aud?: string | string[];
      sub?: string;
      exp?: number;
      nbf?: number;
    };
    if (claims.iss !== "NETOPIA Payments") return { ok: false, motiv: "emitent_invalid" };
    const aud = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
    if (!aud.includes(posSignature)) return { ok: false, motiv: "audienta_invalida" };

    const acum = Math.floor(Date.now() / 1000);
    if (typeof claims.exp === "number" && acum > claims.exp) return { ok: false, motiv: "expirat" };
    if (typeof claims.nbf === "number" && acum + 60 < claims.nbf) return { ok: false, motiv: "inca_nevalid" };

    const hash = createHash("sha512").update(corpBrut, "utf8").digest("base64");
    if (claims.sub !== hash) return { ok: false, motiv: "hash_diferit" };

    return { ok: true };
  } catch {
    return { ok: false, motiv: "eroare_verificare" };
  }
}

// Stările plății în IPN (payment.status). 3 = plătit, 5 = confirmat → acces
// acordat. 8 = rambursat. 4 = anulat, 12 = respins → eșuat. Restul (1 nou,
// 13 în verificare antifraudă, 14/15 autentificare în curs) = încă în așteptare,
// nu se schimbă nimic — un IPN final va veni.
export function clasificaStatus(status: number): "reusita" | "esuata" | "rambursata" | "in_asteptare" {
  if (status === 3 || status === 5) return "reusita";
  if (status === 8) return "rambursata";
  if (status === 4 || status === 12) return "esuata";
  return "in_asteptare";
}
