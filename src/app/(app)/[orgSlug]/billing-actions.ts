"use server";

import { headers } from "next/headers";

import { withOrgAdmin } from "@/lib/auth/guard";
import { calculateCustomPlanPrice, normalizeCustomPlanConfig, type CustomPlanConfigSaved } from "@/lib/billing/custom-plan";
import { creeazaPlataAbonament } from "@/lib/billing/netopia-checkout";
import { PACKAGE_LIMITS, type OrgPackage } from "@/lib/billing/packages";

const NUME_PACHET: Record<Exclude<OrgPackage, "trial" | "custom">, string> = {
  start: "Pachet START",
  crestere: "Pachet CREȘTERE",
  impact: "Pachet IMPACT",
};

// Adresa platformei, pentru notifyUrl/redirectUrl/cancelUrl trimise la Netopia.
// Sursa e NEXT_PUBLIC_SITE_URL (fixă, din mediu), NU headerele cererii
// (Origin/Host) — acelea pot fi influențate de client, iar un notifyUrl/
// redirectUrl construit din ele ar putea trimite IPN-ul sau redirectul
// post-plată în afara platformei. Fallback pe headere doar dacă variabila nu
// e setată (mediu local de dezvoltare).
async function origin(): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) return siteUrl.replace(/\/$/, "");
  const hdrs = await headers();
  return hdrs.get("origin") ?? `${hdrs.get("x-forwarded-proto") ?? "https"}://${hdrs.get("host")}`;
}

// Alegerea unui pachet fix — pornește o plată Netopia pentru o lună de acces;
// clientul redirecționează la URL-ul întors. Pachetul și starea organizației se
// schimbă abia când IPN-ul verificat confirmă plata (api/netopia/ipn/route.ts),
// niciodată optimist, înainte de confirmare.
export const startCheckoutAction = withOrgAdmin(async (ctx, pkg: Exclude<OrgPackage, "trial" | "custom">) => {
  const url = await creeazaPlataAbonament(ctx, {
    pachet: pkg,
    pretLunar: PACKAGE_LIMITS[pkg].pretLunar!,
    packageLabel: NUME_PACHET[pkg],
    planConfig: null,
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

    const url = await creeazaPlataAbonament(ctx, {
      pachet: "custom",
      pretLunar,
      packageLabel: "Plan personalizat",
      planConfig: saved,
      origin: await origin(),
    });
    return { url };
  },
);
