"use server";

import { eq } from "drizzle-orm";

import { withOrgAdmin } from "@/lib/auth/guard";
import type { OrgPackage } from "@/lib/billing/packages";
import { organizations } from "@/lib/db/schema";

// Alegerea unui pachet ÎNREGISTREAZĂ intenția (owner/admin al organizației),
// nu activează accesul — nu există încă procesare automată de plată (Stripe
// nu e conectat, vezi PACKAGE_PRICE_IDS din lib/billing/packages.ts).
// `subscriptionStatus` rămâne "incomplete" până la confirmarea manuală a
// plății (proprietarul platformei o schimbă în "active").
export const choosePackageAction = withOrgAdmin(async (ctx, pkg: OrgPackage) => {
  await ctx.db
    .update(organizations)
    .set({ package: pkg, subscriptionStatus: "incomplete" })
    .where(eq(organizations.id, ctx.orgId));
});
