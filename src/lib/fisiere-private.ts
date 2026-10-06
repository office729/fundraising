import "server-only";

import { createClient } from "@/lib/supabase/server";

// Facturi și atașamente de task: documente cu date financiare ale beneficiarilor. Stau într-un bucket PRIVAT
// (`org-docs-private`); în coloana `fisier_url` se salvează o referință `storage:<bucket>/<cale>`, nu un URL public.
// La afișare, serverul generează un URL semnat cu valabilitate scurtă — cu sesiunea utilizatorului, deci politicile de
// Storage decid cine are voie (membrii organizației sau beneficiarul campaniei respective).
// Rândurile mai vechi (URL public din `org-branding`) se afișează ca până acum.
export const BUCKET_PRIVAT = "org-docs-private";
const PREFIX = `storage:${BUCKET_PRIVAT}/`;
const TTL_SECUNDE = 60 * 60;

export function referintaPrivata(cale: string): string {
  return `${PREFIX}${cale}`;
}

export function caleDinReferinta(ref: string | null | undefined): string | null {
  return ref && ref.startsWith(PREFIX) ? ref.slice(PREFIX.length) : null;
}

export async function urlsSemnate<T extends { fisierUrl: string | null }>(randuri: T[]): Promise<T[]> {
  const caleDeSemnat = randuri.map((r) => caleDinReferinta(r.fisierUrl)).filter((c): c is string => Boolean(c));
  if (!caleDeSemnat.length) return randuri;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(BUCKET_PRIVAT).createSignedUrls(caleDeSemnat, TTL_SECUNDE);
  const dupaCale = new Map((data ?? []).map((d) => [d.path ?? "", d.signedUrl]));
  return randuri.map((r) => {
    const cale = caleDinReferinta(r.fisierUrl);
    if (!cale) return r;
    return { ...r, fisierUrl: dupaCale.get(cale) ?? null };
  });
}
