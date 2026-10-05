"use server";

import { randomUUID } from "node:crypto";

import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { getLimiteleEfective, subCota } from "@/lib/billing/quota";
import { appUsers, invites, memberships } from "@/lib/db/schema";

export type MemberRow = { userId: string; email: string; name: string | null; role: string };
export type InviteRow = {
  id: string;
  email: string;
  role: string;
  token: string;
  createdAt: string;
  expiresAt: string;
};

export const listMembers = withOrgAdmin(async (ctx): Promise<MemberRow[]> => {
  const rows = await ctx.db
    .select({
      userId: appUsers.id,
      email: appUsers.email,
      name: appUsers.name,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
    .where(eq(memberships.orgId, ctx.orgId));
  return rows;
});

export const listPendingInvites = withOrgAdmin(async (ctx): Promise<InviteRow[]> => {
  const rows = await ctx.db
    .select({
      id: invites.id,
      email: invites.email,
      role: invites.role,
      token: invites.token,
      createdAt: invites.createdAt,
      expiresAt: invites.expiresAt,
      acceptedAt: invites.acceptedAt,
    })
    .from(invites)
    .where(eq(invites.orgId, ctx.orgId));
  return rows
    .filter((r) => !r.acceptedAt)
    .map(({ acceptedAt: _acceptedAt, ...r }) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
    }));
});

export type InviteState = { error: string | null; token: string | null };

export const createInvite = withOrgAdmin(
  async (ctx, email: string, role: "admin" | "member"): Promise<{ token: string }> => {
    // Cota de utilizatori (membri + invitații încă în așteptare, care ar
    // deveni membri dacă sunt acceptate) — vezi lib/billing/quota.ts.
    const limite = getLimiteleEfective(ctx.orgPackage, ctx.orgCustomPlanConfig);
    if (limite.utilizatori !== null) {
      const [{ membriCount }] = await ctx.db
        .select({ membriCount: sql<number>`count(*)`.mapWith(Number) })
        .from(memberships)
        .where(eq(memberships.orgId, ctx.orgId));
      const [{ invitatiiCount }] = await ctx.db
        .select({ invitatiiCount: sql<number>`count(*)`.mapWith(Number) })
        .from(invites)
        .where(and(eq(invites.orgId, ctx.orgId), isNull(invites.acceptedAt), gt(invites.expiresAt, new Date())));
      if (!subCota(membriCount + invitatiiCount, limite.utilizatori)) {
        throw new EroareUtilizator(
          `Ai atins limita de ${limite.utilizatori} utilizatori a pachetului tău — anulează o invitație în așteptare sau treci la un pachet mai mare.`,
        );
      }
    }

    const token = randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await ctx.db.insert(invites).values({
      orgId: ctx.orgId,
      orgName: ctx.orgName,
      email: email.toLowerCase().trim(),
      role,
      token,
      invitedBy: ctx.userId,
      expiresAt,
    });
    return { token };
  },
);

export async function createInviteAction(
  orgSlug: string,
  _prevState: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "member") === "admin" ? "admin" : "member";
  if (!email || !email.includes("@")) {
    return { error: "Email invalid.", token: null };
  }
  try {
    const { token } = await createInvite(orgSlug, email, role);
    return { error: null, token };
  } catch (e) {
    return { error: mesajSigur(e, "Invitația a eșuat.", "echipa-invitatie"), token: null };
  }
}

export type RezultatSimplu = { error: string | null };

// Scoaterea unui membru din organizație (doar rândul de membership — datele create de el
// rămân în organizație, atribuite în continuare). Reguli: owner-ul nu poate fi scos de
// nimeni; adminii pot scoate doar membri simpli; owner-ul poate scoate pe oricine altcineva;
// pe tine te scoți prin „Părăsește organizația". Politica RLS (memberships_org_delete)
// refuză oricum rândurile de owner și pe cele din alte organizații.
const scoateMembru = withOrgAdmin(async (ctx, userId: string): Promise<void> => {
  if (userId === ctx.userId) throw new EroareUtilizator("Pe tine te poți scoate doar prin „Părăsește organizația”.");
  const [tinta] = await ctx.db
    .select({ role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.orgId, ctx.orgId), eq(memberships.userId, userId)))
    .limit(1);
  if (!tinta) throw new EroareUtilizator("Membrul nu mai face parte din organizație.");
  if (tinta.role === "owner") throw new EroareUtilizator("Owner-ul organizației nu poate fi scos.");
  if (tinta.role === "admin" && ctx.role !== "owner") throw new EroareUtilizator("Doar owner-ul poate scoate un administrator.");
  const sters = await ctx.db
    .delete(memberships)
    .where(and(eq(memberships.orgId, ctx.orgId), eq(memberships.userId, userId)))
    .returning({ id: memberships.id });
  if (!sters.length) throw new EroareUtilizator("Nu s-a putut scoate membrul.");
});

export async function scoateMembruAction(orgSlug: string, userId: string): Promise<RezultatSimplu> {
  try {
    await scoateMembru(orgSlug, userId);
    revalidatePath(`/${orgSlug}/echipa`);
    return { error: null };
  } catch (e) {
    return { error: mesajSigur(e, "Nu am putut scoate membrul.", "echipa-scoate-membru") };
  }
}

// Anularea unei invitații în așteptare (eliberează și locul din cota de utilizatori).
const anuleazaInvitatie = withOrgAdmin(async (ctx, inviteId: string): Promise<void> => {
  const sters = await ctx.db
    .delete(invites)
    .where(and(eq(invites.id, inviteId), eq(invites.orgId, ctx.orgId), isNull(invites.acceptedAt)))
    .returning({ id: invites.id });
  if (!sters.length) throw new EroareUtilizator("Invitația nu mai există sau a fost deja acceptată.");
});

export async function anuleazaInvitatieAction(orgSlug: string, inviteId: string): Promise<RezultatSimplu> {
  try {
    await anuleazaInvitatie(orgSlug, inviteId);
    revalidatePath(`/${orgSlug}/echipa`);
    return { error: null };
  } catch (e) {
    return { error: mesajSigur(e, "Nu am putut anula invitația.", "echipa-anuleaza-invitatie") };
  }
}

// Părăsirea organizației de către un membru (orice rol în afară de owner — owner-ul trebuie
// să șteargă organizația, nu există încă transfer de proprietate).
const parasesteOrganizatia = withOrgSession(
  async (ctx): Promise<void> => {
    if (ctx.role === "owner") {
      throw new EroareUtilizator("Owner-ul nu poate părăsi organizația — o poate șterge din Setări.");
    }
    const sters = await ctx.db
      .delete(memberships)
      .where(and(eq(memberships.orgId, ctx.orgId), eq(memberships.userId, ctx.userId)))
      .returning({ id: memberships.id });
    if (!sters.length) throw new EroareUtilizator("Nu mai faci parte din această organizație.");
  },
  { permiteAccesBlocat: true },
);

export async function parasesteOrganizatiaAction(orgSlug: string): Promise<RezultatSimplu> {
  try {
    await parasesteOrganizatia(orgSlug);
    return { error: null };
  } catch (e) {
    return { error: mesajSigur(e, "Nu am putut părăsi organizația.", "echipa-paraseste") };
  }
}
