import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { programariConfig } from "@/lib/db/schema";
import { raporteazaEroare } from "@/lib/monitoring";
import { criptareConfigurata, cripteaza, decripteaza } from "@/lib/secret-box";

import { corpEvenimentMeet, emailDinIdToken, linkMeetDinEveniment, type DateEvenimentMeet } from "./google-meet-corp";

// Link Google Meet unic pentru fiecare programare, creat prin Google Calendar în contul Google al echipei, conectat o singură dată din Panou platformă.
// Două variabile de mediu (din Google Cloud, vezi documentation/google-meet.md): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET. Jetonul de reîmprospătare nu stă în mediu:
// se salvează criptat (AES-256-GCM, ca secretele ONG-urilor) în configurarea programărilor, la conectare. Evenimentele se creează fără invitați (Google nu trimite emailuri);
// confirmarea către persoană o trimite Alexandrit, cu linkul Meet.
const AUTORIZARE = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const CALENDAR = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const SCOPURI = "https://www.googleapis.com/auth/calendar.events openid email";
const TIMEOUT_MS = 10_000;

export const googleConfigurat = (): boolean => Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim() && criptareConfigurata());

// ---------- `state` semnat (HMAC, valabil 10 minute): leagă redirectul de la Google de administratorul care a pornit conectarea ----------

function cheieState(): Buffer {
  const raw = process.env.ORG_SECRETS_KEY;
  if (!raw) throw new Error("ORG_SECRETS_KEY lipsește din mediu.");
  return Buffer.from(raw, "base64");
}

export function semneazaStateGoogle(email: string): string {
  const body = Buffer.from(JSON.stringify({ u: email.toLowerCase(), exp: Date.now() + 10 * 60 * 1000, n: randomUUID() })).toString("base64url");
  return `${body}.${createHmac("sha256", cheieState()).update(body).digest("base64url")}`;
}

export function verificaStateGoogle(state: string): string | null {
  const [body, semnatura] = state.split(".");
  if (!body || !semnatura) return null;
  const asteptata = createHmac("sha256", cheieState()).update(body).digest("base64url");
  const a = Buffer.from(semnatura);
  const b = Buffer.from(asteptata);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { u?: string; exp?: number };
    return typeof p.u === "string" && typeof p.exp === "number" && Date.now() <= p.exp ? p.u : null;
  } catch {
    return null;
  }
}

export function urlAutorizareGoogle(state: string, redirectUri: string): string {
  const u = new URL(AUTORIZARE);
  u.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!.trim());
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", SCOPURI);
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent"); // ca Google să dea mereu jetonul de reîmprospătare
  u.searchParams.set("state", state);
  return u.toString();
}

// ---------- conexiunea salvată (criptată) ----------

type ConexiuneSalvata = { refresh: string; email: string | null; conectatLa: string };

async function inContextPlatforma<T>(f: (tx: typeof db) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.platform_admin', 'true', true)`);
    return f(tx as unknown as typeof db);
  });
}

async function citesteConexiune(): Promise<ConexiuneSalvata | null> {
  const [r] = await inContextPlatforma((tx) => tx.select({ config: programariConfig.config }).from(programariConfig).where(eq(programariConfig.id, 1)).limit(1));
  const g = (r?.config as { googleMeet?: ConexiuneSalvata } | undefined)?.googleMeet;
  return g && typeof g.refresh === "string" ? g : null;
}

async function scrieConexiune(conexiune: ConexiuneSalvata | null, actor: string): Promise<void> {
  await inContextPlatforma(async (tx) => {
    const [r] = await tx.select({ config: programariConfig.config }).from(programariConfig).where(eq(programariConfig.id, 1)).limit(1);
    const vechi = (r?.config && typeof r.config === "object" ? r.config : {}) as Record<string, unknown>;
    const { googleMeet: _scos, ...rest } = vechi;
    void _scos;
    const config = conexiune ? { ...rest, googleMeet: conexiune } : rest;
    await tx
      .insert(programariConfig)
      .values({ id: 1, config, actualizatLa: new Date(), actualizatDe: actor })
      .onConflictDoUpdate({ target: programariConfig.id, set: { config, actualizatLa: new Date(), actualizatDe: actor } });
  });
}

export async function stareGoogle(): Promise<{ configurat: boolean; conectat: boolean; email: string | null }> {
  const configurat = googleConfigurat();
  if (!configurat) return { configurat, conectat: false, email: null };
  try {
    const c = await citesteConexiune();
    return { configurat, conectat: Boolean(c), email: c?.email ?? null };
  } catch (e) {
    raporteazaEroare("google-meet-stare", e);
    return { configurat, conectat: false, email: null };
  }
}

export async function deconecteazaGoogle(actor: string): Promise<void> {
  await scrieConexiune(null, actor);
  tokenCache = null;
}

// Schimbă codul primit la callback pe jetoane și salvează conexiunea. Nu loghează jetoane.
export async function conecteazaGoogle(code: string, redirectUri: string, actor: string): Promise<{ ok: true; email: string | null } | { ok: false; eroare: string }> {
  if (!googleConfigurat()) return { ok: false, eroare: "Google nu e configurat." };
  try {
    const r = await fetch(TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!.trim(), client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(), redirect_uri: redirectUri, grant_type: "authorization_code" }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) return { ok: false, eroare: `Google a răspuns ${r.status} la schimbul codului.` };
    const j = (await r.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; id_token?: string };
    if (!j.refresh_token) return { ok: false, eroare: "Google nu a dat jetonul de acces de lungă durată. Reia conectarea și acceptă toate permisiunile." };
    const email = emailDinIdToken(j.id_token);
    await scrieConexiune({ refresh: cripteaza(j.refresh_token), email, conectatLa: new Date().toISOString() }, actor);
    if (j.access_token) tokenCache = { valoare: j.access_token, expiraLa: Date.now() + (j.expires_in ?? 3600) * 1000 };
    return { ok: true, email };
  } catch (e) {
    return { ok: false, eroare: e instanceof Error ? e.message : "Eroare la conectarea Google." };
  }
}

// ---------- jeton de acces ----------

let tokenCache: { valoare: string; expiraLa: number } | null = null;

async function tokenAcces(): Promise<string> {
  if (tokenCache && tokenCache.expiraLa > Date.now() + 60_000) return tokenCache.valoare;
  const c = await citesteConexiune();
  if (!c) throw new Error("Google nu e conectat.");
  const r = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!.trim(), client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(), refresh_token: decripteaza(c.refresh), grant_type: "refresh_token" }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) {
    // Acces revocat sau expirat (de exemplu aplicația Google a rămas în „Testing”, unde jetonul expiră în 7 zile): conexiunea se scoate, iar Panoul cere reconectare.
    if (r.status === 400 || r.status === 401) {
      await scrieConexiune(null, "sistem").catch(() => undefined);
      raporteazaEroare("google-meet-conexiune-expirata", new Error(`Google a refuzat reîmprospătarea (${r.status})`));
    }
    throw new Error(`Google OAuth ${r.status}`);
  }
  const j = (await r.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) throw new Error("Google OAuth fără token");
  tokenCache = { valoare: j.access_token, expiraLa: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return j.access_token;
}

// ---------- evenimente cu Meet ----------

export type RezultatMeet = { ok: true; linkIntrare: string; idEveniment: string } | { ok: false; eroare: string };

const asteapta = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Creează evenimentul și întoarce linkul Meet. Nu aruncă: o eroare de la Google nu strică programarea (cade pe linkul fix sau pe Zoom).
export async function creeazaIntalnireMeet(d: Omit<DateEvenimentMeet, "idCerere">): Promise<RezultatMeet> {
  if (!googleConfigurat()) return { ok: false, eroare: "Google nu e configurat." };
  try {
    const token = await tokenAcces();
    const r = await fetch(`${CALENDAR}?conferenceDataVersion=1&sendUpdates=none`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(corpEvenimentMeet({ ...d, idCerere: randomUUID() })),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (r.status === 401) tokenCache = null;
    if (!r.ok) return { ok: false, eroare: `Google Calendar a răspuns ${r.status}` };
    let ev: unknown = await r.json();
    let gasit = linkMeetDinEveniment(ev);
    // Uneori linkul apare cu o mică întârziere după creare.
    for (let i = 0; i < 3 && !gasit; i++) {
      const id = (ev as { id?: string })?.id;
      if (!id) break;
      await asteapta(700);
      const g = await fetch(`${CALENDAR}/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (g.ok) {
        ev = await g.json();
        gasit = linkMeetDinEveniment(ev);
      }
    }
    if (!gasit) return { ok: false, eroare: "Google nu a întors un link Meet." };
    return { ok: true, linkIntrare: gasit.link, idEveniment: gasit.id };
  } catch (e) {
    return { ok: false, eroare: e instanceof Error ? e.message : "Eroare Google." };
  }
}

// Șterge evenimentul programării (la anulare), găsit după tokenul ei. 404 și 410 = deja șters.
export async function stergeIntalnireMeet(tokenProgramare: string): Promise<boolean> {
  if (!googleConfigurat() || !tokenProgramare) return false;
  try {
    const token = await tokenAcces();
    const lista = await fetch(`${CALENDAR}?privateExtendedProperty=${encodeURIComponent(`alexandritToken=${tokenProgramare}`)}&maxResults=10&showDeleted=false`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!lista.ok) return false;
    const j = (await lista.json()) as { items?: { id?: string }[] };
    let ok = true;
    for (const ev of j.items ?? []) {
      if (!ev.id) continue;
      const d = await fetch(`${CALENDAR}/${encodeURIComponent(ev.id)}?sendUpdates=none`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!(d.ok || d.status === 404 || d.status === 410)) ok = false;
    }
    return ok;
  } catch {
    return false;
  }
}
