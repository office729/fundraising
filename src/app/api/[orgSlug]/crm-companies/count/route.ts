import { and, eq, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { withOrgSession } from "@/lib/auth/guard";
import { companies } from "@/lib/db/schema";
import { normName } from "@/lib/crm/mapping";
import { orgOwnerMaps } from "@/lib/crm/org-owners";

type Ctx = { params: Promise<{ orgSlug: string }> };

// GET /api/[orgSlug]/crm-companies/count?judet=&responsabil=&worked=1
// Fără filtre → count exact tot pe org (dataset-ul e per-organizație, nu mai
// justifică estimarea via pg_class.reltuples ca în SOI_CRM, unde tabela avea
// ~150k rânduri globale).
const countCompanies = withOrgSession(async (ctx, req: Request) => {
  const p = new URL(req.url).searchParams;
  const judet = p.get("judet") || "";
  const responsabil = p.get("responsabil") || "";
  const worked = p.get("worked") === "1";

  const conds = [eq(companies.orgId, ctx.orgId), isNull(companies.deletedAt)];
  if (judet) conds.push(eq(companies.judet, judet));
  if (responsabil) {
    const { byFirst } = await orgOwnerMaps(ctx);
    const oid = byFirst[normName(responsabil)];
    conds.push(oid ? eq(companies.ownerId, oid) : sql`false`);
  }
  if (worked) {
    conds.push(
      or(
        isNotNull(companies.ownerId),
        ne(companies.stage, "nou"),
        ne(companies.status, "open"),
        sql`jsonb_exists(${companies.extra}, 'nextMove')`,
        sql`jsonb_exists(${companies.extra}, 'etape')`,
      )!,
    );
  }
  const r = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(companies)
    .where(and(...conds));
  return NextResponse.json({ count: r[0]?.n || 0, estimat: false });
});

export async function GET(req: Request, { params }: Ctx) {
  const { orgSlug } = await params;
  return countCompanies(orgSlug, req);
}
