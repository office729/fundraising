import { and, eq, gt, inArray, ne, or, sql } from "drizzle-orm";

import { withOrgSession, type OrgContext } from "@/lib/auth/guard";
import { deduplicaSiOrdoneaza, persoaneUnice, potriveste, ultimele9, type CaleCalda } from "@/lib/cai-calde";
import { companies, contacts, crmKv, donatoriReali } from "@/lib/db/schema";

// „Căi calde” pentru o firmă: persoanele ei de contact care sunt deja donatori, voluntari sau contacte la ALTĂ firmă care a sponsorizat,
// din datele aceleiași organizații (toate interogările trec prin RLS-ul organizației). Regulile de potrivire sunt în lib/cai-calde.ts.
const LIMITA_DONATORI = 500;
const LIMITA_SPONSORI = 3000;

export async function caiCaldePentru(ctx: Pick<OrgContext, "db" | "orgId">, companyId: string): Promise<CaleCalda[]> {
  const deLaFirma = await ctx.db
    .select({ nume: contacts.nume, rol: contacts.rol, email: contacts.email, telefon: contacts.telefon })
    .from(contacts)
    .where(and(eq(contacts.companyId, companyId), eq(contacts.orgId, ctx.orgId)));
  const persoane = persoaneUnice(deLaFirma);
  if (persoane.length === 0) return [];

  const emails = [...new Set(persoane.map((p) => (p.email ?? "").trim().toLowerCase()).filter(Boolean))];
  const telefoane = [...new Set(persoane.map((p) => ultimele9(p.telefon)).filter(Boolean))];
  const rezultate: CaleCalda[] = [];

  // 1. Donatori: doar potrivire pe e-mail sau telefon (sigură); numele singur nu e suficient pentru date personale.
  if (emails.length || telefoane.length) {
    const conditii = [];
    if (emails.length) conditii.push(inArray(sql`lower(${donatoriReali.email})`, emails));
    if (telefoane.length) conditii.push(inArray(sql`right(regexp_replace(coalesce(${donatoriReali.telefon}, ''), '[^0-9]', '', 'g'), 9)`, telefoane));
    const donatori = await ctx.db
      .select({ nume: donatoriReali.nume, email: donatoriReali.email, telefon: donatoriReali.telefon, numarDonatii: donatoriReali.numarDonatii, totalDonat: donatoriReali.totalDonat })
      .from(donatoriReali)
      .where(and(eq(donatoriReali.orgId, ctx.orgId), or(...conditii)))
      .limit(LIMITA_DONATORI);
    rezultate.push(
      ...potriveste(
        persoane,
        donatori.map((d) => ({
          e: { nume: d.nume, email: d.email, telefon: d.telefon },
          detaliu: `Donator · ${d.numarDonatii} ${d.numarDonatii === 1 ? "donație" : "donații"} · ${d.totalDonat.toLocaleString("ro-RO")} lei`,
        })),
        "donator",
        false,
      ),
    );
  }

  // 2. Voluntari: lista din instrumentul CRM Voluntari (un singur document pe organizație).
  const [roster] = await ctx.db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, "voluntari-roster"))).limit(1);
  const voluntari = Array.isArray((roster?.data as { volunteers?: unknown } | null)?.volunteers) ? ((roster!.data as { volunteers: Record<string, unknown>[] }).volunteers) : [];
  rezultate.push(
    ...potriveste(
      persoane,
      voluntari.map((v) => ({
        e: { nume: v.nume ? String(v.nume) : null, email: v.email ? String(v.email) : null, telefon: v.telefon ? String(v.telefon) : null },
        detaliu: `Voluntar${v.activ === false ? " (inactiv)" : ""}`,
      })),
      "voluntar",
    ),
  );

  // 3. Persoane de contact la ALTE firme care au sponsorizat (status „câștigat” sau sumă sponsorizată).
  const sponsori = await ctx.db
    .select({ nume: contacts.nume, email: contacts.email, telefon: contacts.telefon, companyId: contacts.companyId, firma: companies.nume })
    .from(contacts)
    .innerJoin(companies, eq(companies.id, contacts.companyId))
    .where(
      and(
        eq(contacts.orgId, ctx.orgId),
        ne(contacts.companyId, companyId),
        sql`${companies.deletedAt} is null`,
        or(eq(companies.status, "won"), gt(sql`coalesce(${companies.sumaSponsorizata}, 0)`, 0)),
      ),
    )
    .limit(LIMITA_SPONSORI);
  rezultate.push(
    ...potriveste(
      persoane,
      sponsori.map((s) => ({ e: { nume: s.nume, email: s.email, telefon: s.telefon }, detaliu: `Contact la „${s.firma || "o firmă"}” (a sponsorizat)`, companyId: s.companyId })),
      "sponsor",
    ),
  );

  return deduplicaSiOrdoneaza(rezultate);
}

export const getCaiCalde = withOrgSession(caiCaldePentru);
