import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { appUsers, fundraisingAuditLog, orgPersonalizare, organizations } from "@/lib/db/schema";
import { valideazaPersonalizare, type PersonalizareOrg } from "@/lib/personalizare-org";

// Operații ale echipei platformei asupra personalizării dashboardului unei organizații. Citesc DOAR rândul organizației (nume, sigla, pachet) și configurarea:
// niciodată tabelele ei de date. Apelantul trebuie să fi verificat deja isPlatformAdmin (vezi lib/auth/platform-admin.ts). Fiecare deschidere și fiecare
// modificare se scrie în jurnalul de audit al organizației, pe care îl pot citi owner-ii și adminii ei.

export type OrgPentruPersonalizare = {
  id: string;
  nume: string;
  slug: string;
  logoUrl: string | null;
  slogan: string | null;
  brandColor: string | null;
  domeniuActivitate: string | null;
  package: "trial" | "start" | "crestere" | "impact" | "custom";
  config: PersonalizareOrg | null;
};

async function contextPlatforma(tx: Pick<typeof db, "execute">) {
  await tx.execute(sql`select set_config('app.platform_admin', 'true', true)`);
  await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
}

export async function citesteOrgPentruPersonalizare(orgSlug: string): Promise<OrgPentruPersonalizare | null> {
  return db.transaction(async (tx) => {
    await contextPlatforma(tx);
    const [org] = await tx
      .select({
        id: organizations.id,
        nume: organizations.name,
        slug: organizations.slug,
        logoUrl: organizations.logoUrl,
        slogan: organizations.slogan,
        brandColor: organizations.brandColor,
        domeniuActivitate: organizations.domeniuActivitate,
        package: organizations.package,
      })
      .from(organizations)
      .where(eq(organizations.slug, orgSlug))
      .limit(1);
    if (!org) return null;
    let config: PersonalizareOrg | null = null;
    try {
      config = await tx.transaction(async (sp) => {
        const [r] = await sp.select({ config: orgPersonalizare.config }).from(orgPersonalizare).where(eq(orgPersonalizare.orgId, org.id)).limit(1);
        if (!r) return null;
        const v = valideazaPersonalizare(r.config);
        return v.ok ? v.valoare : null;
      });
    } catch {
      config = null; // tabelul încă nu există: aspect standard
    }
    return { ...org, domeniuActivitate: org.domeniuActivitate ?? null, config };
  });
}

type ActiuneAudit = "platform_editor_personalizare" | "platform_previzualizare" | "platform_personalizare_salvata" | "platform_personalizare_resetata";

export async function jurnalizeazaPersonalizare(orgId: string, actorEmail: string, actiune: ActiuneAudit, detalii: Record<string, unknown> = {}): Promise<void> {
  await db.transaction(async (tx) => {
    await contextPlatforma(tx);
    const [actor] = await tx.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.email, actorEmail)).limit(1);
    // Jurnalul organizației cere contextul ei (RLS), ca la ajustarea manuală a pachetului din panoul platformei.
    await tx.execute(sql`select set_config('app.current_org_id', ${orgId}, true)`);
    await tx.insert(fundraisingAuditLog).values({
      orgId,
      actorAppUserId: actor?.id ?? null,
      actiune,
      entitate: "organizatie",
      entitateId: orgId,
      detalii: { de: actorEmail, ...detalii },
    });
  });
}

export async function scriePersonalizare(orgId: string, config: PersonalizareOrg, actorEmail: string): Promise<void> {
  await db.transaction(async (tx) => {
    await contextPlatforma(tx);
    const [actor] = await tx.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.email, actorEmail)).limit(1);
    await tx
      .insert(orgPersonalizare)
      .values({ orgId, config, actualizatDe: actor?.id ?? null })
      .onConflictDoUpdate({ target: orgPersonalizare.orgId, set: { config, actualizatLa: new Date(), actualizatDe: actor?.id ?? null } });
  });
}

export async function stergePersonalizare(orgId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await contextPlatforma(tx);
    await tx.delete(orgPersonalizare).where(eq(orgPersonalizare.orgId, orgId));
  });
}
