import "@/app/(app)/[orgSlug]/crm/calm-impact.css";

import { notFound } from "next/navigation";

import { cerePlatformAdminPagina } from "@/lib/auth/platform-admin";
import { getLocale } from "@/lib/i18n/get-locale";
import { decodeazaDinAdresa } from "@/lib/personalizare-org";
import { citesteOrgPentruPersonalizare, jurnalizeazaPersonalizare } from "@/lib/suport/personalizare-admin";

import { PrevizualizareOrg } from "./previzualizare-org";

export const metadata = { title: "Previzualizare de suport", robots: { index: false, follow: false } };

// Cum arată dashboardul unei organizații, pentru echipa platformei, FĂRĂ datele ei: se citește doar rândul organizației (nume, siglă, pachet) și configurarea de
// aspect; cifrele, donatorii și campaniile sunt exemple. Fiecare deschidere (în afara previzualizării din editor) intră în jurnalul de audit al organizației.
export default async function PrevizualizarePage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await cerePlatformAdminPagina();
  const { orgSlug } = await params;
  const sp = await searchParams;
  const org = await citesteOrgPentruPersonalizare(orgSlug);
  if (!org) notFound();

  // `c`: configurare nesalvată, trimisă de editor ca să se vadă imediat; validată strict la primire. Fără ea, se arată cea salvată.
  const cod = typeof sp.c === "string" ? sp.c : null;
  const draft = cod ? decodeazaDinAdresa(cod) : null;
  const config = draft?.ok ? draft.valoare : org.config;
  const incorporat = sp.embed === "1";
  if (!incorporat) await jurnalizeazaPersonalizare(org.id, actor, "platform_previzualizare");

  const locale = await getLocale();
  return (
    <PrevizualizareOrg
      org={{
        slug: org.slug,
        nume: org.nume,
        logoUrl: org.logoUrl,
        domeniuActivitate: org.domeniuActivitate as Parameters<typeof PrevizualizareOrg>[0]["org"]["domeniuActivitate"],
        pachet: org.package,
      }}
      config={config}
      nesalvat={Boolean(draft?.ok)}
      locale={locale}
    />
  );
}
