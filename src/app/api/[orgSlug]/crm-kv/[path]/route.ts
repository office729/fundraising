import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { withOrgSession } from "@/lib/auth/guard";
import { crmKv } from "@/lib/db/schema";

// KV pentru starea ne-relațională a tool-urilor portate (CRM PJ, Prospectare,
// CRM Voluntari, Program de lucru), per organizație. Doar chei pe listă albă,
// ca să nu devină un depozit generic — GET/PUT identice, deci un singur set.
const ALLOWED_KEYS = new Set([
  // CRM PJ / Prospectare. "email_opens" lipsea deși ambele îl cer la fiecare
  // încărcare — răspundea mereu 400 (vezi *.base.html, loadOpens()).
  "tasks",
  "config",
  "email_opens",
  // CRM Voluntari (roster/sarcini/cazuri) — înainte loveau ruta inexistentă
  // /api/voluntari-sync.
  "voluntari-roster",
  "voluntari-tasks",
  "voluntari-cazuri",
  // Program de lucru — înainte lovea ruta inexistentă /api/program-sync;
  // numele "soi-plan2-*" sunt cele originale din program-lucru.base.html
  // (nu le-am mai redenumit, ca să nu umblu la fiecare apel din tool).
  "soi-plan2-tombs",
  "soi-plan2-cazuri",
  "soi-plan2-bife",
  "soi-plan2-praguri",
  "soi-plan2-overrides",
  "soi-plan2-absenti",
  "soi-plan2-rutina-custom",
  "soi-plan2-rutina-off",
  "soi-plan2-rutina-ovr",
  "soi-plan2-extra",
  "soi-plan2-puls",
  "soi-plan2-test",
  "soi-plan2-suma-auto",
]);
const ALLOWED_GET = ALLOWED_KEYS;
const ALLOWED_PUT = ALLOWED_KEYS;

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
