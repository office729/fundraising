import { asc, desc, eq } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { filtreDinParametri, incarcaRaport, type Filtre } from "@/lib/atribuire/rapoarte";
import { formular230Beneficiari, fundraisingPages } from "@/lib/db/schema";
import { SURSE_UI_DICT } from "@/lib/i18n/dictionaries/surse-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { caleCampanie } from "@/lib/link-campanie";

import type { TintaLink } from "./generator-linkuri";
import { SurseVedere } from "./vedere";

export const dynamic = "force-dynamic";

// „Statistici și surse”: de unde vin vizitatorii campaniilor și ai Formularului 230 și ce rezultate aduc. Disponibil în toate pachetele (nu e un modul gated).
// Orice membru vede cifrele agregate; istoricul vizitatorilor identificabili și exportul CSV cer rol de proprietar sau administrator.
const incarca = withOrgSession(async (ctx, f: Filtre) => {
  const tr = SURSE_UI_DICT[await getLocale()].tinte;
  const poateAdministra = ctx.role === "owner" || ctx.role === "admin";
  const raport = await incarcaRaport(ctx.db, ctx.orgId, f, poateAdministra);
  const pagini = await ctx.db
    .select({ slug: fundraisingPages.slug, titlu: fundraisingPages.titlu, status: fundraisingPages.status })
    .from(fundraisingPages)
    .where(eq(fundraisingPages.orgId, ctx.orgId))
    .orderBy(desc(fundraisingPages.createdAt))
    .limit(200);
  const conturi = await ctx.db
    .select({ slug: formular230Beneficiari.slug, nume: formular230Beneficiari.nume })
    .from(formular230Beneficiari)
    .where(eq(formular230Beneficiari.orgId, ctx.orgId))
    .orderBy(asc(formular230Beneficiari.createdAt));
  const tinte: TintaLink[] = [
    ...pagini.map((p) => ({ cheie: `c:${p.slug}`, grup: tr.grupCampanii, eticheta: p.status === "activa" ? p.titlu : `${p.titlu} (${tr.inactiva})`, cale: caleCampanie(ctx.orgSlug, p.slug) })),
    { cheie: "pagina-org", grup: tr.grupCampanii, eticheta: tr.paginaOrg, cale: `/strangere-fonduri/${ctx.orgSlug}` },
    ...conturi.map((c) => ({ cheie: `f:${c.slug}`, grup: tr.grupF230, eticheta: tr.f230(c.nume), cale: `/f230/${ctx.orgSlug}/${c.slug}` })),
  ];
  return { raport, poateAdministra, tinte, orgNume: ctx.orgName };
});

export default async function SursePage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const f = filtreDinParametri(sp);
  const d = await incarca(orgSlug, f);
  const siteUrl = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://alexandrit.ro").origin;
    } catch {
      return "https://alexandrit.ro";
    }
  })();
  const locale = await getLocale();
  return <SurseVedere locale={locale} orgSlug={orgSlug} orgNume={d.orgNume} raport={d.raport} tab={sp.tab === "linkuri" ? "linkuri" : "rezumat"} poateAdministra={d.poateAdministra} tinte={d.tinte} siteUrl={siteUrl} />;
}
