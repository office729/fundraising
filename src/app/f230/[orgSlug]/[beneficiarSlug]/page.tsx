import { and, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { formular230Beneficiari, organizations } from "@/lib/db/schema";

import { Formular230Client } from "../formular-client";

// Pagină PUBLICĂ (fără autentificare) — rezolvă atât organizația, cât și
// contul/beneficiarul (pentru numele afișat + PDF-ul folosit la generare)
// prin lookup public (app.public_lookup, vezi documentation/rls-setup.sql),
// la fel ca /f230/[orgSlug] dinainte.
async function getFormularPublic(orgSlug: string, beneficiarSlug: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const orgRows = await tx
      .select({ id: organizations.id, name: organizations.name, brandColor: organizations.brandColor })
      .from(organizations)
      .where(eq(organizations.slug, orgSlug))
      .limit(1);
    const org = orgRows[0];
    if (!org) return null;

    const beneficiarRows = await tx
      .select({
        id: formular230Beneficiari.id,
        nume: formular230Beneficiari.nume,
        cif: formular230Beneficiari.cif,
        iban: formular230Beneficiari.iban,
      })
      .from(formular230Beneficiari)
      .where(and(eq(formular230Beneficiari.orgId, org.id), eq(formular230Beneficiari.slug, beneficiarSlug)))
      .limit(1);
    const beneficiar = beneficiarRows[0];
    if (!beneficiar) return null;

    return { org, beneficiar };
  });
}

export default async function Formular230PublicPage({
  params,
}: {
  params: Promise<{ orgSlug: string; beneficiarSlug: string }>;
}) {
  const { orgSlug, beneficiarSlug } = await params;
  const rezultat = await getFormularPublic(orgSlug, beneficiarSlug);
  if (!rezultat) notFound();

  return (
    <Formular230Client
      orgSlug={orgSlug}
      beneficiarSlug={beneficiarSlug}
      orgName={rezultat.org.name}
      brandColor={rezultat.org.brandColor}
      beneficiar={{ nume: rezultat.beneficiar.nume, cif: rezultat.beneficiar.cif ?? "", iban: rezultat.beneficiar.iban ?? "" }}
    />
  );
}
