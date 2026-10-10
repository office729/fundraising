import { caleCampanie } from "@/lib/link-campanie";
import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { fundraisingPages, organizations } from "@/lib/db/schema";

// Secțiunea „Campanii” de pe prima pagină se activează abia când s-au înscris primele 20 de organizații;
// până atunci vizitatorul vede doar progresul spre prag, nu o listă goală sau pe jumătate goală.
export const PRAG_ORGANIZATII = 20;
const MAX_ASOCIATII = 12;
const CAMPANII_PE_CARD = 3;

export type CampaniePublica = {
  id: string;
  href: string;
  titlu: string;
  poveste: string; // scurtată, pentru carduri
  imagineUrl: string | null;
  domeniu: string;
  sumaStransa: number;
  sumaTinta: number | null;
};

// Cardul public al unei asociații: numele ei (nu al proiectului) și campaniile active pentru proiecte diferite.
export type AsociatiePublica = {
  slug: string;
  nume: string;
  logoUrl: string | null;
  domeniu: string | null;
  judet: string | null;
  totalStrans: number;
  nrCampanii: number;
  coperta: string | null; // poza uneia dintre campanii, pentru coperta cardului
  campanii: CampaniePublica[]; // primele CAMPANII_PE_CARD, după suma strânsă
};

export type CampanieInFocus = { campanie: CampaniePublica; asociatie: { nume: string; logoUrl: string | null; slug: string } };

export type CampaniiLanding = {
  organizatii: number;
  active: boolean;
  asociatii: AsociatiePublica[];
  inFocus: CampanieInFocus | null;
  statistici: { asociatii: number; campanii: number; strans: number };
};

const GOL: Pick<CampaniiLanding, "asociatii" | "inFocus" | "statistici"> = { asociatii: [], inFocus: null, statistici: { asociatii: 0, campanii: 0, strans: 0 } };

const scurta = (t: string, max = 200) => {
  const s = t.replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max).replace(/\s+\S*$/, "")}…` : s;
};

// Citire publică, în contextul de încredere app.public_lookup (la fel ca hub-ul public al organizației):
// din organizații se iau doar numărul și datele deja publice (nume, logo, slug, domeniu, județ), din campanii doar cele active.
// `ignoraPrag` e doar pentru pagina ascunsă de lucru (previzualizare-campanii): arată starea activă și sub prag.
export async function getCampaniiLanding(opt: { ignoraPrag?: boolean } = {}): Promise<CampaniiLanding> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const [{ nr }] = await tx.select({ nr: sql<number>`count(*)::int` }).from(organizations);
    if (nr < PRAG_ORGANIZATII && !opt.ignoraPrag) return { organizatii: nr, active: false, ...GOL };

    const [tot] = await tx
      .select({
        campanii: sql<number>`count(*)::int`,
        strans: sql<number>`coalesce(sum(${fundraisingPages.sumaStransa}), 0)::bigint`,
        asociatii: sql<number>`count(distinct ${fundraisingPages.orgId})::int`,
      })
      .from(fundraisingPages)
      .where(eq(fundraisingPages.status, "activa"));

    const rows = await tx
      .select({
        id: fundraisingPages.id,
        slug: fundraisingPages.slug,
        titlu: fundraisingPages.titlu,
        poveste: fundraisingPages.poveste,
        imagineUrl: fundraisingPages.imagineUrl,
        template: fundraisingPages.template,
        sumaStransa: fundraisingPages.sumaStransa,
        sumaTinta: fundraisingPages.sumaTinta,
        orgId: organizations.id,
        orgSlug: organizations.slug,
        orgNume: organizations.name,
        orgLogoUrl: organizations.logoUrl,
        orgDomeniu: organizations.domeniuActivitate,
        orgJudet: organizations.judet,
      })
      .from(fundraisingPages)
      .innerJoin(organizations, eq(organizations.id, fundraisingPages.orgId))
      .where(eq(fundraisingPages.status, "activa"))
      .orderBy(desc(fundraisingPages.sumaStransa), desc(fundraisingPages.createdAt))
      .limit(400);

    const dupaOrg = new Map<string, AsociatiePublica>();
    let inFocus: CampanieInFocus | null = null;
    for (const r of rows) {
      const campanie: CampaniePublica = {
        id: r.id,
        href: caleCampanie(r.orgSlug, r.slug),
        titlu: r.titlu,
        poveste: scurta(r.poveste),
        imagineUrl: r.imagineUrl,
        domeniu: r.template,
        sumaStransa: r.sumaStransa,
        sumaTinta: r.sumaTinta,
      };
      let a = dupaOrg.get(r.orgId);
      if (!a) {
        a = { slug: r.orgSlug, nume: r.orgNume, logoUrl: r.orgLogoUrl, domeniu: r.orgDomeniu, judet: r.orgJudet, totalStrans: 0, nrCampanii: 0, coperta: null, campanii: [] };
        dupaOrg.set(r.orgId, a);
      }
      a.totalStrans += r.sumaStransa;
      a.nrCampanii += 1;
      if (!a.coperta && r.imagineUrl) a.coperta = r.imagineUrl;
      if (a.campanii.length < CAMPANII_PE_CARD) a.campanii.push(campanie);
      // Campania în focus: cea mai avansată dintre cele cu poză (rândurile vin deja după suma strânsă); altfel prima.
      if (!inFocus || (!inFocus.campanie.imagineUrl && r.imagineUrl)) inFocus = { campanie, asociatie: { nume: r.orgNume, logoUrl: r.orgLogoUrl, slug: r.orgSlug } };
    }
    const asociatii = [...dupaOrg.values()].sort((x, y) => y.totalStrans - x.totalStrans || y.nrCampanii - x.nrCampanii).slice(0, MAX_ASOCIATII);
    return { organizatii: nr, active: true, asociatii, inFocus, statistici: { asociatii: tot.asociatii, campanii: tot.campanii, strans: Number(tot.strans) } };
  });
}
