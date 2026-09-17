import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { withOrgSession } from "@/lib/auth/guard";
import { crmKv } from "@/lib/db/schema";

// Jurnal de activitate pentru CRM Voluntari (apeluri/email-uri înregistrate) —
// separat de crm-kv/[path] generic pentru că are nevoie de append (nu overwrite
// simplu) și de o regulă de vizibilitate pe rol (doar owner/admin văd jurnalul
// echipei, la fel ca "isAdmin" din tool-ul original). Stocat tot în crm_kv,
// sub o cheie proprie ("voluntari-activity"), ca să nu mai adăugăm un tabel
// doar pentru un array de evenimente.
const PATH = "voluntari-activity";
const MAX_EVENTS = 1000;

type ActivityEvent = {
  type: string;
  contacte: unknown[];
  by: string;
  at: string;
};

type Ctx = { params: Promise<{ orgSlug: string }> };

const getActivity = withOrgSession(async (ctx) => {
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json({ forbidden: true, events: [] });
  }
  const rows = await ctx.db
    .select({ data: crmKv.data })
    .from(crmKv)
    .where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, PATH)))
    .limit(1);
  const events = (rows[0]?.data as { events?: unknown[] } | undefined)?.events ?? [];
  return NextResponse.json({ events });
});

const postActivity = withOrgSession(async (ctx, req: Request) => {
  let body: { type?: unknown; contacte?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const type = typeof body.type === "string" ? body.type : "necunoscut";
  const contacte = Array.isArray(body.contacte) ? body.contacte : [];

  const rows = await ctx.db
    .select({ data: crmKv.data })
    .from(crmKv)
    .where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, PATH)))
    .limit(1);
  const existing = ((rows[0]?.data as { events?: ActivityEvent[] } | undefined)?.events ?? []) as ActivityEvent[];

  const event: ActivityEvent = { type, contacte, by: ctx.userName || ctx.userEmail, at: new Date().toISOString() };
  const events = [...existing, event].slice(-MAX_EVENTS);

  await ctx.db
    .insert(crmKv)
    .values({ orgId: ctx.orgId, path: PATH, data: { events }, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [crmKv.orgId, crmKv.path],
      set: { data: { events }, updatedAt: new Date() },
    });
  return NextResponse.json({ ok: true });
});

export async function GET(_req: Request, { params }: Ctx) {
  const { orgSlug } = await params;
  return getActivity(orgSlug);
}

export async function POST(req: Request, { params }: Ctx) {
  const { orgSlug } = await params;
  return postActivity(orgSlug, req);
}
