"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { withOrgAdmin } from "@/lib/auth/guard";
import { calculateCustomPlanPrice, normalizeCustomPlanConfig, type CustomPlanConfigSaved } from "@/lib/billing/custom-plan";
import { PACKAGE_LIMITS, type OrgPackage } from "@/lib/billing/packages";
import { creeazaSesiuneAbonament } from "@/lib/billing/stripe-checkout";
import { organizations } from "@/lib/db/schema";

const NUME_PACHET: Record<Exclude<OrgPackage, "trial" | "custom">, string> = {
  start: "Pachet START",
  crestere: "Pachet CREȘTERE",
  impact: "Pachet IMPACT",
};

async function origin(): Promise<string> {
  const hdrs = await headers();
  return hdrs.get("origin") ?? `${hdrs.get("x-forwarded-proto") ?? "https"}://${hdrs.get("host")}`;
}

// Alegerea unui pachet fix — înregistrează intenția (ca înainte) ȘI creează
// imediat o sesiune Stripe Checkout reală pentru abonament; clientul
// redirecționează la URL-ul întors. `subscriptionStatus` rămâne "incomplete"
// până la confirmarea plății prin webhook (api/stripe/webhook/route.ts).
export const startCheckoutAction = withOrgAdmin(async (ctx, pkg: Exclude<OrgPackage, "trial" | "custom">) => {
  await ctx.db.update(organizations).set({ package: pkg, subscriptionStatus: "incomplete", customPlanConfig: null }).where(eq(organizations.id, ctx.orgId));

  const url = await creeazaSesiuneAbonament(ctx, {
    pretLunar: PACKAGE_LIMITS[pkg].pretLunar!,
    packageLabel: NUME_PACHET[pkg],
    origin: await origin(),
  });
  return { url };
});

// Ca și startCheckoutAction — doar că prețul e recalculat AICI, server-side,
// din configurația primită (nu se are încredere niciodată în `pretLunar`
// calculat pe client, poate fi manipulat din devtools înainte de trimitere).
export const startCustomCheckoutAction = withOrgAdmin(
  async (
    ctx,
    rawConfig: {
      utilizatori: number;
      contactePf: number;
      companiiPj: number;
      generariLunare: number;
      tools: string[];
      accesDesignToate?: boolean;
    },
  ) => {
    const config = normalizeCustomPlanConfig(rawConfig);
    const pretLunar = calculateCustomPlanPrice(config);
    const saved: CustomPlanConfigSaved = { ...config, pretLunar };

    await ctx.db.update(organizations).set({ package: "custom", subscriptionStatus: "incomplete", customPlanConfig: saved }).where(eq(organizations.id, ctx.orgId));

    const url = await creeazaSesiuneAbonament(ctx, {
      pretLunar,
      packageLabel: "Plan personalizat",
      origin: await origin(),
    });
    return { url };
  },
);
