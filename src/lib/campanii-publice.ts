import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { fundraisingPages, organizations } from "@/lib/db/schema";

// Secțiunea „Campanii” de pe prima pagină se activează abia când s-au înscris primele 20 de organizații;
// până atunci vizitatorul vede doar progresul spre prag, nu o listă goală sau pe jumătate goală.
export const PRAG_ORGANIZATII = 20;
const MAX_ASOCIATII = 6;
const CAMPANII_PE_CARD = 3;

export type CampaniePublica = {
  id: string;
  href: string;
  titlu: string;
  imagineUrl: string | null;
  sumaStransa: number;
  sumaTinta: number | null;
};

// Cardul public al unei asociații: numele ei (nu al proiectului) și campaniile active pentru proiecte diferite.
export type AsociatiePublica = {
  slug: string;
  nume: string;
  logoUrl: string | null;
  domeniu: string | null;
  totalStrans: number;
  nrCampanii: number;
  campanii: CampaniePublica[]; // primele CAMPANII_PE_CARD, după suma strânsă
};

export type CampaniiLanding = { organizatii: number; active: boolean; asociatii: AsociatiePublica[] };

// Citire publică, în contextul de încredere app.public_lookup (la fel ca hub-ul public al organizației):
// din organizații se iau doar numărul și datele deja publice (nume, logo, slug, domeniu), din campanii doar cele active.
// `ignoraPrag` e doar pentru pagina ascunsă de lucru (previzualizare-campanii): arată starea activă și sub prag.
export async function getCampaniiLanding(opt: { ignoraPrag?: boolean } = {}): Promise<CampaniiLanding> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const [{ nr }] = await tx.select({ nr: sql<number>`count(*)::int` }).from(organizations);
    if (nr < PRAG_ORGANIZATII && !opt.ignoraPrag) return { organizatii: nr, active: false, asociatii: [] };

    const rows = await tx
      .select({
        id: fundraisingPages.id,
        slug: fundraisingPages.slug,
        titlu: fundraisingPages.titlu,
        imagineUrl: fundraisingPages.imagineUrl,
        sumaStransa: fundraisingPages.sumaStransa,
        sumaTinta: fundraisingPages.sumaTinta,
        orgId: organizations.id,
        orgSlug: organizations.slug,
        orgNume: organizations.name,
        orgLogoUrl: organizations.logoUrl,
        orgDomeniu: organizations.domeniuActivitate,
      })
      .from(fundraisingPages)
      .innerJoin(organizations, eq(organizations.id, fundraisingPages.orgId))
      .where(eq(fundraisingPages.status, "activa"))
      .orderBy(desc(fundraisingPages.sumaStransa), desc(fundraisingPages.createdAt))
      .limit(400);

    const dupaOrg = new Map<string, AsociatiePublica>();
    for (const r of rows) {
      let a = dupaOrg.get(r.orgId);
      if (!a) {
        a = { slug: r.orgSlug, nume: r.orgNume, logoUrl: r.orgLogoUrl, domeniu: r.orgDomeniu, totalStrans: 0, nrCampanii: 0, campanii: [] };
        dupaOrg.set(r.orgId, a);
      }
      a.totalStrans += r.sumaStransa;
      a.nrCampanii += 1;
      if (a.campanii.length < CAMPANII_PE_CARD) {
        a.campanii.push({ id: r.id, href: `/strangere-fonduri/${r.orgSlug}/${r.slug}`, titlu: r.titlu, imagineUrl: r.imagineUrl, sumaStransa: r.sumaStransa, sumaTinta: r.sumaTinta });
      }
    }
    const asociatii = [...dupaOrg.values()].sort((x, y) => y.totalStrans - x.totalStrans || y.nrCampanii - x.nrCampanii).slice(0, MAX_ASOCIATII);
    return { organizatii: nr, active: true, asociatii };
  });
}
