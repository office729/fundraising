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

export default async function CodScurtPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const tinta = await getTintaCodScurt(code);
  if (!tinta) notFound();
  redirect(`/f230/${tinta.orgSlug}/${tinta.beneficiarSlug}`);
}
