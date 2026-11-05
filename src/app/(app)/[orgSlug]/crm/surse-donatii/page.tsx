import { withOrgSession } from "@/lib/auth/guard";
import { getLocale } from "@/lib/i18n/get-locale";
import { CATEGORII } from "@/lib/surse-donatii/nucleu";
import { incarcaRaportSurse } from "@/lib/surse-donatii/raport";
import { parseazaFiltre, ziuaBucuresti, type FiltreSurse } from "@/lib/surse-donatii/raport-reguli";

import { SurseDonatiiVedere } from "./vedere";

export const dynamic = "force-dynamic";

// „Sursele donațiilor”: donațiile PLĂTITE cu o sursă externă identificată, pe sursă, în EUR. Disponibil în toate pachetele (nu e un modul gated).
// Orice membru vede cifrele agregate și lista donațiilor dintr-un total, fără nume sau email de donator; interogările filtrează explicit după organizația curentă.
const incarca = withOrgSession(async (ctx, f: FiltreSurse) => incarcaRaportSurse(ctx.db, ctx.orgId, f));

export default async function SurseDonatiiPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orgSlug } = await params;
  const f = parseazaFiltre(await searchParams, CATEGORII);
  const [d, locale] = await Promise.all([incarca(orgSlug, f), getLocale()]);
  return <SurseDonatiiVedere locale={locale} orgSlug={orgSlug} filtre={f} date={d} azi={ziuaBucuresti()} />;
}
