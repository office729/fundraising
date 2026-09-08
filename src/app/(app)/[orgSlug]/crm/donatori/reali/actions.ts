"use server";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { donatorNotite, donatoriReali } from "@/lib/db/schema";

export type ActionState = { error: string | null };

export const adaugaNotitaDonator = withOrgSession(async (ctx, donatorId: string, text: string): Promise<ActionState> => {
  const trimmed = text.trim();
  if (!trimmed) return { error: "Notița e goală." };
  const donator = await ctx.db
    .select({ id: donatoriReali.id })
    .from(donatoriReali)
    .where(and(eq(donatoriReali.id, donatorId), eq(donatoriReali.orgId, ctx.orgId)))
    .limit(1);
  if (!donator[0]) return { error: "Donatorul nu a fost găsit." };
  await ctx.db.insert(donatorNotite).values({ id: randomUUID(), orgId: ctx.orgId, donatorId, text: trimmed, createdBy: ctx.userId });
  return { error: null };
});

export const editeazaNotitaDonator = withOrgSession(async (ctx, id: string, text: string): Promise<ActionState> => {
  const trimmed = text.trim();
  if (!trimmed) return { error: "Notița e goală." };
  const r = await ctx.db
    .update(donatorNotite)
    .set({ text: trimmed, editatLa: new Date() })
    .where(and(eq(donatorNotite.id, id), eq(donatorNotite.orgId, ctx.orgId)))
    .returning({ id: donatorNotite.id });
  if (!r[0]) return { error: "Notița nu a fost găsită." };
  return { error: null };
});

export const stergeNotitaDonator = withOrgSession(async (ctx, id: string): Promise<ActionState> => {
  await ctx.db.delete(donatorNotite).where(and(eq(donatorNotite.id, id), eq(donatorNotite.orgId, ctx.orgId)));
  return { error: null };
});
