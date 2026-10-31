"use server";

import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth/dal";
import { creeazaOrganizatieNoua, MAX_LUNGIME_NUME_ORGANIZATIE } from "@/lib/auth/provizionare";
import { verificaCifLaInscriere } from "@/lib/auth/verifica-cif";
import { cifValidFormat } from "@/lib/iban";
import { normalizeazaTelefon } from "@/lib/telefon";
import { citestePlanulAlesDinFormular } from "@/lib/billing/plan-from-form";
import { AUTH_DICT } from "@/lib/i18n/dictionaries/auth";
import { FINALIZE_UI_DICT } from "@/lib/i18n/dictionaries/finalize-ui";
import { getLocale } from "@/lib/i18n/get-locale";

// Pasul de finalizare pentru cine s-a autentificat fără să aibă încă o
// organizație: prima autentificare cu Google sau prima autentificare după
// confirmarea emailului (înscrierea cu email nu mai creează organizația până nu e
// confirmat emailul). Userul e DEJA autentificat la Supabase (nu mai chemăm
// supabase.auth.signUp aici), doar îi lipsește organizația.
export async function finalizeazaOrganizatiaAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const locale = await getLocale();
  const e = AUTH_DICT[locale].errors;
  const t = FINALIZE_UI_DICT[locale];
  const orgName = String(formData.get("orgName") ?? "").trim();
  const referralCode = String(formData.get("ref") ?? "").trim();
  const numeContact = String(formData.get("numeContact") ?? "").trim();
  const telefonBrut = String(formData.get("telefon") ?? "").trim();
  const cifBrut = String(formData.get("cif") ?? "").trim();
  const ctxAtribuire = String(formData.get("ctxAtribuire") ?? "").slice(0, 900);
  if (!orgName) {
    return { error: t.orgLipsa };
  }
  if (!numeContact || numeContact.length > 120) {
    return { error: e.numeLipsa };
  }
  const telefon = normalizeazaTelefon(telefonBrut);
  if (!telefon) {
    return { error: e.telefonInvalid };
  }
  if (!cifBrut || !cifValidFormat(cifBrut)) {
    return { error: e.cifInvalid };
  }
  if (orgName.length > MAX_LUNGIME_NUME_ORGANIZATIE) {
    return { error: t.orgPreaLung(MAX_LUNGIME_NUME_ORGANIZATIE) };
  }
  // Validat pe server — bifa se poate ocoli din browser.
  if (formData.get("acceptTermeni") !== "on") {
    return { error: e.termeniNeacceptati };
  }

  const anaf = await verificaCifLaInscriere(cifBrut);
  if (!anaf.ok) {
    return {
      error:
        anaf.motiv === "negasit"
          ? e.cifNegasit
          : e.cifInactiv,
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
    ctxAtribuire: ctxAtribuire || null,
  });
  if (!rezultat.ok && rezultat.motiv === "cif_existent") {
    return { error: e.cifExistent };
  }
  if (!rezultat.ok) {
    return { error: e.limitaOrganizatii };
  }

  redirect(`/${rezultat.slug}/crm`);
}
