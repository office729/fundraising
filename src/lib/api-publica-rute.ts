import "server-only";

import { NextResponse } from "next/server";

import type { Scop } from "@/lib/api-publica";
import { autentificaApi, type CheieAutentificata } from "@/lib/api-publica-server";
import { raporteazaEroare } from "@/lib/monitoring";

// Ajutoare comune rutelor /api/v1: autentificare cu cheie, erori în același format, corp JSON cu limită.
export function raspuns(corp: unknown, status = 200): NextResponse {
  return NextResponse.json(corp, { status, headers: { "Cache-Control": "no-store" } });
}
export function raspunsEroare(status: number, cod: string, mesaj: string): NextResponse {
  return raspuns({ eroare: { cod, mesaj } }, status);
}

const MAX_CORP = 64 * 1024;

// Citește corpul JSON (obiect), cu limită de mărime. null = invalid (rută răspunde 400).
export async function corpJson(req: Request): Promise<Record<string, unknown> | null> {
  const lungime = Number(req.headers.get("content-length") ?? 0);
  if (lungime > MAX_CORP) return null;
  try {
    const text = await req.text();
    if (text.length > MAX_CORP) return null;
    const v = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// Învelește o rută: verifică cheia și permisiunea, apoi rulează handler-ul; orice eroare neașteptată se raportează (fără date personale) și întoarce 500 curat.
export function ruta<P = Record<string, never>>(scop: Scop, handler: (req: Request, cheie: CheieAutentificata, params: P) => Promise<NextResponse>) {
  return async (req: Request, ctx: { params: Promise<P> }): Promise<NextResponse> => {
    try {
      const auth = await autentificaApi(req, scop);
      if (!auth.ok) return raspunsEroare(auth.status, auth.cod, auth.mesaj);
      return await handler(req, auth.cheie, await ctx.params);
    } catch (e) {
      raporteazaEroare("api-v1", e);
      return raspunsEroare(500, "eroare_interna", "Eroare neașteptată. Încearcă din nou.");
    }
  };
}
