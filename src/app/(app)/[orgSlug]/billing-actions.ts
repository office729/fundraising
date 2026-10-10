"use server";

import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";

import { inregistreazaAudit } from "@/lib/audit";
import { withOrgAdmin, type OrgContext } from "@/lib/auth/guard";
import { calculateCustomPlanPrice, normalizeCustomPlanConfig, type CustomPlanConfigSaved } from "@/lib/billing/custom-plan";
import { creeazaPlataAbonament } from "@/lib/billing/netopia-checkout";
import { etichetaPachet, pretLunarPachet, utilizatoriSuplimentariValizi, type OrgPackage } from "@/lib/billing/packages";
import { organizations, platformPayments } from "@/lib/db/schema";
import { cifFolositDeAltaOrganizatie, MESAJ_CIF_FOLOSIT } from "@/lib/cif";
import { EroareUtilizator } from "@/lib/erori";
import { cifValidFormat } from "@/lib/iban";
import { gasesteJudet } from "@/lib/judete";
import { TERMENI_VERSIUNE } from "@/lib/legal-version";

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

// Acordul pentru taxarea automată lunară (plată inițiată de comerciant): fără el nu pornește plata, iar bifa e
// înregistrată în jurnalul de audit cu versiunea Termenilor, ca dovadă a acordului scris.
async function inregistreazaAcordReinnoire(ctx: OrgContext, acord: boolean, pachet: string, pretLunar: number): Promise<void> {
  if (acord !== true) throw new EroareUtilizator("Bifează acordul pentru reînnoirea automată ca să continui la plată.");
  await inregistreazaAudit(ctx.db, {
    orgId: ctx.orgId,
    actorAppUserId: ctx.userId,
    actiune: "acord_reinnoire_automata",
    entitate: "abonament",
    detalii: { pachet, pretLunar, termeniVersiune: TERMENI_VERSIUNE },
  });
}

// Alegerea unui pachet fix — pornește o plată Netopia pentru o lună de acces;
// clientul redirecționează la URL-ul întors. Pachetul și starea organizației se
// schimbă abia când IPN-ul verificat confirmă plata (api/netopia/ipn/route.ts),
// niciodată optimist, înainte de confirmare.
export const startCheckoutAction = withOrgAdmin(
  async (ctx, pkg: Exclude<OrgPackage, "trial" | "custom">, acordReinnoire: boolean, extraUtilizatori: number = 0) => {
    // Tipurile TypeScript nu protejează o Server Action apelată direct: cu „trial" sau „custom" prețul ar fi null/0.
    if (pkg !== "start" && pkg !== "crestere" && pkg !== "impact") throw new EroareUtilizator("Pachet invalid.");
    // Utilizatorii suplimentari există doar la START; numărul și prețul se recalculează AICI, nu se iau de la client.
    const extra = utilizatoriSuplimentariValizi(pkg, extraUtilizatori);
    const pretLunar = pretLunarPachet(pkg, extra)!;
    await inregistreazaAcordReinnoire(ctx, acordReinnoire, pkg, pretLunar);
    const url = await creeazaPlataAbonament(ctx, {
      pachet: pkg,
      pretLunar,
      packageLabel: etichetaPachet(pkg, extra),
      planConfig: null,
      extraUtilizatori: extra,
      origin: await origin(),
    });
    return { url };
  },
  { permiteAccesBlocat: true },
);

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
    acordReinnoire: boolean,
  ) => {
    const config = normalizeCustomPlanConfig(rawConfig);
    const pretLunar = calculateCustomPlanPrice(config);
    const saved: CustomPlanConfigSaved = { ...config, pretLunar };
    await inregistreazaAcordReinnoire(ctx, acordReinnoire, "custom", pretLunar);

    const url = await creeazaPlataAbonament(ctx, {
      pachet: "custom",
      pretLunar,
      packageLabel: "Plan personalizat",
      planConfig: saved,
      origin: await origin(),
    });
    return { url };
  },
  { permiteAccesBlocat: true },
);

// Istoricul de plăți al organizației, cu linkul facturii Oblio (dacă a fost deja
// emisă) — afișat în Setări, sub Abonament. Doar owner/admin (withOrgAdmin).
export const listeazaFacturiAction = withOrgAdmin(async (ctx) => {
  return ctx.db
    .select({
      id: platformPayments.id,
      createdAt: platformPayments.createdAt,
      pachet: platformPayments.package,
      sumaLei: platformPayments.sumaLei,
      status: platformPayments.status,
      facturaLink: platformPayments.oblioLink,
      facturaNumar: platformPayments.oblioNumber,
    })
    .from(platformPayments)
    .where(eq(platformPayments.status, "reusita"))
    .orderBy(desc(platformPayments.createdAt))
    .limit(24);
});

// Datele de facturare cerute înainte de prima plată (vezi
// lib/billing/date-facturare.ts). Disponibile și când accesul e blocat de
// paywall — tocmai atunci se completează, iar Setările nu sunt accesibile.
export const citesteDateFacturareAction = withOrgAdmin(
  async (ctx) => ({ cif: ctx.orgCif, adresaSediu: ctx.orgAdresaSediu, judet: ctx.orgJudet }),
  { permiteAccesBlocat: true },
);

export const salveazaDateFacturareAction = withOrgAdmin(
  async (ctx, v: { cif: string; adresaSediu: string; judet: string }): Promise<{ error: string | null }> => {
    const cif = v.cif.trim();
    const adresa = v.adresaSediu.trim();
    const judet = gasesteJudet(v.judet.trim());
    if (!cif || !cifValidFormat(cif)) return { error: "CIF invalid — scrie-l cu sau fără prefixul RO (ex. RO12345678)." };
    if (adresa.length < 5 || adresa.length > 300) return { error: "Scrie adresa sediului social (strada, număr, localitate)." };
    if (!judet) return { error: "Alege județul." };
    // CIF unic între organizații (vezi lib/cif.ts) — mesaj clar, nu eroarea brută a indexului unic.
    if (await cifFolositDeAltaOrganizatie(cif, ctx.orgId)) return { error: MESAJ_CIF_FOLOSIT };
    try {
      await ctx.db.update(organizations).set({ cif, adresaSediu: adresa, judet }).where(eq(organizations.id, ctx.orgId));
    } catch (e) {
      const mesaj = String((e as { message?: string })?.message ?? "") + String((e as { cause?: { message?: string } })?.cause?.message ?? "");
      if (mesaj.includes("organizations_cif_norm_unique")) return { error: MESAJ_CIF_FOLOSIT };
      throw e;
    }
    return { error: null };
  },
  { permiteAccesBlocat: true },
);
