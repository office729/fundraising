import "server-only";

import { createHmac, randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import { ensureAppUser, inregistreazaAcceptareTermeni } from "@/lib/auth/dal";
import type { citestePlanulAlesDinFormular } from "@/lib/billing/plan-from-form";
import { db } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/billing/trial";
import { emailNormalizatPentruRegistru } from "@/lib/email-normalizat";
import { memberships, orgCreariRegistru, organizations } from "@/lib/db/schema";
import { formular230Beneficiari } from "@/lib/db/schema/formular230";
import { SLUG_PRINCIPAL } from "@/lib/formular230-constants";
import { esteSlugRezervat } from "@/lib/reserved-slugs";
import { genereazaCodScurt } from "@/lib/short-code";
import { DPA_ACTIV, DPA_VERSIUNE } from "@/lib/legal-version";
import { slugify } from "@/lib/slugify";

// Provizionarea unei organizații NOI (utilizator + organizație + membership de
// owner + contul principal de Formular 230), comună înscrierii cu email
// (signup/actions.ts) și finalizării după Google / după confirmarea emailului
// (marketing/finalize-actions.ts) — înainte logica era duplicată, iar varianta de
// finalizare nu crea contul principal de F230.

// Plafoane anti-abuz: același utilizator nu poate deschide organizații/trial-uri
// în serie, iar numele rămâne rezonabil.
export const MAX_ORGANIZATII_PE_UTILIZATOR = 3;
export const MAX_LUNGIME_NUME_ORGANIZATIE = 120;
// Plafon pe VIAȚĂ, per adresă de email normalizată (registru care nu se șterge odată cu organizația): ștergerea unei
// organizații și crearea alteia nu mai repornește proba gratuită la nesfârșit.
export const MAX_ORGANIZATII_CREATE_PE_VIATA = 5;

function hashRegistru(email: string): string {
  return createHmac("sha256", process.env.ORG_SECRETS_KEY ?? "").update(`trial:${emailNormalizatPentruRegistru(email)}`).digest("hex");
}

export type RezultatProvizionare = { ok: true; slug: string } | { ok: false; motiv: "limita_organizatii" };

export async function creeazaOrganizatieNoua(p: {
  email: string;
  numeUtilizator?: string | null;
  orgName: string;
  referralCode: string;
  planAles: ReturnType<typeof citestePlanulAlesDinFormular>;
}): Promise<RezultatProvizionare> {
  const baseSlug = slugify(p.orgName);
  return db.transaction(async (tx): Promise<RezultatProvizionare> => {
    await tx.execute(sql`select set_config('app.current_user_email', ${p.email}, true)`);
    const appUser = await ensureAppUser(tx, p.email, p.numeUtilizator ?? null);
    await tx.execute(sql`select set_config('app.current_user_id', ${appUser.id}, true)`);
    await inregistreazaAcceptareTermeni(tx, appUser.id);

    const detinute = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.userId, appUser.id), eq(memberships.role, "owner")));
    if (detinute.length >= MAX_ORGANIZATII_PE_UTILIZATOR) return { ok: false, motiv: "limita_organizatii" };

    // Registrul persistent (supraviețuiește ștergerii organizațiilor). Administratorii platformei sunt exceptați.
    const hashEmail = hashRegistru(p.email);
    if (!isPlatformAdmin(p.email)) {
      const [{ creari }] = await tx
        .select({ creari: sql<number>`count(*)`.mapWith(Number) })
        .from(orgCreariRegistru)
        .where(eq(orgCreariRegistru.emailHash, hashEmail));
      if (creari >= MAX_ORGANIZATII_CREATE_PE_VIATA) return { ok: false, motiv: "limita_organizatii" };
    }

    // Necesar pentru verificarea de unicitate a slug-ului ȘI rezolvarea codului de
    // recomandare — la acest moment nu există încă niciun membership, deci
    // organizations_member nu se aplică; fără app.public_lookup, ambele SELECT-uri
    // ar rula silențios pe 0 rânduri sub FORCE ROW LEVEL SECURITY.
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);

    let slug = baseSlug;
    for (let attempt = 1; attempt <= 20; attempt++) {
      const existing = esteSlugRezervat(slug)
        ? true
        : (await tx.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, slug)).limit(1))[0];
      if (!existing) break;
      slug = `${baseSlug}-${attempt}`;
    }

    let referredByOrgId: string | null = null;
    if (p.referralCode) {
      const referrer = await tx.select({ id: organizations.id }).from(organizations).where(eq(organizations.referralCode, p.referralCode)).limit(1);
      referredByOrgId = referrer[0]?.id ?? null;
    }

    // Fără .returning(): INSERT...RETURNING pe organizations ar re-verifica politica
    // de SELECT pentru rândul nou, care cere un membership încă inexistent (fals
    // „row-level security violation"). Id-ul se generează în cod.
    const orgId = randomUUID();
    // Bifa de acceptare de la înscriere include și Acordul de prelucrare a datelor (DPA) când mecanismul e activ —
    // acceptarea se înregistrează aici, pe organizația nou creată, în numele ei (cel care o creează devine owner).
    const dpa = DPA_ACTIV ? { dpaVersion: DPA_VERSIUNE, dpaAcceptedAt: new Date(), dpaAcceptedBy: appUser.id } : {};
    await tx.insert(organizations).values({ id: orgId, name: p.orgName, slug, referredByOrgId, ...dpa, ...(p.planAles ?? {}) });
    await tx.insert(memberships).values({ orgId, userId: appUser.id, role: "owner" });
    await tx.insert(orgCreariRegistru).values({ emailHash: hashEmail });
    await tx.insert(formular230Beneficiari).values({ orgId, nume: p.orgName, slug: SLUG_PRINCIPAL, shortCode: genereazaCodScurt() });
    return { ok: true, slug };
  });
}
