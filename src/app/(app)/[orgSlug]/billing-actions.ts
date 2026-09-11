"use server";

import { eq } from "drizzle-orm";

import { withOrgAdmin } from "@/lib/auth/guard";
import { calculateCustomPlanPrice, normalizeCustomPlanConfig, type CustomPlanConfigSaved } from "@/lib/billing/custom-plan";
import type { OrgPackage } from "@/lib/billing/packages";
import { organizations } from "@/lib/db/schema";

// Alegerea unui pachet ÎNREGISTREAZĂ intenția (owner/admin al organizației),
// nu activează accesul — nu există încă procesare automată de plată (Stripe
// nu e conectat, vezi PACKAGE_PRICE_IDS din lib/billing/packages.ts).
// `subscriptionStatus` rămâne "incomplete" până la confirmarea manuală a
// plății (proprietarul platformei o schimbă în "active").
export const choosePackageAction = withOrgAdmin(async (ctx, pkg: Exclude<OrgPackage, "custom">) => {
  await ctx.db
    .update(organizations)
    .set({ package: pkg, subscriptionStatus: "incomplete", customPlanConfig: null })
    .where(eq(organizations.id, ctx.orgId));
});

// Ca și choosePackageAction — doar înregistrează intenția. Prețul e
// recalculat AICI, server-side, din configurația primită — nu se are
// încredere niciodată în `pretLunar` calculat pe client (poate fi manipulat
// din devtools înainte de trimitere).
export const chooseCustomPlanAction = withOrgAdmin(
  async (
    ctx,
    rawConfig: { utilizatori: number; contactePf: number; companiiPj: number; generariLunare: number; tools: string[] },
  ) => {
    const config = normalizeCustomPlanConfig(rawConfig);
    const pretLunar = calculateCustomPlanPrice(config);
    const saved: CustomPlanConfigSaved = { ...config, pretLunar };

    await ctx.db
      .update(organizations)
      .set({ package: "custom", subscriptionStatus: "incomplete", customPlanConfig: saved })
      .where(eq(organizations.id, ctx.orgId));

    return saved;
  },
);
