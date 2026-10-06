"use server";

import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { raporteazaEroare } from "@/lib/monitoring";
import { createClient } from "@/lib/supabase/server";

export type StergeContState = { error: string | null };

// „Șterge-mi contul" (art. 17 GDPR) pentru orice utilizator autentificat. Identitatea vine din sesiunea VERIFICATĂ pe
// server (nu dintr-un câmp trimis de client): un utilizator își poate șterge doar propriul cont. Funcția din baza de
// date anonimizează rândul din app_users, scoate utilizatorul din organizații, șterge invitațiile pe emailul lui și
// contul din Supabase Auth; refuză dacă ar lăsa o organizație fără niciun owner.
export async function stergeContulMeuAction(_prev: StergeContState, formData: FormData): Promise<StergeContState> {
  const user = await getAuthUser();
  if (!user?.email) redirect("/login");
  const email = user.email.toLowerCase();

  const confirmare = String(formData.get("confirmare") ?? "").trim().toLowerCase();
  if (confirmare !== email) return { error: "Scrie exact adresa de email a contului pentru a confirma ștergerea." };

  try {
    await db.transaction(async (tx) => {
      // Contextul de email necesar politicii RLS de SELECT pe app_users (ca la restul fluxurilor de autentificare).
      await tx.execute(sql`select set_config('app.current_user_email', ${email}, true)`);
      const rows = await tx.execute<{ id: string }>(sql`select id from app_users where lower(email) = ${email} limit 1`);
      const id = (rows as unknown as { id: string }[])[0]?.id;
      if (!id) throw new Error("utilizator_inexistent");
      await tx.execute(sql`select app_private.sterge_cont_utilizator(${id}::uuid, ${email})`);
    });
  } catch (e) {
    const mesaj = e instanceof Error ? e.message : "";
    if (mesaj.includes("unic_owner")) {
      return {
        error:
          "Ești singurul owner al uneia sau mai multor organizații. Predă rolul de owner altcuiva sau șterge organizația (Setări → Date și ștergerea organizației), apoi încearcă din nou.",
      };
    }
    raporteazaEroare("stergere-cont", e);
    return { error: "Nu am putut șterge contul. Încearcă din nou sau scrie-ne la vlad.placinta@alexandrit.ro." };
  }

  // Contul Supabase Auth a fost șters; închidem și sesiunea din acest browser.
  const supabase = await createClient();
  await supabase.auth.signOut().catch(() => undefined);
  redirect("/?cont=sters");
}
