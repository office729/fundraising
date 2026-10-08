import "server-only";

import { eq, sql } from "drizzle-orm";

import { cifFolosit, creeazaOrganizatieNoua } from "@/lib/auth/provizionare";
import { verificaCifLaInscriere } from "@/lib/auth/verifica-cif";
import { citestePlanulAlesDinFormular } from "@/lib/billing/plan-from-form";
import { PLAN_QUERY_KEYS } from "@/lib/billing/plan-query";
import { db } from "@/lib/db";
import { appUsers, memberships } from "@/lib/db/schema";
import { cifValidFormat } from "@/lib/iban";
import { TERMENI_VERSIUNE } from "@/lib/legal-version";
import { normalizeazaTelefon } from "@/lib/telefon";

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// Înscrierea cu email nu creează organizația până nu e confirmată adresa (anti-abuz). Datele cerute la înscriere (nume, organizație,
// telefon, CIF, plan, cod de recomandare) rămân în metadatele contului, iar acordul cu Termenii e deja înregistrat. Deci, la prima
// autentificare după confirmare, organizația se poate crea direct, fără să-i mai cerem omului aceleași date și aceeași bifă.
// Întoarce slug-ul organizației create, sau null dacă ceva lipsește sau nu trece verificările — atunci rămâne formularul „Încă un pas".
export async function finalizeazaAutomatDinInscriere(authUser: { email?: string | null; user_metadata?: unknown }): Promise<string | null> {
  const email = authUser.email?.toLowerCase();
  if (!email) return null;
  const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  const orgName = text(meta.org_name);
  const numeContact = text(meta.full_name);
  const telefonBrut = text(meta.telefon);
  const cif = text(meta.cif);
  if (!orgName || !numeContact || !telefonBrut || !cif) return null;

  const telefon = normalizeazaTelefon(telefonBrut);
  if (!telefon || !cifValidFormat(cif)) return null;

  // Doar dacă acordul cu Termenii a fost dat la înscriere (rândul din app_users îl păstrează) și nu există deja o organizație.
  const eligibil = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_email', ${email}, true)`);
    const [u] = await tx.select({ id: appUsers.id, termeni: appUsers.termsVersion }).from(appUsers).where(eq(appUsers.email, email)).limit(1);
    if (!u || u.termeni !== TERMENI_VERSIUNE) return false;
    await tx.execute(sql`select set_config('app.current_user_id', ${u.id}, true)`);
    const apartine = await tx.select({ id: memberships.id }).from(memberships).where(eq(memberships.userId, u.id)).limit(1);
    return apartine.length === 0;
  });
  if (!eligibil) return null;

  if (await cifFolosit(cif)) return null;
  const anaf = await verificaCifLaInscriere(cif);
  if (!anaf.ok) return null;

  const planForm = new FormData();
  const metaPlan = meta.plan_query && typeof meta.plan_query === "object" ? (meta.plan_query as Record<string, unknown>) : {};
  for (const k of PLAN_QUERY_KEYS) planForm.set(k, typeof metaPlan[k] === "string" ? (metaPlan[k] as string) : "");

  const rezultat = await creeazaOrganizatieNoua({
    email,
    numeUtilizator: numeContact,
    telefon,
    cif,
    adresaSediu: anaf.adresaSediu,
    judet: anaf.judet,
    orgName,
    referralCode: text(meta.ref).slice(0, 100),
    planAles: citestePlanulAlesDinFormular(planForm),
  });
  return rezultat.ok ? rezultat.slug : null;
}
