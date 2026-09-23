"use server";

import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { semnalizeazaEveniment } from "@/lib/analytics-server";
import { ensureAppUser } from "@/lib/auth/dal";
import { citestePlanulAlesDinFormular } from "@/lib/billing/plan-from-form";
import { db } from "@/lib/db";
import { memberships, organizations } from "@/lib/db/schema";
import { formular230Beneficiari } from "@/lib/db/schema/formular230";
import { SLUG_PRINCIPAL } from "@/lib/formular230-constants";
import { AUTH_DICT } from "@/lib/i18n/dictionaries/auth";
import { getLocale } from "@/lib/i18n/get-locale";
import { esteSlugRezervat } from "@/lib/reserved-slugs";
import { genereazaCodScurt } from "@/lib/short-code";
import { slugify } from "@/lib/slugify";
import { createClient } from "@/lib/supabase/server";

export async function signupAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const errors = AUTH_DICT[await getLocale()].errors;
  const inviteToken = String(formData.get("inviteToken") ?? "").trim();
  const beneficiarInviteToken = String(formData.get("beneficiarInviteToken") ?? "").trim();
  const orgName = String(formData.get("orgName") ?? "").trim();
  const referralCode = String(formData.get("ref") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password || (!inviteToken && !beneficiarInviteToken && !orgName)) {
    return { error: errors.signupCampuri };
  }
  if (password.length < 8) {
    return { error: errors.parolaMinim };
  }

  const supabase = await createClient();
  // Mesajul Supabase (error.message) vine mereu în engleză, indiferent de
  // limba UI — nu există un cod de eroare stabil pe care să-l mapăm 1:1 fără
  // riscul de a ascunde detalii utile (email deja folosit, parolă slabă etc.);
  // rămâne netradus intenționat, ca excepție de la restul acestui flux.
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return { error: error.message };
  }
  if (!data.user) {
    return { error: errors.signupEsuat };
  }
  // Contul de autentificare există acum — orice ramură de mai jos se încheie cu
  // redirect(), deci clientul află de succes prin acest semnal scurt (vezi
  // components/analytics-events.tsx; se trimite doar cu acordul pentru analiză).
  await semnalizeazaEveniment("sign_up");

  // Cont creat printr-un link de invitație: NU se creează o organizație nouă —
  // doar rândul app_users; membership-ul (sau profilul de beneficiar) se
  // creează la pagina de acceptare, care verifică din nou emailul +
  // validitatea invitației.
  if (inviteToken || beneficiarInviteToken) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_user_email', ${email}, true)`);
      await ensureAppUser(tx, email);
    });
    if (!data.session) {
      redirect(
        `/login?confirmare=necesara&${inviteToken ? `invite=${inviteToken}` : `beneficiarInvite=${beneficiarInviteToken}`}`,
      );
    }
    redirect(inviteToken ? `/invite/${inviteToken}` : `/invite-beneficiar/${beneficiarInviteToken}`);
  }

  // Provizionare: creează app_users (dacă nu există) + organizația nouă +
  // membership de owner, toate într-o singură tranzacție. Politicile RLS
  // permisive de INSERT pentru acest flux sunt documentate în
  // documentation/rls-setup.sql (secțiunea „bootstrapping”).
  const planAles = citestePlanulAlesDinFormular(formData);
  const baseSlug = slugify(orgName);
  const orgSlug = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_email', ${email}, true)`);
    const appUser = await ensureAppUser(tx, email);
    await tx.execute(sql`select set_config('app.current_user_id', ${appUser.id}, true)`);
    // Necesar pentru verificarea de unicitate a slug-ului ȘI pentru
    // rezolvarea codului de recomandare de mai jos — la acest moment din
    // tranzacție nu există încă niciun membership, deci organizations_member
    // nu se aplică; fără app.public_lookup, ambele SELECT-uri rulau
    // silențios pe 0 rânduri sub FORCE ROW LEVEL SECURITY (organizația
    // "nouă" ar fi părut mereu disponibilă, iar codul de recomandare nu s-ar
    // fi găsit niciodată — exact bug-ul descoperit testând live referralul).
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);

    let slug = baseSlug;
    for (let attempt = 1; attempt <= 20; attempt++) {
      const existing = esteSlugRezervat(slug)
        ? true
        : (
            await tx
              .select({ id: organizations.id })
              .from(organizations)
              .where(eq(organizations.slug, slug))
              .limit(1)
          )[0];
      if (!existing) break;
      slug = `${baseSlug}-${attempt}`;
    }

    // Cod de recomandare opțional (?ref=...) — dacă e valid, organizația nouă
    // are dreptul la 50% reducere la primul abonament plătit (vezi
    // lib/billing/stripe-checkout.ts). Cod invalid/lipsă → ignorat silențios,
    // nu blochează înscrierea. Același SELECT-bootstrap ca verificarea de
    // unicitate a slug-ului de mai sus (RLS permisiv înainte de membership).
    let referredByOrgId: string | null = null;
    if (referralCode) {
      const referrer = await tx.select({ id: organizations.id }).from(organizations).where(eq(organizations.referralCode, referralCode)).limit(1);
      referredByOrgId = referrer[0]?.id ?? null;
    }

    // Fără .returning() aici: INSERT...RETURNING pe organizations ar re-verifica
    // politica RLS de SELECT pentru rândul nou — care cere un membership deja
    // existent. La acest moment membership-ul încă nu există (îl creăm mai jos),
    // deci am genera un fals "row-level security violation". Id-ul e generat în
    // cod ca să putem insera membership-ul fără să mai citim înapoi organizația.
    const orgId = randomUUID();
    await tx.insert(organizations).values({
      id: orgId,
      name: orgName,
      slug,
      referredByOrgId,
      ...(planAles ?? {}),
    });
    await tx.insert(memberships).values({ orgId, userId: appUser.id, role: "owner" });
    // Contul implicit de Formular 230 — orice organizație nouă are din start
    // unul, cu slug fix "principal", ca link-ul /f230/<orgSlug> să funcționeze
    // imediat (redirect către /f230/<orgSlug>/principal — vezi f230/[orgSlug]/page.tsx).
    await tx
      .insert(formular230Beneficiari)
      .values({ orgId, nume: orgName, slug: SLUG_PRINCIPAL, shortCode: genereazaCodScurt() });
    return slug;
  });

  // redirect() trebuie apelat DUPĂ ce tranzacția s-a încheiat — aruncă o
  // excepție specială Next.js care nu trebuie prinsă de db.transaction().
  if (!data.session) {
    // Confirmarea de email e activă în proiectul Supabase — userul nu are
    // încă sesiune activă. Vezi README.md pentru cum se dezactivează la
    // testare sau cum se construiește pagina de „verifică-ți emailul”.
    redirect("/login?confirmare=necesara");
  }
  redirect(`/${orgSlug}`);
}
