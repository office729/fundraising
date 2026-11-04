import "server-only";

import { createHash } from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";

import { clasificaEroareTrimitere, type FelEroareTrimitere } from "@/lib/igiena-email";

import { idUri, type AnteteRaspuns } from "./raspunsuri-reguli";
import { esecSigurDeTrimitere, faraRanduriNoi } from "./reguli";
import { ascundeSecret, esteHostInterzis, esteIpPrivat } from "./retea";

// Clienții externi ai agentului: SMTP (trimitere, cu nodemailer) și IMAP (citirea răspunsurilor, cu imapflow), pe căsuța fiecărui utilizator.
// NU ating baza de date (apelurile pot dura): parola vine decriptată de apelant, iar rezultatul se salvează după. Nicio eroare nu conține parola.
// Serverul se rezolvă DNS o singură dată și conexiunea se face pe IP-ul rezolvat (cu numele serverului la verificarea certificatului): nu acceptăm adrese interne
// și nu lăsăm un nume să arate spre o adresă publică la verificare și spre una internă la conectare.

export type CodConexiune = "host" | "auth" | "conexiune" | "tls" | "timp" | "respins" | "altul";
export type EroareConexiune = { cod: CodConexiune; detaliu: string };

export type ConexiuneSmtp = { host: string; port: number; user: string; parola: string };
export type ConexiuneImap = { host: string; port: number; user: string; parola: string };

async function rezolvaPublic(host: string): Promise<{ ok: true; ip: string } | { ok: false }> {
  const h = host.trim().toLowerCase();
  if (esteHostInterzis(h)) return { ok: false };
  if (net.isIP(h)) return esteIpPrivat(h) ? { ok: false } : { ok: true, ip: h };
  try {
    const adrese = await dns.lookup(h, { all: true });
    if (!adrese.length || adrese.some((a) => esteIpPrivat(a.address))) return { ok: false };
    return { ok: true, ip: (adrese.find((a) => a.family === 4) ?? adrese[0]).address };
  } catch {
    return { ok: false };
  }
}

function clasifica(e: unknown, parola: string): EroareConexiune {
  const x = (e ?? {}) as { code?: unknown; message?: unknown; response?: unknown; authenticationFailed?: unknown; responseText?: unknown };
  const cod = typeof x.code === "string" ? x.code : "";
  const mesaj = ascundeSecret(String(x.responseText ?? x.response ?? x.message ?? "eroare"), parola).replace(/\s+/g, " ").slice(0, 200);
  if (cod === "EAUTH" || x.authenticationFailed === true || /auth(entication)? (failed|required)|invalid credentials|login failed|AUTHENTICATIONFAILED/i.test(mesaj)) return { cod: "auth", detaliu: mesaj };
  if (cod === "ETLS" || /certificate|self[- ]signed|tls|ssl/i.test(mesaj)) return { cod: "tls", detaliu: mesaj };
  if (cod === "ETIMEDOUT" || /timed? ?out/i.test(mesaj)) return { cod: "timp", detaliu: mesaj };
  if (["ECONNECTION", "ESOCKET", "ECONNREFUSED", "ENOTFOUND", "EDNS", "ECONNRESET", "NoConnection"].includes(cod)) return { cod: "conexiune", detaliu: mesaj };
  return { cod: "altul", detaliu: mesaj };
}

// ===== SMTP =====
function transportSmtp(c: ConexiuneSmtp, ip: string) {
  return nodemailer.createTransport({
    host: ip,
    port: c.port,
    secure: c.port === 465,
    requireTLS: c.port !== 465,
    auth: { user: c.user, pass: c.parola },
    tls: { servername: c.host },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 60_000,
  });
}

export async function testeazaSmtp(c: ConexiuneSmtp): Promise<{ ok: true } | { ok: false; eroare: EroareConexiune }> {
  const r = await rezolvaPublic(c.host);
  if (!r.ok) return { ok: false, eroare: { cod: "host", detaliu: "" } };
  const t = transportSmtp(c, r.ip);
  try {
    await t.verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, eroare: clasifica(e, c.parola) };
  } finally {
    t.close();
  }
}

export type MesajDeTrimis = {
  deNume: string;
  deAdresa: string;
  catre: string;
  subiect: string;
  html: string;
  text: string;
  messageId: string;
  inReplyTo?: string | null;
  referinte?: string | null;
  anteteExtra?: Record<string, string>;
  pdf?: { nume: string; base64: string } | null;
};

export type RezultatTrimitere =
  | { ok: true; messageId: string }
  // sigur = mesajul NU a plecat (se poate reîncerca); fals = necunoscut (timeout după DATA etc.): nu reîncercăm singuri.
  | { ok: false; eroare: EroareConexiune; sigur: boolean; fel: FelEroareTrimitere | null };

export async function trimiteMesajSmtp(c: ConexiuneSmtp, m: MesajDeTrimis): Promise<RezultatTrimitere> {
  const r = await rezolvaPublic(c.host);
  if (!r.ok) return { ok: false, eroare: { cod: "host", detaliu: "" }, sigur: true, fel: null };
  const t = transportSmtp(c, r.ip);
  try {
    const nume = faraRanduriNoi(m.deNume).replace(/["<>]/g, "").slice(0, 80);
    const info = await t.sendMail({
      from: { name: nume, address: m.deAdresa },
      to: m.catre,
      subject: faraRanduriNoi(m.subiect),
      html: m.html,
      text: m.text,
      messageId: m.messageId,
      ...(m.inReplyTo ? { inReplyTo: m.inReplyTo } : {}),
      ...(m.referinte ? { references: m.referinte } : {}),
      headers: m.anteteExtra,
      attachments: m.pdf ? [{ filename: m.pdf.nume, content: Buffer.from(m.pdf.base64, "base64"), contentType: "application/pdf" }] : undefined,
    });
    if (Array.isArray(info.rejected) && info.rejected.length > 0 && !info.accepted?.length) return { ok: false, eroare: { cod: "respins", detaliu: ascundeSecret(String(info.response ?? ""), c.parola).slice(0, 200) }, sigur: true, fel: "adresa_inexistenta" };
    return { ok: true, messageId: String(info.messageId || m.messageId) };
  } catch (e) {
    return { ok: false, eroare: clasifica(e, c.parola), sigur: esecSigurDeTrimitere(e), fel: clasificaEroareTrimitere(e) };
  } finally {
    t.close();
  }
}

// ===== IMAP =====
function clientImap(c: ConexiuneImap, ip: string): ImapFlow {
  return new ImapFlow({
    host: ip,
    port: c.port,
    secure: c.port === 993,
    doSTARTTLS: c.port !== 993 ? true : undefined,
    servername: c.host,
    auth: { user: c.user, pass: c.parola },
    logger: false,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 45_000,
  });
}

export async function testeazaImap(c: ConexiuneImap): Promise<{ ok: true } | { ok: false; eroare: EroareConexiune }> {
  const r = await rezolvaPublic(c.host);
  if (!r.ok) return { ok: false, eroare: { cod: "host", detaliu: "" } };
  const client = clientImap(c, r.ip);
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    lock.release();
    await client.logout();
    return { ok: true };
  } catch (e) {
    try {
      client.close();
    } catch {
      // conexiunea era deja închisă
    }
    return { ok: false, eroare: clasifica(e, c.parola) };
  }
}

export type RaspunsBrut = {
  messageId: string;
  deLa: string;
  primitLa: Date | null;
  subiect: string;
  text: string;
  fir: string[];
  antete: AnteteRaspuns;
};

export type CerereCitire = {
  // Adresele cărora le-am scris și de când așteptăm răspuns.
  adrese: { adresa: string; deLa: Date }[];
  // Message-ID-urile răspunsurilor deja salvate (nu le mai descărcăm și nu mai plătim etichetarea AI).
  deja: ReadonlySet<string>;
  maxPerAdresa: number;
  deadline: number;
};

const sir = (v: unknown): string | null => (typeof v === "string" ? v : Array.isArray(v) ? String(v[0] ?? "") : v && typeof v === "object" && "text" in v ? String((v as { text: unknown }).text) : null);

export async function citesteRaspunsuriImap(c: ConexiuneImap, cerere: CerereCitire): Promise<{ ok: true; mesaje: RaspunsBrut[] } | { ok: false; eroare: EroareConexiune; mesaje: RaspunsBrut[] }> {
  const r = await rezolvaPublic(c.host);
  if (!r.ok) return { ok: false, eroare: { cod: "host", detaliu: "" }, mesaje: [] };
  const client = clientImap(c, r.ip);
  const mesaje: RaspunsBrut[] = [];
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
      for (const { adresa, deLa } of cerere.adrese) {
        if (Date.now() > cerere.deadline) break;
        const uids = await client.search({ from: adresa, since: new Date(deLa.getTime() - 86_400_000) }, { uid: true });
        if (!uids || !uids.length) continue;
        for (const uid of uids.slice(-cerere.maxPerAdresa)) {
          if (Date.now() > cerere.deadline) break;
          const m = await client.fetchOne(String(uid), { envelope: true, source: { maxLength: 300_000 } }, { uid: true });
          if (!m || !m.envelope || !m.source) continue;
          const expeditor = (m.envelope.from?.[0]?.address || "").toLowerCase();
          if (expeditor !== adresa.toLowerCase()) continue;
          const p = await simpleParser(m.source, { skipImageLinks: true });
          const data = m.envelope.date ? new Date(m.envelope.date) : p.date ?? null;
          const subiect = (m.envelope.subject || p.subject || "").slice(0, 200);
          // Un mesaj fără Message-ID primește unul stabil, calculat din conținut, ca să nu fie salvat de două ori.
          const messageId = (p.messageId || m.envelope.messageId || `<h.${createHash("sha1").update(`${expeditor}|${data?.toISOString() ?? ""}|${subiect}`).digest("hex")}@local>`).trim().toLowerCase();
          if (cerere.deja.has(messageId)) continue;
          const h = p.headers;
          mesaje.push({
            messageId,
            deLa: expeditor,
            primitLa: data && !Number.isNaN(data.getTime()) ? data : null,
            subiect,
            text: (p.text || "").slice(0, 20_000),
            fir: [...idUri(p.inReplyTo), ...idUri(p.references)],
            antete: {
              autoSubmitted: sir(h.get("auto-submitted")),
              precedence: sir(h.get("precedence")),
              xAutoreply: sir(h.get("x-autoreply")),
              xAutorespond: sir(h.get("x-autorespond")),
              xAutoResponseSuppress: sir(h.get("x-auto-response-suppress")),
              returnPath: sir(h.get("return-path")),
            },
          });
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
    return { ok: true, mesaje };
  } catch (e) {
    try {
      client.close();
    } catch {
      // conexiunea era deja închisă
    }
    return { ok: false, eroare: clasifica(e, c.parola), mesaje };
  }
}
