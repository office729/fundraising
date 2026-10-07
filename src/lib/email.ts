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
// Opțional — emailuri 1-la-1 (invitații în echipă, facturi, mulțumiri, notificări de plată) printr-un furnizor tranzacțional
// (ex. Resend: smtp.resend.com:465, utilizator „resend", parola = cheia API). De pe IP-ul partajat al hostingului ajungeau în Spam.
// Dacă lipsesc, emailurile 1-la-1 folosesc același SMTP ca restul. Campaniile în lot (Formular 230, voluntari) rămân pe SMTP_*:
// planul gratuit Resend are 100 emailuri/zi.
//   TX_SMTP_HOST, TX_SMTP_PORT, TX_SMTP_USER, TX_SMTP_PASS, TX_EMAIL_FROM
//
// Inițializare LAZY (ca la Twilio/db) — conexiunea se creează la prima
// folosire, nu la evaluarea modulului, altfel `next build` ar pica fără
// variabilele de mediu disponibile. Complet inert până sunt completate.
type Canal = "lot" | "tx";
const cached: Partial<Record<Canal, Transporter>> = {};

// Canalul „tx" folosește TX_* dacă sunt toate setate, altfel cade pe SMTP_* (comportamentul de până acum).
function setari(canal: Canal) {
  const tx = canal === "tx" && process.env.TX_SMTP_HOST && process.env.TX_SMTP_PORT && process.env.TX_SMTP_USER && process.env.TX_SMTP_PASS;
  return tx
    ? {
        host: process.env.TX_SMTP_HOST,
        port: Number(process.env.TX_SMTP_PORT),
        user: process.env.TX_SMTP_USER,
        pass: process.env.TX_SMTP_PASS,
        from: process.env.TX_EMAIL_FROM || process.env.EMAIL_FROM,
        pool: false,
      }
    : {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.EMAIL_FROM,
        pool: true,
      };
}

function getTransporter(canal: Canal): { transporter: Transporter; from: string } {
  const { host, port, user, pass, from, pool } = setari(canal);
  if (!host || !port || !user || !pass) {
    throw new Error("SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS lipsesc din mediu — email-ul nu e configurat.");
  }
  if (!from) throw new Error("EMAIL_FROM lipsește din mediu.");
  let transporter = cached[canal];
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 = SSL/TLS direct; 587 = STARTTLS (secure: false, upgradează singur)
      auth: { user, pass },
      // Pool mic, intenționat, doar pe căsuța de hosting (cPanel): nu are limitele generoase ale unui furnizor tranzacțional.
      pool,
      ...(pool ? { maxConnections: 2, maxMessages: 50 } : {}),
      // Fără timeouts, un server SMTP agățat ține cererea (webhook Stripe, cron)
      // până la valorile implicite din nodemailer (2 min conectare / 10 min socket).
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 45_000,
    });
    cached[canal] = transporter;
  }
  return { transporter, from };
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
  const { transporter, from } = getTransporter("tx");
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
  const { transporter, from } = getTransporter("lot");

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
