"use server";

import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth/dal";
import { creeazaOrganizatieNoua, MAX_LUNGIME_NUME_ORGANIZATIE } from "@/lib/auth/provizionare";
import { citestePlanulAlesDinFormular } from "@/lib/billing/plan-from-form";

// Pasul de finalizare pentru cine s-a autentificat fără să aibă încă o
// organizație: prima autentificare cu Google sau prima autentificare după
// confirmarea emailului (înscrierea cu email nu mai creează organizația până nu e
// confirmat emailul). Userul e DEJA autentificat la Supabase (nu mai chemăm
// supabase.auth.signUp aici), doar îi lipsește organizația.
export async function finalizeazaOrganizatiaAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const orgName = String(formData.get("orgName") ?? "").trim();
  const referralCode = String(formData.get("ref") ?? "").trim();
  if (!orgName) {
    return { error: "Completează numele organizației." };
  }
  if (orgName.length > MAX_LUNGIME_NUME_ORGANIZATIE) {
    return { error: `Numele organizației e prea lung (maxim ${MAX_LUNGIME_NUME_ORGANIZATIE} de caractere).` };
  }
  // Validat pe server — bifa se poate ocoli din browser.
  if (formData.get("acceptTermeni") !== "on") {
    return { error: "Pentru a crea contul trebuie să accepți Termenii și condițiile și Politica de confidențialitate." };
  }

  const authUser = await getAuthUser();
  if (!authUser?.email) {
    redirect("/login");
  }
  const email = authUser.email!.toLowerCase();
  const name = (authUser.user_metadata?.full_name as string | undefined) ?? null;

  const rezultat = await creeazaOrganizatieNoua({
    email,
    numeUtilizator: name,
    orgName,
    referralCode,
    planAles: citestePlanulAlesDinFormular(formData),
  });
  if (!rezultat.ok) {
    return { error: "Ai atins numărul maxim de organizații pentru un cont. Scrie-ne la vlad.placinta@alexandrit.ro dacă ai nevoie de mai multe." };
  }

  redirect(`/${rezultat.slug}/crm`);
}
