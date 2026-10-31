"use server";

import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";

import { inregistreazaAudit } from "@/lib/audit";
import { withOrgAdmin, type OrgContext } from "@/lib/auth/guard";
import { calculateCustomPlanPrice, normalizeCustomPlanConfig, type CustomPlanConfigSaved } from "@/lib/billing/custom-plan";
import { creeazaPlataAbonament } from "@/lib/billing/netopia-checkout";
import { schimbarePlanBlocata } from "@/lib/billing/schimbare-plan";
import { masoaraUtilizarea } from "@/lib/billing/utilizare";
import { isPlatformAdmin } from "@/lib/billing/trial";
import { etichetaPachet, facturareValida, luniAcces, pretPerioadaPachet, recomandaPachet, utilizatoriSuplimentariValizi, type Facturare, type OrgPackage, type Recomandare } from "@/lib/billing/packages";
import { organizations, platformPayments } from "@/lib/db/schema";
import { cifFolositDeAltaOrganizatie } from "@/lib/cif";
import { EroareUtilizator } from "@/lib/erori";
import { cifValidFormat } from "@/lib/iban";
import { telefonPlataValid } from "@/lib/billing/date-antifraud";
import { normalizeazaTelefon } from "@/lib/telefon";
import { gasesteJudet } from "@/lib/judete";
import { TERMENI_VERSIUNE } from "@/lib/legal-version";
import { getLocale } from "@/lib/i18n/get-locale";
import { ERORI_UI_DICT } from "@/lib/i18n/dictionaries/erori-ui";

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
async function inregistreazaAcordReinnoire(ctx: OrgContext, acord: boolean, pachet: string, pretLunar: number, facturare: Facturare = "lunar"): Promise<void> {
  if (acord !== true) throw new EroareUtilizator(ERORI_UI_DICT[await getLocale()].acordReinnoire);
  await inregistreazaAudit(ctx.db, {
    orgId: ctx.orgId,
    actorAppUserId: ctx.userId,
    actiune: "acord_reinnoire_automata",
    entitate: "abonament",
    detalii: { pachet, pretLunar, facturare, termeniVersiune: TERMENI_VERSIUNE },
  });
}

// Alegerea unui pachet fix — pornește o plată Netopia pentru o lună de acces;
// clientul redirecționează la URL-ul întors. Pachetul și starea organizației se
// schimbă abia când IPN-ul verificat confirmă plata (api/netopia/ipn/route.ts),
// niciodată optimist, înainte de confirmare.
// Recomandarea de pachet din ce a folosit organizația în probă (utilizatori, contacte, module); disponibilă și când proba s-a încheiat,
// ca ecranul de alegere a pachetului să poată explica ce se potrivește.
export const obtineRecomandareAction = withOrgAdmin(async (ctx): Promise<Recomandare> => recomandaPachet(await masoaraUtilizarea(ctx)), { permiteAccesBlocat: true });

export const startCheckoutAction = withOrgAdmin(
  async (ctx, pkg: Exclude<OrgPackage, "trial" | "custom">, acordReinnoire: boolean, extraUtilizatori: number = 0, facturareCeruta: string = "lunar") => {
    // Tipurile TypeScript nu protejează o Server Action apelată direct: cu „trial" sau „custom" prețul ar fi null/0.
    if (pkg !== "start" && pkg !== "crestere" && pkg !== "impact") throw new EroareUtilizator(ERORI_UI_DICT[await getLocale()].pachetInvalid);
    // Utilizatorii suplimentari există doar la START; numărul și prețul se recalculează AICI, nu se iau de la client.
    const extra = utilizatoriSuplimentariValizi(pkg, extraUtilizatori);
    // Fără schimbare de plan în mijlocul unei perioade plătite (vezi lib/billing/schimbare-plan.ts); administratorii platformei sunt exceptați.
    const blocat = isPlatformAdmin(ctx.userEmail)
      ? null
      : schimbarePlanBlocata(
          { package: ctx.orgPackage, extraUsers: ctx.orgExtraUsers, subscriptionStatus: ctx.orgSubscriptionStatus, currentPeriodEnd: ctx.orgCurrentPeriodEnd },
          { package: pkg, extraUsers: extra },
        );
    if (blocat) return { blocat };
    // Perioada (lună sau an) și suma se stabilesc AICI; anualul = 10 luni plătite pentru 12 de acces (2 luni gratuite).
    const facturare = facturareValida(facturareCeruta);
    const pretPerioada = pretPerioadaPachet(pkg, extra, facturare)!;
    await inregistreazaAcordReinnoire(ctx, acordReinnoire, pkg, pretPerioada, facturare);
    const url = await creeazaPlataAbonament(ctx, {
      pachet: pkg,
      pretLunar: pretPerioada,
      packageLabel: etichetaPachet(pkg, extra),
      planConfig: null,
      extraUtilizatori: extra,
      luni: luniAcces(facturare),
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
    const blocat = isPlatformAdmin(ctx.userEmail)
      ? null
      : schimbarePlanBlocata(
          { package: ctx.orgPackage, extraUsers: ctx.orgExtraUsers, subscriptionStatus: ctx.orgSubscriptionStatus, currentPeriodEnd: ctx.orgCurrentPeriodEnd },
          { package: "custom", extraUsers: 0 },
        );
    if (blocat) return { blocat };
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
  async (ctx) => {
    const [org] = await ctx.db.select({ telefon: organizations.telefon }).from(organizations).where(eq(organizations.id, ctx.orgId)).limit(1);
    return { cif: ctx.orgCif, adresaSediu: ctx.orgAdresaSediu, judet: ctx.orgJudet, telefon: org?.telefon ?? null };
  },
  { permiteAccesBlocat: true },
);

export const salveazaDateFacturareAction = withOrgAdmin(
  async (ctx, v: { cif: string; adresaSediu: string; judet: string; telefon?: string }): Promise<{ error: string | null }> => {
    const msg = ERORI_UI_DICT[await getLocale()];
    const cif = v.cif.trim();
    const adresa = v.adresaSediu.trim();
    const judet = gasesteJudet(v.judet.trim());
    if (!cif || !cifValidFormat(cif)) return { error: msg.cifInvalid };
    if (adresa.length < 5 || adresa.length > 300) return { error: msg.adresaSediu };
    if (!judet) return { error: msg.alegeJudet };
    // Telefonul plătitorului (cerut de procesatorul de plăți): dacă a fost scris, se validează și se salvează; dacă organizația nu are deja unul valid, e obligatoriu.
    let telefon: string | null = null;
    if (v.telefon !== undefined && v.telefon.trim() !== "") {
      telefon = normalizeazaTelefon(v.telefon);
      if (!telefon || !telefonPlataValid(telefon)) return { error: msg.telefonInvalid };
    } else {
      const [org] = await ctx.db.select({ telefon: organizations.telefon }).from(organizations).where(eq(organizations.id, ctx.orgId)).limit(1);
      if (!telefonPlataValid(org?.telefon)) return { error: msg.telefonObligatoriu };
    }
    // CIF unic între organizații (vezi lib/cif.ts) — mesaj clar, nu eroarea brută a indexului unic.
    if (await cifFolositDeAltaOrganizatie(cif, ctx.orgId)) return { error: msg.cifFolosit };
    try {
      await ctx.db.update(organizations).set({ cif, adresaSediu: adresa, judet, ...(telefon ? { telefon } : {}) }).where(eq(organizations.id, ctx.orgId));
    } catch (e) {
      const mesaj = String((e as { message?: string })?.message ?? "") + String((e as { cause?: { message?: string } })?.cause?.message ?? "");
      if (mesaj.includes("organizations_cif_norm_unique")) return { error: msg.cifFolosit };
      throw e;
    }
    return { error: null };
  },
  { permiteAccesBlocat: true },
);
