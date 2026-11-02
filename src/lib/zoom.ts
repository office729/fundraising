import "server-only";

import { corpIntalnireZoom, idDinLinkZoom, type DateIntalnireZoom } from "./zoom-link";

// Zoom prin „Server-to-Server OAuth” (aplicație creată de echipă în Zoom App Marketplace). Trei variabile de mediu, setate în Vercel de proprietarul contului Zoom:
// ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET. ZOOM_USER (opțional) = emailul gazdei ședințelor; implicit „me” (contul care a creat aplicația).
// Fără ele, platforma folosește linkul fix al tipului de întâlnire. Secretele nu se afișează și nu se loghează.
const ZOOM_OAUTH = "https://zoom.us/oauth/token";
const ZOOM_API = "https://api.zoom.us/v2";
const TIMEOUT_MS = 10_000;

export const zoomConfigurat = (): boolean => Boolean(process.env.ZOOM_ACCOUNT_ID?.trim() && process.env.ZOOM_CLIENT_ID?.trim() && process.env.ZOOM_CLIENT_SECRET?.trim());

let tokenCache: { valoare: string; expiraLa: number } | null = null;

async function tokenZoom(): Promise<string> {
  if (tokenCache && tokenCache.expiraLa > Date.now() + 60_000) return tokenCache.valoare;
  const cont = process.env.ZOOM_ACCOUNT_ID!.trim();
  const basic = Buffer.from(`${process.env.ZOOM_CLIENT_ID!.trim()}:${process.env.ZOOM_CLIENT_SECRET!.trim()}`).toString("base64");
  const r = await fetch(`${ZOOM_OAUTH}?grant_type=account_credentials&account_id=${encodeURIComponent(cont)}`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) throw new Error(`Zoom OAuth ${r.status}`);
  const j = (await r.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) throw new Error("Zoom OAuth fără token");
  tokenCache = { valoare: j.access_token, expiraLa: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return j.access_token;
}

export type RezultatZoom = { ok: true; linkIntrare: string; id: string } | { ok: false; eroare: string };

// Creează întâlnirea și întoarce linkul de intrare. Nu aruncă: o eroare de la Zoom nu trebuie să strice programarea (cade pe linkul fix al tipului).
export async function creeazaIntalnireZoom(d: DateIntalnireZoom): Promise<RezultatZoom> {
  if (!zoomConfigurat()) return { ok: false, eroare: "Zoom nu e configurat." };
  try {
    const token = await tokenZoom();
    const gazda = encodeURIComponent(process.env.ZOOM_USER?.trim() || "me");
    const r = await fetch(`${ZOOM_API}/users/${gazda}/meetings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(corpIntalnireZoom(d)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (r.status === 401) tokenCache = null;
    if (!r.ok) return { ok: false, eroare: `Zoom a răspuns ${r.status}` };
    const j = (await r.json()) as { id?: number | string; join_url?: string };
    if (!j.join_url || !j.id) return { ok: false, eroare: "Răspuns Zoom incomplet." };
    return { ok: true, linkIntrare: j.join_url, id: String(j.id) };
  } catch (e) {
    return { ok: false, eroare: e instanceof Error ? e.message : "Eroare Zoom." };
  }
}

// Șterge întâlnirea Zoom (la anularea programării). Cel mult un efort rezonabil: 404 = deja ștearsă, restul se raportează, nu se aruncă.
export async function stergeIntalnireZoom(linkIntrare: string | null | undefined): Promise<boolean> {
  const id = idDinLinkZoom(linkIntrare);
  if (!id || !zoomConfigurat()) return false;
  try {
    const token = await tokenZoom();
    const r = await fetch(`${ZOOM_API}/meetings/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    return r.ok || r.status === 404;
  } catch {
    return false;
  }
}
