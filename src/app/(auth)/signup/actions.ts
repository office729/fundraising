"use server";

import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { ensureAppUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { memberships, organizations } from "@/lib/db/schema";
import { formular230Beneficiari } from "@/lib/db/schema/formular230";
import { SLUG_PRINCIPAL } from "@/lib/formular230-constants";
import { esteSlugRezervat } from "@/lib/reserved-slugs";
import { genereazaCodScurt } from "@/lib/short-code";
import { slugify } from "@/lib/slugify";
import { createClient } from "@/lib/supabase/server";

export async function signupAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const inviteToken = String(formData.get("inviteToken") ?? "").trim();
  const orgName = String(formData.get("orgName") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password || (!inviteToken && !orgName)) {
    return { error: "Completează toate câmpurile." };
  }
  if (password.length < 8) {
    return { error: "Parola trebuie să aibă cel puțin 8 caractere." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return { error: error.message };
  }
  if (!data.user) {
    return { error: "Înregistrarea a eșuat — încearcă din nou." };
  }

  // Cont creat printr-un link de invitație: NU se creează o organizație nouă —
  // doar rândul app_users; membership-ul se creează la /invite/[token], unde
  // acceptInviteAction verifică din nou emailul + validitatea invitației.
  if (inviteToken) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_user_email', ${email}, true)`);
      await ensureAppUser(tx, email);
    });
    if (!data.session) {
      redirect(`/login?confirmare=necesara&invite=${inviteToken}`);
    }
    redirect(`/invite/${inviteToken}`);
  }

  // Provizionare: creează app_users (dacă nu există) + organizația nouă +
  // membership de owner, toate într-o singură tranzacție. Politicile RLS
  // permisive de INSERT pentru acest flux sunt documentate în
  // documentation/rls-setup.sql (secțiunea „bootstrapping”).
  const baseSlug = slugify(orgName);
  const orgSlug = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_email', ${email}, true)`);
    const appUser = await ensureAppUser(tx, email);
    await tx.execute(sql`select set_config('app.current_user_id', ${appUser.id}, true)`);

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

    // Fără .returning() aici: INSERT...RETURNING pe organizations ar re-verifica
    // politica RLS de SELECT pentru rândul nou — care cere un membership deja
    // existent. La acest moment membership-ul încă nu există (îl creăm mai jos),
    // deci am genera un fals "row-level security violation". Id-ul e generat în
    // cod ca să putem insera membership-ul fără să mai citim înapoi organizația.
    const orgId = randomUUID();
    await tx.insert(organizations).values({ id: orgId, name: orgName, slug });
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
