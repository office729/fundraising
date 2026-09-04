import { and, eq, inArray, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { withOrgSession } from "@/lib/auth/guard";
import { companies, contacts } from "@/lib/db/schema";
import { normName, rowToCompany, STAGES } from "@/lib/crm/mapping";
import { orgOwnerMaps } from "@/lib/crm/org-owners";

const STATUSES = ["open", "won", "lost", "parked"];

type Ctx = { params: Promise<{ orgSlug: string }> };

// GET /api/[orgSlug]/crm-companies?judet=&q=&worked=1&stage=&status=&mine=&limit=400&cursor=
// Portat din SOI_CRM (src/app/api/crm-companies/route.ts) + filtrare pe org_id.
const listCompanies = withOrgSession(async (ctx, req: Request) => {
  const url = new URL(req.url);
  const p = url.searchParams;
  const judet = p.get("judet") || "";
  const q = (p.get("q") || "").trim();
  const worked = p.get("worked") === "1";
  const stage = p.get("stage") || "";
  const status = p.get("status") || "";
  const mine = p.get("mine") || "";
  const limit = Math.min(1000, Math.max(1, parseInt(p.get("limit") || "400", 10)));
  const cursorRaw = p.get("cursor") || "";

  const { byId, byFirst } = await orgOwnerMaps(ctx);

  const conds = [eq(companies.orgId, ctx.orgId), isNull(companies.deletedAt)];
  if (judet) conds.push(eq(companies.judet, judet));
  if (stage && (STAGES as readonly string[]).includes(stage))
    conds.push(eq(companies.stage, stage as (typeof STAGES)[number]));
  if (status && STATUSES.includes(status))
    conds.push(eq(companies.status, status as "open" | "won" | "lost" | "parked"));
  if (mine) {
    const oid = byFirst[normName(mine)];
    if (oid) conds.push(eq(companies.ownerId, oid));
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

  const workedExpr = sql`(${companies.ownerId} is not null or ${companies.stage} <> 'nou' or ${companies.status} <> 'open' or jsonb_exists(${companies.extra}, 'nextMove') or jsonb_exists(${companies.extra}, 'etape'))`;
  const rankExpr = sql`(case when ${workedExpr} then 1 else 0 end)`;
  const sponsExpr = sql`coalesce(${companies.sumaSponsorizata}, -1)`;
  const dispExpr = sql`coalesce(${companies.sumaDisponibila}, -1)`;

  let rows;
  if (q) {
    const dig = q.replace(/\D/g, "");
    if (/^\d{4,}$/.test(q)) {
      conds.push(sql`replace(upper(coalesce(${companies.cui},'')),'RO','') = ${dig}`);
    } else {
      conds.push(
        sql`translate(lower(${companies.nume}), 'ăâîșțşţ', 'aaistst') like translate(lower(${"%" + q + "%"}), 'ăâîșțşţ', 'aaistst')`,
      );
    }
    rows = await ctx.db
      .select()
      .from(companies)
      .where(and(...conds))
      .orderBy(sql`${companies.nume} asc`)
      .limit(Math.min(limit, 200));
  } else {
    if (cursorRaw) {
      try {
        const cur = JSON.parse(Buffer.from(cursorRaw, "base64").toString("utf8"));
        const idOk = typeof cur.id === "string" && /^[0-9a-f-]{36}$/i.test(cur.id);
        if (idOk && typeof cur.r === "number" && typeof cur.sp === "number" && typeof cur.d === "number") {
          conds.push(
            sql`(${rankExpr}, ${sponsExpr}, ${dispExpr}, ${companies.id}) < (${cur.r}::int, ${cur.sp}::bigint, ${cur.d}::bigint, ${cur.id}::uuid)`,
          );
        }
      } catch {
        // cursor invalid → ignoră (prima pagină)
      }
    }
    rows = await ctx.db
      .select()
      .from(companies)
      .where(and(...conds))
      .orderBy(sql`${rankExpr} desc, ${sponsExpr} desc, ${dispExpr} desc, ${companies.id} desc`)
      .limit(limit);
  }

  const ids = rows.map((r) => r.id);
  const cts = ids.length ? await ctx.db.select().from(contacts).where(inArray(contacts.companyId, ids)) : [];
  const byCo: Record<string, (typeof cts)[number][]> = {};
  for (const ct of cts) (byCo[ct.companyId] = byCo[ct.companyId] || []).push(ct);

  const items = rows.map((r) => rowToCompany(r, byCo[r.id] || [], (r.ownerId && byId[r.ownerId]) || "", byId));

  let nextCursor: string | null = null;
  if (!q && rows.length === limit) {
    const last = rows[rows.length - 1];
    const wasWorked =
      !!last.ownerId ||
      last.stage !== "nou" ||
      last.status !== "open" ||
      (last.extra != null &&
        typeof last.extra === "object" &&
        ("nextMove" in last.extra || "etape" in last.extra));
    nextCursor = Buffer.from(
      JSON.stringify({
        r: wasWorked ? 1 : 0,
        sp: last.sumaSponsorizata == null ? -1 : Number(last.sumaSponsorizata),
        d: last.sumaDisponibila == null ? -1 : Number(last.sumaDisponibila),
        id: last.id,
      }),
    ).toString("base64");
  }
  return NextResponse.json({ items, nextCursor, total: null });
});

export async function GET(req: Request, { params }: Ctx) {
  const { orgSlug } = await params;
  return listCompanies(orgSlug, req);
}
