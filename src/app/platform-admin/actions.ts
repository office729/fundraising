"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth/dal";
import { isAccessBlocked, isPlatformAdmin } from "@/lib/billing/trial";
import { db } from "@/lib/db";
import { appUsers, fundraisingAuditLog, memberships, organizations } from "@/lib/db/schema";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { raporteazaAvertisment } from "@/lib/monitoring";
import { stergeFisiereOrganizatie } from "@/lib/organizatie-fisiere";
import { accesuriSuportActive } from "@/lib/suport/diagnoza";

// Garda pentru toate acțiunile din acest fișier — propriul verificator, NU
// withOrgAdmin/withOrgSession (acelea sunt scopate la UN org; aici citim/
// scriem peste TOATE organizațiile, context de încredere separat).
async function cerePlatformAdmin(): Promise<string> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login");
  if (!isPlatformAdmin(authUser.email)) throw new EroareUtilizator("Acces interzis.");
  return authUser.email;
}

export type OrgRand = {
  id: string;
  nume: string;
  slug: string;
  package: string;
  subscriptionStatus: string;
  currentPeriodEnd: Date | null;
  createdAt: Date;
  proprietarEmail: string | null;
  proprietarNume: string | null;
  proprietarUltimaAutentificare: Date | null;
  // Datele de contact și de identificare completate la înscriere (telefonul organizației, CIF, județ, domeniu).
  telefon: string | null;
  cif: string | null;
  judet: string | null;
  domeniuActivitate: string | null;
  // Până când are organizația un acces de suport activ (null = nu a acordat accesul).
  suportExpiraLa: Date | null;
  // Se poate șterge: proba de 30 de zile a expirat, fără abonament plătit sau perioadă de grație, iar proprietarul nu e contul platformei.
  poateSterge: boolean;
};

// Listă completă — toate organizațiile, indiferent de abonament, cu
// proprietarul (primul membru cu rol owner) și ultima lui autentificare.
// Rulează în contextul de încredere `app.public_lookup` (vezi
// organizations_public_lookup/app_users_public_lookup/memberships_public_lookup
// în restore-rls.mjs) — singurul loc din platformă unde se citește cross-org,
// gardat explicit mai sus prin cerePlatformAdmin().
export async function listeazaOrganizatiiAction(): Promise<OrgRand[]> {
  await cerePlatformAdmin();
  const suport = await accesuriSuportActive();
  const organizatii = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const rows = await tx
      .select({
        id: organizations.id,
        nume: organizations.name,
        slug: organizations.slug,
        package: organizations.package,
        subscriptionStatus: organizations.subscriptionStatus,
        currentPeriodEnd: organizations.currentPeriodEnd,
        createdAt: organizations.createdAt,
        proprietarEmail: appUsers.email,
        proprietarNume: appUsers.name,
        proprietarUltimaAutentificare: appUsers.lastLoginAt,
        telefon: organizations.telefon,
        cif: organizations.cif,
        judet: organizations.judet,
        domeniuActivitate: organizations.domeniuActivitate,
      })
      .from(organizations)
      .leftJoin(
        memberships,
        sql`${memberships.orgId} = ${organizations.id} and ${memberships.role} = 'owner'`,
      )
      .leftJoin(appUsers, eq(appUsers.id, memberships.userId))
      .orderBy(desc(organizations.createdAt));
    return rows;
  });
  return organizatii.map((o) => ({ ...o, suportExpiraLa: suport.get(o.id) ?? null, poateSterge: poateFiStearsa(o, o.proprietarEmail) }));
}

function poateFiStearsa(o: { createdAt: Date; subscriptionStatus: string; package: string; currentPeriodEnd: Date | null }, emailProprietar: string | null): boolean {
  return !isPlatformAdmin(emailProprietar) && isAccessBlocked({ createdAt: o.createdAt, subscriptionStatus: o.subscriptionStatus, package: o.package as (typeof organizations.$inferSelect)["package"], currentPeriodEnd: o.currentPeriodEnd });
}

// Ajustare manuală, „la cerere" — pachetul și/sau sfârșitul perioadei plătite
// ale unei organizații, direct din panoul platformei (ex. extindere probă,
// upgrade manual convenit telefonic). Nu atinge planConfig-ul custom — dacă
// e nevoie de un plan à la carte, se face din construitorul de plan normal.
export async function ajusteazaOrgAction(
  orgId: string,
  values: { package: string; subscriptionStatus: string; currentPeriodEnd: string | null },
): Promise<void> {
  const actorEmail = await cerePlatformAdmin();
  // Tipurile TypeScript nu protejează o acțiune apelată direct: validăm id-ul, enumurile și data înainte de scriere.
  const PACHETE = ["trial", "start", "crestere", "impact", "custom"];
  const STATUSURI = ["trialing", "active", "past_due", "canceled", "incomplete"];
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const sfarsit = values.currentPeriodEnd ? new Date(values.currentPeriodEnd) : null;
  if (!UUID.test(orgId) || !PACHETE.includes(values.package) || !STATUSURI.includes(values.subscriptionStatus) || (sfarsit && Number.isNaN(sfarsit.getTime()))) {
    throw new Error("Valori invalide pentru ajustarea organizației.");
  }
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const [vechi] = await tx
      .select({ package: organizations.package, subscriptionStatus: organizations.subscriptionStatus, currentPeriodEnd: organizations.currentPeriodEnd })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    const [actor] = await tx.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.email, actorEmail)).limit(1);
    await tx
      .update(organizations)
      .set({
        package: values.package as (typeof organizations.$inferInsert)["package"],
        subscriptionStatus: values.subscriptionStatus as (typeof organizations.$inferInsert)["subscriptionStatus"],
        currentPeriodEnd: sfarsit,
      })
      .where(eq(organizations.id, orgId));
    // Jurnal de audit: cine, ce a schimbat (valori vechi → noi). Se scrie în jurnalul organizației (RLS cere contextul ei);
    // îl pot citi owner-ii/adminii acelei organizații — schimbările făcute de platformă nu rămân ascunse.
    await tx.execute(sql`select set_config('app.current_org_id', ${orgId}, true)`);
    await tx.insert(fundraisingAuditLog).values({
      orgId,
      actorAppUserId: actor?.id ?? null,
      actiune: "platform_ajustare_org",
      entitate: "organizatie",
      entitateId: orgId,
      detalii: { de: actorEmail, vechi: vechi ? { ...vechi, currentPeriodEnd: vechi.currentPeriodEnd?.toISOString() ?? null } : null, noi: values },
    });
  });
  console.log(`[platform-admin] ${actorEmail} a ajustat org ${orgId}:`, values);
}

export type RezultatStergereOrg = { error: string | null };

// Citește organizația și proprietarul ei (context de încredere) și verifică dacă poate fi ștearsă: slug-ul scris la confirmare coincide, proprietarul nu e contul
// platformei, iar proba de 30 de zile a expirat fără abonament plătit sau perioadă de grație (aceeași regulă ca blocarea accesului), și nu are plăți reușite.
async function incarcaPentruStergere(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], orgId: string, confirmare: string) {
  await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
  const [org] = await tx
    .select({ id: organizations.id, nume: organizations.name, slug: organizations.slug, cif: organizations.cif, package: organizations.package, subscriptionStatus: organizations.subscriptionStatus, currentPeriodEnd: organizations.currentPeriodEnd, createdAt: organizations.createdAt })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  if (!org) throw new EroareUtilizator("Organizația nu mai există.");
  if (confirmare.trim() !== org.slug) throw new EroareUtilizator("Confirmarea nu coincide cu adresa organizației (slug).");
  const [proprietar] = await tx
    .select({ id: appUsers.id, email: appUsers.email })
    .from(memberships)
    .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
    .where(and(eq(memberships.orgId, orgId), eq(memberships.role, "owner")))
    .limit(1);
  if (!proprietar) throw new EroareUtilizator("Organizația nu are proprietar: nu o pot șterge din panou.");
  if (!poateFiStearsa(org, proprietar.email)) {
    throw new EroareUtilizator("Se poate șterge doar o organizație cu proba de 30 de zile expirată, fără abonament plătit, și care nu aparține contului platformei.");
  }
  // De aici, contextul proprietarului: politica organizations_owner_delete și tabelele de tenant cer organizația și proprietarul în sesiune.
  await tx.execute(sql`select set_config('app.current_user_id', ${proprietar.id}, true), set_config('app.current_org_id', ${orgId}, true)`);
  const [{ platite }] = (await tx.execute(sql`select count(*)::int as platite from platform_payments where org_id = ${orgId} and status = 'reusita'`)) as unknown as { platite: number }[];
  if (platite > 0) throw new EroareUtilizator("Organizația are plăți reușite în istoric: ștergerea ei se face manual, nu din panou.");
  return { org, proprietar };
}

// Ștergerea DEFINITIVĂ a unei organizații a cărei probă de 30 de zile a expirat fără să aleagă un abonament (nu a acceptat să rămână pe platformă). Aceeași procedură ca
// ștergerea făcută de proprietar (Setări → Șterge organizația): referințele de recomandare se anulează, plățile ne-reușite se arhivează, fișierele din Storage se șterg
// (cât se poate: administratorul nu e membru al organizației), apoi rândul organizației dispare, iar toate datele ei în cascadă. Conturile de utilizator (app_users) NU
// se șterg. Confirmarea cere adresa (slug-ul) organizației; condițiile se verifică din nou în tranzacția ștergerii.
export async function stergeOrgExpirataAction(orgId: string, confirmare: string): Promise<RezultatStergereOrg> {
  const actorEmail = await cerePlatformAdmin();
  try {
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID.test(orgId)) throw new EroareUtilizator("Organizație invalidă.");
    const { org } = await db.transaction((tx) => incarcaPentruStergere(tx, orgId, confirmare));
    // Storage înainte de ștergerea rândului, în afara tranzacției (apeluri de rețea).
    const fisiereSterse = await stergeFisiereOrganizatie(org.slug, org.id);
    await db.transaction(async (tx) => {
      await incarcaPentruStergere(tx, orgId, confirmare);
      await tx.update(organizations).set({ referredByOrgId: null }).where(eq(organizations.referredByOrgId, orgId));
      await tx.execute(sql`
        insert into platform_payments_arhiva (org_id, org_name, org_cif, order_id, package, suma_lei, status, created_at, paid_at, oblio_series_name, oblio_number, oblio_link)
        select p.org_id, ${org.nume}, ${org.cif}, p.order_id, p.package::text, p.suma_lei, p.status::text, p.created_at, p.paid_at, p.oblio_series_name, p.oblio_number, p.oblio_link
        from platform_payments p where p.org_id = ${orgId}
        on conflict (order_id) do nothing`);
      const sters = await tx.delete(organizations).where(eq(organizations.id, orgId)).returning({ id: organizations.id });
      if (!sters.length) throw new EroareUtilizator("Nu s-a putut șterge organizația.");
    });
    raporteazaAvertisment("organizatie-stearsa-platforma", "organizație cu proba expirată ștearsă din panoul platformei", { orgId, orgSlug: org.slug, de: actorEmail, fisiereSterse });
    console.log(`[platform-admin] ${actorEmail} a șters org ${orgId} (/${org.slug}), fișiere șterse: ${fisiereSterse}`);
    return { error: null };
  } catch (e) {
    return { error: mesajSigur(e, "Nu am putut șterge organizația.", "platform-stergere-org") };
  }
}
