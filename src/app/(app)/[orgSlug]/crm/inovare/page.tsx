import { withOrgSession } from "@/lib/auth/guard";
import { incarcaIdei } from "@/lib/inovare/server";
import { titluAbsolut } from "@/lib/page-titles";
import { INOVATII } from "@/content/inovatii";
import { inovatieIn } from "@/content/inovatii-en";
import { getLocale } from "@/lib/i18n/get-locale";

import { CentruInovare } from "./centru";

export const dynamic = "force-dynamic";

// Centrul de inovare în fundraising: propune idei, votează ideile altor ONG-uri, vezi ce am făcut deja. Disponibil în toate pachetele și pentru toți membrii.
const incarca = withOrgSession(async (ctx) => {
  // „Nou” = publicat în ultimele 14 zile.
  const prag = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  const locale = await getLocale();
  return { idei: await incarcaIdei(ctx.db, ctx.orgId), noutati: INOVATII.map((n) => ({ ...inovatieIn(n, locale), nou: n.data >= prag })) };
});

export default async function InovarePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const d = await incarca(orgSlug);
  return <CentruInovare orgSlug={orgSlug} idei={d.idei} noutati={d.noutati} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmInovare");
}
