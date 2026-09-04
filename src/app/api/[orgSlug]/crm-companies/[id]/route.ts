import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import type { OrgContext } from "@/lib/auth/guard";
import { withOrgSession } from "@/lib/auth/guard";
import { appUsers, companies, contacts } from "@/lib/db/schema";
import { companyToRow, CONSENT_TOOL2DB, CONTACT_COLS, rowToCompany } from "@/lib/crm/mapping";
import { orgOwnerMaps } from "@/lib/crm/org-owners";

type Ctx = { params: Promise<{ orgSlug: string; id: string }> };

async function loadOne(ctx: OrgContext, id: string) {
  const rows = await ctx.db
    .select()
    .from(companies)
    .where(and(eq(companies.id, id), eq(companies.orgId, ctx.orgId), isNull(companies.deletedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const cts = await ctx.db.select().from(contacts).where(eq(contacts.companyId, id));
  const { byId } = await orgOwnerMaps(ctx);
  return rowToCompany(row, cts, (row.ownerId && byId[row.ownerId]) || "", byId);
}

const getCompany = withOrgSession(async (ctx, id: string) => {
  const c = await loadOne(ctx, id);
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(c);
});

const patchCompany = withOrgSession(async (ctx, id: string, req: Request) => {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { byFirst } = await orgOwnerMaps(ctx);
  const { cols, extra, contacte } = companyToRow(body, byFirst);

  const set: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(cols)) if (v !== undefined) set[k] = v;
  set.updatedAt = new Date();
  set.updatedBy = ctx.userId;
  set.extra = sql`coalesce(${companies.extra}, '{}'::jsonb) || ${JSON.stringify(extra)}::jsonb`;

  // UPSERT: tool-ul „Adaugă firmă" generează un id NOU (uuid) și trimite direct
  // un PATCH pe el — nu există o rută POST separată de creare. Dacă id-ul nu
  // există încă (firmă nouă), îl creăm; dacă există, îl actualizăm ca înainte.
  const existing = await ctx.db
    .select({ id: companies.id })
    .from(companies)
    .where(and(eq(companies.id, id), eq(companies.orgId, ctx.orgId)))
    .limit(1);

  if (existing[0]) {
    const upd = await ctx.db
      .update(companies)
      .set(set)
      .where(and(eq(companies.id, id), eq(companies.orgId, ctx.orgId), isNull(companies.deletedAt)))
      .returning({ id: companies.id });
    if (!upd[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });
  } else {
    await ctx.db.insert(companies).values({
      id,
      orgId: ctx.orgId,
      nume: (set.nume as string) || "—",
      ...set,
    } as typeof companies.$inferInsert);
  }

  // ---- contacte: upsert pe _cid, insert cele noi, delete cele lipsă ----
  if (Array.isArray(contacte)) {
    const existing = await ctx.db.select({ id: contacts.id }).from(contacts).where(eq(contacts.companyId, id));
    const existingIds = new Set(existing.map((e) => e.id));
    const keepIds = new Set<string>();

    for (const raw of contacte) {
      const ct = raw as Record<string, unknown>;
      const cid = ct._cid as string | undefined;
      const vals: Record<string, unknown> = {};
      for (const col of CONTACT_COLS) if (col in ct) vals[col] = ct[col] ?? null;
      if (!vals.nume) vals.nume = (ct.nume as string) || "—";
      if ("consimtamant" in ct) {
        const cs = CONSENT_TOOL2DB[String(ct.consimtamant)] || "necunoscut";
        vals.consentStatus = cs;
        if (cs === "da") {
          vals.consentAt = new Date();
          vals.consentBy = ctx.userId;
          vals.consentSource = (ct.consentSource as string) || "CRM";
        }
      }
      if (cid && existingIds.has(cid)) {
        keepIds.add(cid);
        await ctx.db.update(contacts).set(vals).where(eq(contacts.id, cid));
      } else {
        await ctx.db
          .insert(contacts)
          .values({ orgId: ctx.orgId, companyId: id, createdBy: ctx.userId, ...vals } as typeof contacts.$inferInsert);
      }
    }
    if (contacte.length > 0) {
      const toDelete = [...existingIds].filter((eid) => !keepIds.has(eid));
      if (toDelete.length) await ctx.db.delete(contacts).where(inArray(contacts.id, toDelete));
    }
  }

  const c = await loadOne(ctx, id);
  return NextResponse.json(c);
});

// Ștergere firmă: SOFT-delete (marcăm deletedAt — recuperabil), nu ștergere definitivă.
const deleteCompany = withOrgSession(async (ctx, id: string) => {
  const me = await ctx.db.select({ email: appUsers.email }).from(appUsers).where(eq(appUsers.id, ctx.userId)).limit(1);
  const audit = JSON.stringify({ deletedBy: me[0]?.email || ctx.userId, deletedAt: new Date().toISOString() });
  await ctx.db
    .update(companies)
    .set({
      deletedAt: new Date(),
      extra: sql`coalesce(${companies.extra}, '{}'::jsonb) || ${audit}::jsonb`,
    })
    .where(and(eq(companies.id, id), eq(companies.orgId, ctx.orgId)));
  return NextResponse.json({ ok: true });
});

export async function GET(_req: Request, { params }: Ctx) {
  const { orgSlug, id } = await params;
  return getCompany(orgSlug, id);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { orgSlug, id } = await params;
  return patchCompany(orgSlug, id, req);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { orgSlug, id } = await params;
  return deleteCompany(orgSlug, id);
}
