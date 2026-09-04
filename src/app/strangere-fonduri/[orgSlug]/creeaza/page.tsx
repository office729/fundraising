import { eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";

import { CreeazaPaginaForm } from "./form";

async function getOrgPublic(orgSlug: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const rows = await tx.select({ name: organizations.name }).from(organizations).where(eq(organizations.slug, orgSlug)).limit(1);
    return rows[0] ?? null;
  });
}

export default async function CreeazaPaginaPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const org = await getOrgPublic(orgSlug);
  if (!org) notFound();

  return <CreeazaPaginaForm orgSlug={orgSlug} orgName={org.name} />;
}
