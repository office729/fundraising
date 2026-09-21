import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { platformPayments } from "@/lib/db/schema";
import { netopiaConfigurata, pornestePlata } from "@/lib/netopia";

import { REFERRAL_DISCOUNT_PERCENT } from "../referral";
import type { CustomPlanConfigSaved } from "./custom-plan";
import type { OrgPackage } from "./packages";

// Pornește plata (o lună de acces) prin Netopia și întoarce URL-ul paginii lor
// de plată. NU modifică pachetul sau starea organizației — accesul se acordă
// doar când IPN-ul verificat al Netopia confirmă plata (vezi
// app/api/netopia/ipn/route.ts). Astfel, un client care are deja acces plătit
// și abandonează o plată nouă nu-și pierde accesul, iar niciun acces nu se
// acordă din redirectul clientului.
export async function creeazaPlataAbonament(
  ctx: OrgContext,
  params: {
    pachet: Exclude<OrgPackage, "trial">;
    pretLunar: number;
    packageLabel: string;
    planConfig: CustomPlanConfigSaved | null;
    origin: string;
  },
): Promise<string> {
  if (!netopiaConfigurata()) throw new Error("netopia_neconfigurat");

  // Reducerea de recomandare se aplică DOAR la prima plată reușită a
  // organizației, o singură dată — recalculată aici, server-side, niciodată
  // acceptată de la client.
  const [{ platite }] = await ctx.db
    .select({ platite: sql<number>`count(*)`.mapWith(Number) })
    .from(platformPayments)
    .where(and(eq(platformPayments.orgId, ctx.orgId), eq(platformPayments.status, "reusita")));
  const areDreptulLaReducere = Boolean(ctx.orgReferredByOrgId) && platite === 0;
  const sumaLei = areDreptulLaReducere
    ? Math.round((params.pretLunar * (100 - REFERRAL_DISCOUNT_PERCENT)) / 100)
    : params.pretLunar;

  const orderId = `fa_${randomUUID().replace(/-/g, "")}`;
  await ctx.db.insert(platformPayments).values({
    orgId: ctx.orgId,
    orderId,
    package: params.pachet,
    sumaLei,
    luni: 1,
    planConfig: params.planConfig,
  });

  const [prenume, ...restNume] = (ctx.userName ?? "").trim().split(/\s+/).filter(Boolean);

  // Dacă Netopia refuză pornirea, eroarea se propagă și tranzacția organizației
  // se anulează (inclusiv rândul de mai sus) — nu rămâne nicio comandă-fantomă.
  // ID-ul Netopia (ntpID) ajunge în rând din IPN; membrii nu au drept de UPDATE
  // pe platform_payments, doar INSERT/SELECT — statusul îl fixează exclusiv IPN-ul.
  const { paymentUrl } = await pornestePlata({
    orderId,
    sumaLei,
    descriere: `Alexandrit — ${params.packageLabel} (o lună)`,
    facturare: {
      email: ctx.userEmail,
      prenume: prenume ?? "Client",
      nume: restNume.join(" ") || ctx.orgName.slice(0, 60),
      // Nu colectăm încă un telefon al plătitorului; Netopia îl cere obligatoriu.
      telefon: "0700000000",
    },
    notifyUrl: `${params.origin}/api/netopia/ipn`,
    redirectUrl: `${params.origin}/abonament/${ctx.orgSlug}/rezultat?comanda=${orderId}`,
    cancelUrl: `${params.origin}/${ctx.orgSlug}/setari`,
  });
  return paymentUrl;
}
