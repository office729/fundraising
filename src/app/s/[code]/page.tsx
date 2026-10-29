import { eq, sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { db } from "@/lib/db";
import { formular230Beneficiari, organizations } from "@/lib/db/schema";

// Link scurt public tip Bitly (/s/<cod>) — rezolvă contul de Formular 230 și
// redirecționează spre adresa lui reală (/f230/<orgSlug>/<slug>). Lookup
// public, la fel ca restul rutelor de Formular 230 (app.public_lookup).
async function getTintaCodScurt(code: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const rows = await tx
      .select({ orgSlug: organizations.slug, beneficiarSlug: formular230Beneficiari.slug })
      .from(formular230Beneficiari)
      .innerJoin(organizations, eq(organizations.id, formular230Beneficiari.orgId))
      .where(eq(formular230Beneficiari.shortCode, code))
      .limit(1);
    return rows[0] ?? null;
  });
}

// Parametrii de provenință (utm_*, identificatori de reclame) trec mai departe, altfel un link promovat prin linkul scurt și-ar pierde sursa.
const PARAMETRI_PASTRATI = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id", "gclid", "gbraid", "wbraid", "fbclid", "ttclid", "msclkid", "li_fat_id"];

export default async function CodScurtPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { code } = await params;
  const sp = await searchParams;
  const tinta = await getTintaCodScurt(code);
  if (!tinta) notFound();
  const q = new URLSearchParams();
  for (const k of PARAMETRI_PASTRATI) {
    const v = Array.isArray(sp[k]) ? sp[k][0] : sp[k];
    if (typeof v === "string" && v && v.length <= 200) q.set(k, v);
  }
  redirect(`/f230/${tinta.orgSlug}/${tinta.beneficiarSlug}${q.size ? `?${q.toString()}` : ""}`);
}
