import { notFound, redirect } from "next/navigation";

import { requireOrgAccess } from "@/lib/auth/guard";
import { TIMP_ALOCAT_UI_DICT } from "@/lib/i18n/dictionaries/timp-alocat-ui";
import { getLocale } from "@/lib/i18n/get-locale";

import { personalizareEfectiva } from "../personalizare-efectiva";

export async function generateMetadata() {
  return { title: `${TIMP_ALOCAT_UI_DICT[await getLocale()].titlu} — Alexandrit` };
}

// Pagina „Timp alocat” există doar pentru organizațiile cărora le-a fost activată din editorul de aspect (config.arataTimp) și doar pentru owner și admin. Fără activare, ruta nu există
// (404), ca să nu confirmăm nimic despre registrul de timp.
export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const pers = await personalizareEfectiva(orgSlug, access.userEmail);
  if (!pers?.arataTimp) notFound();
  if (access.role !== "owner" && access.role !== "admin") redirect(`/${orgSlug}/crm`);
  return children;
}
