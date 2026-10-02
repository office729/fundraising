import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

// Trimitere prin SMTP direct (cutie poștală reală pe domeniul organizației,
// ex. cPanel) — nu printr-un furnizor tranzacțional (Resend etc). Alegere
// deliberată: organizația are deja o cutie de email pe domeniul propriu.
//
// Mediu (toate obligatorii):
//   SMTP_HOST  — ex. mail.alexandrit.ro
//   SMTP_PORT  — 465 (SSL/TLS) sau 587 (STARTTLS)
//   SMTP_USER  — adresa completă a cutiei (ex. vlad.placinta@alexandrit.ro)
//   SMTP_PASS  — parola cutiei
//   EMAIL_FROM — adresa afișată ca expeditor (de regulă aceeași cu SMTP_USER)
//
// Inițializare LAZY (ca la Twilio/db) — conexiunea se creează la prima
// folosire, nu la evaluarea modulului, altfel `next build` ar pica fără
// variabilele de mediu disponibile. Complet inert până sunt completate.
let cached: Transporter | null = null;

function getTransporter(): Transporter {
  if (cached) return cached;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !port || !user || !pass) {
    throw new Error("SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS lipsesc din mediu — email-ul nu e configurat.");
  }
  cached = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = SSL/TLS direct; 587 = STARTTLS (secure: false, upgradează singur)
    auth: { user, pass },
    // Pool mic, intenționat — e o cutie poștală obișnuită de hosting
    // (cPanel), nu un furnizor tranzacțional cu infrastructură dedicată;
    // nu trimitem conexiuni/mesaje în paralel agresiv, ca să nu lovim
    // limitele de rată ale hostingului.
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
    // Fără timeouts, un server SMTP agățat ține cererea (webhook Stripe, cron)
    // până la valorile implicite din nodemailer (2 min conectare / 10 min socket).
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 45_000,
  });
  return cached;
}

export function emailConfigurat(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM);
}

export type DestinatarEmail = { email: string; nume: string };

// Trimitere individuală (nu în lot) — pentru declanșatoare 1-la-1 (ex. email
// de mulțumire imediat după o donație), unde nu are sens să aștepți un batch.
// Best-effort: erorile se propagă către apelant, care alege dacă le prinde
// (de regulă da — un email eșuat nu trebuie să strice confirmarea plății).
export async function trimiteEmail(params: { to: string; subiect: string; html: string }): Promise<void> {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM lipsește din mediu.");
  await transporter.sendMail({ from, to: params.to, subject: params.subiect, html: params.html });
}

// Trimite câte un email individual fiecărui destinatar (nu un singur email cu
// toți în CC/BCC — fiecare donator își vede doar propriul nume). Secvențial,
// nu în paralel — o cutie de hosting obișnuită nu are limitele generoase ale
// unui furnizor tranzacțional; o eroare la un destinatar (adresă invalidă
// etc.) nu oprește trimiterea către restul.
export async function trimiteEmailuriInLot(params: {
  destinatari: DestinatarEmail[];
  subiect: (d: DestinatarEmail) => string;
  html: (d: DestinatarEmail) => string;
  // Antete per destinatar — ex. List-Unsubscribe / List-Unsubscribe-Post
  // (RFC 8058), obligatorii pentru emailuri de campanie.
  headers?: (d: DestinatarEmail) => Record<string, string>;
  // Verificat înainte de fiecare email — true oprește trimiterea (deadline-ul
  // funcției serverless); rezultatul are `intrerupt: true`.
  opreste?: () => boolean;
  // Apelat după fiecare email trimis cu succes (ex. jurnal per destinatar). O
  // eroare AICI se propagă (nu e o eroare de trimitere) — apelantul decide.
  laTrimis?: (d: DestinatarEmail) => Promise<void>;
}): Promise<{ trimise: number; esuate: number; intrerupt: boolean }> {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM lipsește din mediu.");

  let trimise = 0;
  let esuate = 0;
  let intrerupt = false;

  for (const d of params.destinatari) {
    if (params.opreste?.()) {
      intrerupt = true;
      break;
    }
    let ok = false;
    try {
      await transporter.sendMail({
        from,
        to: d.email,
        subject: params.subiect(d),
        html: params.html(d),
        ...(params.headers ? { headers: params.headers(d) } : {}),
      });
      ok = true;
    } catch {
      esuate++;
    }
    if (ok) {
      trimise++;
      await params.laTrimis?.(d);
    }
  }

  return { trimise, esuate, intrerupt };
}
