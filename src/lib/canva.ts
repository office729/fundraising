import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import type { OrgContext } from "@/lib/auth/guard";
import { canvaConnections } from "@/lib/db/schema";
import { cripteaza, decripteaza } from "@/lib/secret-box";

// Integrare Canva (Connect API — OAuth2 + PKCE, Brand Templates + Autofill).
// PRIMUL precedent de OAuth2 cu redirect din acest codebase (Stripe Donații
// e doar paste-your-own-key). Canva are un SINGUR redirect URI per integrare
// — orgId circulă prin `state` (semnat HMAC, nu în URL), nu în redirect_uri.
//
// Mediu necesar: CANVA_CLIENT_ID, CANVA_CLIENT_SECRET (dintr-o integrare
// creată pe canva.com/developers, cu redirect URI <site>/api/canva/callback).

const AUTHORIZE_URL = "https://www.canva.com/api/oauth/authorize";
const TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
const API_BASE = "https://api.canva.com/rest/v1";

const SCOPES = "design:content:write design:meta:read brandtemplate:content:read brandtemplate:meta:read asset:read";

export function canvaConfigurat(): boolean {
  return Boolean(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET);
}

// --- PKCE ---------------------------------------------------------------

export function genereazaPkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

// --- `state` semnat (HMAC) — leagă redirectul de vizitat de orgId/orgSlug ---
// care l-a pornit, verificat la callback. Reutilizează ORG_SECRETS_KEY (deja
// setată pentru secret-box.ts) în loc să ceară o variabilă de mediu nouă —
// aici doar semnăm (HMAC), nu criptăm.

function cheieState(): Buffer {
  const raw = process.env.ORG_SECRETS_KEY;
  if (!raw) throw new Error("ORG_SECRETS_KEY lipsește din mediu.");
  return Buffer.from(raw, "base64");
}

export function semneazaState(payload: { orgId: string; orgSlug: string }): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 10 * 60 * 1000 })).toString("base64url");
  const semnatura = createHmac("sha256", cheieState()).update(body).digest("base64url");
  return `${body}.${semnatura}`;
}

export function verificaState(state: string): { orgId: string; orgSlug: string } | null {
  const [body, semnatura] = state.split(".");
  if (!body || !semnatura) return null;
  const asteptata = createHmac("sha256", cheieState()).update(body).digest("base64url");
  const a = Buffer.from(semnatura);
  const b = Buffer.from(asteptata);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { orgId: string; orgSlug: string; exp: number };
    if (Date.now() > payload.exp) return null;
    return { orgId: payload.orgId, orgSlug: payload.orgSlug };
  } catch {
    return null;
  }
}

// --- URL de autorizare ----------------------------------------------------

export function urlAutorizareCanva(params: { state: string; codeChallenge: string; redirectUri: string }): string {
  const clientId = process.env.CANVA_CLIENT_ID;
  if (!clientId) throw new Error("CANVA_CLIENT_ID lipsește.");
  const u = new URL(AUTHORIZE_URL);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("scope", SCOPES);
  u.searchParams.set("state", params.state);
  u.searchParams.set("code_challenge", params.codeChallenge);
  u.searchParams.set("code_challenge_method", "S256");
  return u.toString();
}

// --- Schimb token / refresh -----------------------------------------------

type TokenResponse = { access_token: string; refresh_token: string; expires_in: number };

function antetAutentificareClient(): string {
  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Canva nu e configurată (CANVA_CLIENT_ID/CANVA_CLIENT_SECRET).");
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

async function cereToken(body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", authorization: antetAutentificareClient() },
    body,
  });
  if (!res.ok) throw new Error(`Canva token a eșuat: ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
  return res.json() as Promise<TokenResponse>;
}

export async function schimbaCodPeToken(code: string, codeVerifier: string, redirectUri: string): Promise<TokenResponse> {
  return cereToken(new URLSearchParams({ grant_type: "authorization_code", code, code_verifier: codeVerifier, redirect_uri: redirectUri }));
}

async function reimprospateazaToken(refreshToken: string): Promise<TokenResponse> {
  return cereToken(new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }));
}

// Scrie conexiunea într-o tranzacție proprie cu GUC-urile de tenant setate —
// ruta de callback nu are un `ctx.db` gata (nu trece prin withOrgAdmin, e o
// rută API), la fel ca celelalte scrieri din afara unui Server Action (vezi
// api/netopia/ipn/route.ts — fără GUC, RLS întoarce tăcut 0 rânduri).
export async function salveazaConexiuneCanva(orgId: string, userId: string, tokens: TokenResponse): Promise<void> {
  const expiraLa = new Date(Date.now() + tokens.expires_in * 1000 - 60_000);
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_org_id', ${orgId}, true)`);
    await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true)`);
    const valori = {
      accessTokenEnc: cripteaza(tokens.access_token),
      refreshTokenEnc: cripteaza(tokens.refresh_token),
      expiraLa,
      conectatDe: userId,
    };
    await tx
      .insert(canvaConnections)
      .values({ orgId, ...valori })
      .onConflictDoUpdate({ target: [canvaConnections.orgId], set: { ...valori, conectatLa: new Date() } });
  });
}

// --- Apeluri autentificate (folosite din server actions, ctx.db deja are
// GUC-urile de tenant setate din withOrgAdmin) --------------------------

async function obtineTokenValid(dbCtx: OrgContext["db"], orgId: string): Promise<string> {
  const [conn] = await dbCtx.select().from(canvaConnections).where(eq(canvaConnections.orgId, orgId)).limit(1);
  if (!conn) throw new Error("canva_neconectat");
  if (conn.expiraLa.getTime() > Date.now()) return decripteaza(conn.accessTokenEnc);

  const tokens = await reimprospateazaToken(decripteaza(conn.refreshTokenEnc));
  const expiraLa = new Date(Date.now() + tokens.expires_in * 1000 - 60_000);
  await dbCtx
    .update(canvaConnections)
    .set({ accessTokenEnc: cripteaza(tokens.access_token), refreshTokenEnc: cripteaza(tokens.refresh_token), expiraLa })
    .where(eq(canvaConnections.orgId, orgId));
  return tokens.access_token;
}

export type SablonBrand = { id: string; titlu: string };

export async function listeazaSabloaneBrand(dbCtx: OrgContext["db"], orgId: string): Promise<SablonBrand[]> {
  const token = await obtineTokenValid(dbCtx, orgId);
  const res = await fetch(`${API_BASE}/brand-templates`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Canva brand-templates a eșuat: ${res.status}`);
  const data = (await res.json()) as { items?: { id: string; title: string }[] };
  return (data.items ?? []).map((t) => ({ id: t.id, titlu: t.title }));
}

// Câmpurile disponibile într-un șablon (nume + tip) — folosit la Pasul 5
// pentru a valida maparea secțiunilor raportului pe câmpurile reale.
export async function obtineDatasetSablon(dbCtx: OrgContext["db"], orgId: string, templateId: string): Promise<Record<string, { type: string }>> {
  const token = await obtineTokenValid(dbCtx, orgId);
  const res = await fetch(`${API_BASE}/brand-templates/${templateId}/dataset`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Canva dataset a eșuat: ${res.status}`);
  const data = (await res.json()) as { dataset?: Record<string, { type: string }> };
  return data.dataset ?? {};
}

export async function tokenValidPentruAutofill(dbCtx: OrgContext["db"], orgId: string): Promise<string> {
  return obtineTokenValid(dbCtx, orgId);
}

// --- Autofill (Pasul 5) ----------------------------------------------------
// Umple un Brand Template cu datele raportului → un design Canva NOU, editabil
// direct de ONG în Canva. Job asincron — pornit cu POST, verificat cu poll
// (Autofill e de obicei rapid, sub 10s, dar nu instant).

export type CampAutofill = { type: "text"; text: string };

type AutofillJob = {
  job: {
    id: string;
    status: "in_progress" | "success" | "failed";
    result?: { design?: { id: string; urls?: { edit_url?: string; view_url?: string } } };
    error?: { message?: string };
  };
};

export async function autofillDesign(
  dbCtx: OrgContext["db"],
  orgId: string,
  templateId: string,
  titluDesign: string,
  data: Record<string, CampAutofill>,
): Promise<{ designId: string; editUrl: string; viewUrl: string }> {
  const token = await obtineTokenValid(dbCtx, orgId);

  const start = await fetch(`${API_BASE}/autofills`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ brand_template_id: templateId, title: titluDesign, data }),
  });
  if (!start.ok) throw new Error(`Canva autofill (start) a eșuat: ${start.status} ${(await start.text().catch(() => "")).slice(0, 200)}`);
  let job = (await start.json() as AutofillJob).job;

  for (let i = 0; i < 15 && job.status === "in_progress"; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const poll = await fetch(`${API_BASE}/autofills/${job.id}`, { headers: { authorization: `Bearer ${token}` } });
    if (!poll.ok) throw new Error(`Canva autofill (verificare) a eșuat: ${poll.status}`);
    job = (await poll.json() as AutofillJob).job;
  }

  if (job.status === "success") {
    const design = job.result?.design;
    if (!design?.id || !design.urls?.edit_url) throw new Error("Canva autofill a reușit, dar nu a întors design-ul.");
    return { designId: design.id, editUrl: design.urls.edit_url, viewUrl: design.urls.view_url ?? design.urls.edit_url };
  }
  if (job.status === "failed") throw new Error(`Canva autofill a eșuat: ${job.error?.message ?? "eroare necunoscută"}`);
  throw new Error("Canva autofill nu s-a finalizat la timp (timeout).");
}
