import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { withOrgSession } from "@/lib/auth/guard";
import { crmKv } from "@/lib/db/schema";

// KV pentru starea ne-relațională a CRM PJ (sarcini + config), per organizație.
// Doar chei pe listă albă, ca să nu devină un depozit generic.
const ALLOWED_GET = new Set(["tasks", "config"]);
const ALLOWED_PUT = new Set(["tasks", "config"]);

type Ctx = { params: Promise<{ orgSlug: string; path: string }> };

const getKv = withOrgSession(async (ctx, path: string) => {
  if (!ALLOWED_GET.has(path)) return NextResponse.json({ error: "bad_path" }, { status: 400 });
  const rows = await ctx.db
    .select({ data: crmKv.data })
    .from(crmKv)
    .where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, path)))
    .limit(1);
  return NextResponse.json(rows[0]?.data ?? (path === "tasks" ? [] : {}));
});

const putKv = withOrgSession(async (ctx, path: string, req: Request) => {
  if (!ALLOWED_PUT.has(path)) return NextResponse.json({ error: "bad_path" }, { status: 400 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  await ctx.db
    .insert(crmKv)
    .values({ orgId: ctx.orgId, path, data: body as object, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [crmKv.orgId, crmKv.path],
      set: { data: body as object, updatedAt: new Date() },
    });
  return NextResponse.json(body);
});

export async function GET(_req: Request, { params }: Ctx) {
  const { orgSlug, path } = await params;
  return getKv(orgSlug, path);
}

export async function PUT(req: Request, { params }: Ctx) {
  const { orgSlug, path } = await params;
  return putKv(orgSlug, path, req);
}
