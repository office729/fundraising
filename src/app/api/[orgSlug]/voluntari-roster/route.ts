import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { withOrgSession } from "@/lib/auth/guard";
import { crmKv } from "@/lib/db/schema";
import { origineValida } from "@/lib/verifica-origine";
import { imbinaRoster, type Modificari } from "@/lib/voluntari-roster-merge";

// Salvarea listei de voluntari fără suprascriere: clientul trimite doar modificările (voluntari schimbați, șterși, setări), iar serverul
// îmbină sub un lock pe organizație și întoarce lista îmbinată. Două colege care lucrează simultan nu-și mai șterg una alteia munca.
const PATH = "voluntari-roster";
const MAX_BYTES = 3 * 1024 * 1024;

type Ctx = { params: Promise<{ orgSlug: string }> };

const imbina = withOrgSession(async (ctx, m: Modificari) => {
  // Lock de tranzacție pe (organizație, listă): funcționează și când rândul nu există încă (prima salvare).
  await ctx.db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${ctx.orgId}:${PATH}`}, 0))`);
  const [rand] = await ctx.db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, PATH))).limit(1);
  const { roster, modificati, stersi } = imbinaRoster(rand?.data, { ...m, updatedBy: m.updatedBy ?? ctx.userName ?? ctx.userEmail });
  await ctx.db
    .insert(crmKv)
    .values({ orgId: ctx.orgId, path: PATH, data: roster, updatedAt: new Date() })
    .onConflictDoUpdate({ target: [crmKv.orgId, crmKv.path], set: { data: roster, updatedAt: new Date() } });
  return NextResponse.json({ ok: true, modificati, stersi, volunteers: roster.volunteers, settings: roster.settings ?? null, updatedAt: roster.updatedAt });
});

export async function POST(req: Request, { params }: Ctx) {
  if (!origineValida(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });
  let body: Modificari;
  try {
    const text = await req.text();
    if (text.length > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });
    body = JSON.parse(text) as Modificari;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { orgSlug } = await params;
  return imbina(orgSlug, body);
}
