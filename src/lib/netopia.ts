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
//   NETOPIA_PUBLIC_KEY     — cheia publică PEM a POS-ului, pentru verificarea IPN
//   NETOPIA_ENV            — "live" sau "sandbox" (implicit "sandbox", ca o
//                            configurare incompletă să nu încaseze bani reali)
// Documentație: https://doc.netopia-payments.com/docs/payment-api/v2.x/intro

const BAZA = {
  sandbox: "https://secure.sandbox.netopia-payments.com",
  live: "https://secure.mobilpay.ro/pay",
} as const;

function mediu(): keyof typeof BAZA {
  return process.env.NETOPIA_ENV === "live" ? "live" : "sandbox";
}

export function netopiaConfigurata(): boolean {
  return Boolean(process.env.NETOPIA_API_KEY && process.env.NETOPIA_POS_SIGNATURE && process.env.NETOPIA_PUBLIC_KEY);
}

// Cheia publică poate fi lipită în Vercel cu \n literal în loc de linii noi.
function cheiePublicaPem(): string {
  return (process.env.NETOPIA_PUBLIC_KEY ?? "").replace(/\\n/g, "\n").trim();
}

export type DateFacturare = {
  email: string;
  nume: string;
  prenume: string;
  telefon: string;
};

export type PornestePlataParams = {
  orderId: string;
  sumaLei: number;
  descriere: string;
  facturare: DateFacturare;
  notifyUrl: string;
  redirectUrl: string;
  cancelUrl?: string;
};

// Începe o plată și întoarce URL-ul paginii găzduite de Netopia.
export async function pornestePlata(p: PornestePlataParams): Promise<{ paymentUrl: string; ntpId: string | null }> {
  const apiKey = process.env.NETOPIA_API_KEY;
  const posSignature = process.env.NETOPIA_POS_SIGNATURE;
  if (!apiKey || !posSignature) throw new Error("netopia_neconfigurat");

  // Netopia cere câmpuri de facturare/adresă obligatorii; nu colectăm încă adresa
  // ONG-ului la abonare, deci trimitem valori neutre pentru cele lipsă.
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

  const body = {
    config: {
      emailTemplate: "",
      notifyUrl: p.notifyUrl,
      redirectUrl: p.redirectUrl,
      ...(p.cancelUrl ? { cancelUrl: p.cancelUrl } : {}),
      language: "ro",
    },
    payment: {
      options: { installments: 1, bonus: 0 },
      // Fără account/expMonth/expYear/secretCode = pagină de plată găzduită.
      instrument: { type: "card" },
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

  const res = await fetch(`${BAZA[mediu()]}/payment/card/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as {
    payment?: { paymentURL?: string; ntpID?: string };
    error?: { code?: string; message?: string };
  } | null;

  const paymentUrl = json?.payment?.paymentURL;
  if (!res.ok || !paymentUrl) {
    console.error("Netopia: pornirea plății a eșuat", res.status, json?.error);
    throw new Error("netopia_start_esuat");
  }
  return { paymentUrl, ntpId: json?.payment?.ntpID ?? null };
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
