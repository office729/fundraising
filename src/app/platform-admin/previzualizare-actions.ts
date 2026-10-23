"use server";

import { cookies } from "next/headers";

import { cerePlatformAdminActiune } from "@/lib/auth/platform-admin";
import { valideazaPersonalizare, type PersonalizareOrg } from "@/lib/personalizare-org";
import { COOKIE_PREVIZUALIZARE, DURATA_PREVIZUALIZARE_SECUNDE, ORG_DEMO_SLUG, codeazaStare, slugValid } from "@/lib/previzualizare";
import { citesteOrgPentruPersonalizare } from "@/lib/suport/personalizare-admin";

export type RezultatPrevizualizare = { ok: true; url: string } | { ok: false; eroare: string };

// Pornește (sau reîmprospătează) previzualizarea navigabilă: setează cookie-ul de stare și întoarce adresa organizației demo. Nu se atinge nicio dată a organizației
// al cărei aspect se previzualizează. Doar administratori ai platformei; configurarea nesalvată din editor e validată strict, ca orice altă configurare.
// Se apelează la fiecare modificare din editor, deci nu scrie în jurnalul de audit: deschiderea editorului (app/platform-admin/personalizare) e deja înregistrată.
export async function pornestePrevizualizareAction(orgSlug: string, draft: unknown): Promise<RezultatPrevizualizare> {
  await cerePlatformAdminActiune();
  if (!slugValid(orgSlug)) return { ok: false, eroare: "Organizație invalidă." };
  const org = await citesteOrgPentruPersonalizare(orgSlug);
  if (!org) return { ok: false, eroare: "Organizația nu există." };

  let config: PersonalizareOrg | null = null;
  if (draft !== null && draft !== undefined) {
    const v = valideazaPersonalizare(draft);
    if (!v.ok) return { ok: false, eroare: v.eroare };
    config = v.valoare;
  }

  (await cookies()).set(COOKIE_PREVIZUALIZARE, codeazaStare(orgSlug, config), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURATA_PREVIZUALIZARE_SECUNDE,
  });
  return { ok: true, url: `/${ORG_DEMO_SLUG}/crm` };
}
