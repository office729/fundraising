import { NextResponse } from "next/server";

import { esteBeneficiarLogat, getAuthUser, getMyOrgSlug } from "@/lib/auth/dal";

// Intrarea „în platformă" după autentificare: cine e deja logat și deschide /login sau /signup ajunge aici și e dus în CRM
// (sau în panoul de beneficiar). Pagina de start rămâne vizibilă pentru toți, inclusiv pentru utilizatorii autentificați.
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const user = await getAuthUser();
  if (!user?.email) return NextResponse.redirect(`${origin}/login`);
  const slug = await getMyOrgSlug();
  if (slug) return NextResponse.redirect(`${origin}/${slug}/crm`);
  if (await esteBeneficiarLogat()) return NextResponse.redirect(`${origin}/beneficiar`);
  return NextResponse.redirect(`${origin}/`);
}
