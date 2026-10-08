"use server";

import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth/dal";
import { creeazaOrganizatieNoua, MAX_LUNGIME_NUME_ORGANIZATIE } from "@/lib/auth/provizionare";
import { verificaCifLaInscriere } from "@/lib/auth/verifica-cif";
import { cifValidFormat } from "@/lib/iban";
import { normalizeazaTelefon } from "@/lib/telefon";
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
  const numeContact = String(formData.get("numeContact") ?? "").trim();
  const telefonBrut = String(formData.get("telefon") ?? "").trim();
  const cifBrut = String(formData.get("cif") ?? "").trim();
  if (!orgName) {
    return { error: "Completează numele organizației." };
  }
  if (!numeContact || numeContact.length > 120) {
    return { error: "Scrie-ți numele (și prenumele)." };
  }
  const telefon = normalizeazaTelefon(telefonBrut);
  if (!telefon) {
    return { error: "Numărul de telefon nu pare corect — scrie-l cu cifre, de exemplu 0722 123 456." };
  }
  if (!cifBrut || !cifValidFormat(cifBrut)) {
    return { error: "CIF invalid — scrie doar cifrele, cu sau fără prefixul RO (ex. RO12345678)." };
  }
  if (orgName.length > MAX_LUNGIME_NUME_ORGANIZATIE) {
    return { error: `Numele organizației e prea lung (maxim ${MAX_LUNGIME_NUME_ORGANIZATIE} de caractere).` };
  }
  // Validat pe server — bifa se poate ocoli din browser.
  if (formData.get("acceptTermeni") !== "on") {
    return { error: "Pentru a crea contul trebuie să accepți Termenii și condițiile și Politica de confidențialitate." };
  }

  const anaf = await verificaCifLaInscriere(cifBrut);
  if (!anaf.ok) {
    return {
      error:
        anaf.motiv === "negasit"
          ? "Nu am găsit acest CIF în ANAF. Verifică cifrele (fără spații) sau scrie-ne la vlad.placinta@alexandrit.ro."
          : "Organizația cu acest CIF figurează ca inactivă sau radiată în ANAF, deci nu putem crea contul. Dacă e o greșeală, scrie-ne la vlad.placinta@alexandrit.ro.",
    };
  }

  const authUser = await getAuthUser();
  if (!authUser?.email) {
    redirect("/login");
  }
  const email = authUser.email!.toLowerCase();

  const rezultat = await creeazaOrganizatieNoua({
    email,
    numeUtilizator: numeContact,
    telefon,
    cif: cifBrut,
    adresaSediu: anaf.adresaSediu,
    judet: anaf.judet,
    orgName,
    referralCode,
    planAles: citestePlanulAlesDinFormular(formData),
  });
  if (!rezultat.ok && rezultat.motiv === "cif_existent") {
    return { error: "Există deja o organizație înregistrată cu acest CIF. Dacă este a ta, cere un acces de la administratorul ei sau scrie-ne la vlad.placinta@alexandrit.ro." };
  }
  if (!rezultat.ok) {
    return { error: "Ai atins numărul maxim de organizații pentru un cont. Scrie-ne la vlad.placinta@alexandrit.ro dacă ai nevoie de mai multe." };
  }

  redirect(`/${rezultat.slug}/crm`);
}
