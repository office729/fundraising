import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { db, type Tx } from "@/lib/db";
import { platformPayments } from "@/lib/db/schema";
import { netopiaConfigurata, pornestePlata, taxeazaCuTokenSalvat, type DateFacturare } from "@/lib/netopia";
import { decripteaza } from "@/lib/secret-box";

import { REFERRAL_DISCOUNT_PERCENT } from "../referral";
import type { CustomPlanConfigSaved } from "./custom-plan";
import { proceseazaRezultatPlataNetopia, type ConfirmareNetopia } from "./netopia-confirm";
import type { OrgPackage } from "./packages";

type ParametriComanda = {
  orgId: string;
  orgReferredByOrgId: string | null;
  pachet: Exclude<OrgPackage, "trial">;
  pretLunar: number;
  planConfig: CustomPlanConfigSaved | null;
  renewal: boolean;
};

// Inserează rândul platform_payments — comun fluxului interactiv (card nou, pe
// pagina găzduită) și celui automat (reînnoire cu cardul salvat, vezi
// api/cron/netopia-reinnoire). NU modifică pachetul sau starea organizației —
// accesul se acordă doar la confirmare (proceseazaRezultatPlataNetopia).
//
// Reducerea de recomandare se aplică DOAR la prima plată reușită a
// organizației, o singură dată — recalculată aici, server-side. Lock
// consultativ pe organizație, ținut până la sfârșitul TRANZACȚIEI primite ca
// parametru: altfel două comenzi concurente (dublu-click, sau un click manual
// chiar când rulează cronul de reînnoire) ar putea reclama amândouă reducerea.
// O reînnoire automată nu o revendică niciodată în practică — la momentul ei
// organizația are deja cel puțin o plată reușită (prima), deci `platite > 0`.
async function insereazaComandaAbonament(tx: Tx, p: ParametriComanda): Promise<{ orderId: string; sumaLei: number }> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`plata_abonament:${p.orgId}`}))`);

  const [{ platite, inCurs }] = await tx
    .select({
      platite: sql<number>`count(*) filter (where ${platformPayments.status} = 'reusita')`.mapWith(Number),
      inCurs: sql<number>`count(*) filter (where ${platformPayments.status} = 'in_asteptare' and ${platformPayments.createdAt} > now() - interval '30 minutes')`.mapWith(Number),
    })
    .from(platformPayments)
    .where(eq(platformPayments.orgId, p.orgId));
  const areDreptulLaReducere = Boolean(p.orgReferredByOrgId) && platite === 0 && inCurs === 0;
  const sumaLei = areDreptulLaReducere ? Math.round((p.pretLunar * (100 - REFERRAL_DISCOUNT_PERCENT)) / 100) : p.pretLunar;

  const orderId = `fa_${randomUUID().replace(/-/g, "")}`;
  await tx.insert(platformPayments).values({ orgId: p.orgId, orderId, package: p.pachet, sumaLei, luni: 1, planConfig: p.planConfig, renewal: p.renewal });
  return { orderId, sumaLei };
}

// Salvează ntpID-ul întors de Netopia la pornirea plății — necesar pentru
// interogheazaStatus() (fallback dacă IPN-ul întârzie/nu ajunge, vezi
// rezultat/data.ts). Rulează cu context de încredere (app.public_lookup), NU
// prin ctx.db al membrului: membrii au drept doar de INSERT/SELECT pe
// platform_payments, niciodată UPDATE — statusul plății rămâne exclusiv sub
// controlul funcțiilor de încredere (proceseazaRezultatPlataNetopia și,
// acum, această scriere strict a ntpID-ului, o valoare de corelare, nu de bani).
async function salveazaNtpId(orderId: string, ntpId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    await tx
      .update(platformPayments)
      .set({ ntpId })
      .where(and(eq(platformPayments.orderId, orderId), sql`${platformPayments.ntpId} is null`));
  });
}

// Pornește plata (o lună de acces) prin Netopia și întoarce URL-ul paginii lor
// de plată — clientul redirecționează la URL-ul întors. Dacă Netopia refuză
// pornirea, eroarea se propagă și tranzacția organizației (inclusiv comanda de
// mai sus) se anulează — nu rămâne nicio comandă-fantomă.
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

  const { orderId, sumaLei } = await insereazaComandaAbonament(ctx.db as unknown as Tx, {
    orgId: ctx.orgId,
    orgReferredByOrgId: ctx.orgReferredByOrgId,
    pachet: params.pachet,
    pretLunar: params.pretLunar,
    planConfig: params.planConfig,
    renewal: false,
  });

  const [prenume, ...restNume] = (ctx.userName ?? "").trim().split(/\s+/).filter(Boolean);

  const { paymentUrl, ntpId } = await pornestePlata({
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
  // Best-effort — o eroare aici nu trebuie să blocheze redirectul spre plată;
  // fără ntpID salvat, fallback-ul de status de pe pagina de rezultat pur și
  // simplu nu se poate folosi pentru această comandă (rămâne doar IPN-ul).
  if (ntpId) await salveazaNtpId(orderId, ntpId).catch((e) => console.error("Netopia: salvare ntpID eșuată", e));
  return paymentUrl;
}

export type RezultatReinnoire = { ok: true; confirmare: ConfirmareNetopia } | { ok: false; motiv: "fara_card" | "criptare_indisponibila" | "eroare" };

// Reînnoire AUTOMATĂ (cron zilnic, vezi api/cron/netopia-reinnoire) — taxează
// direct cardul salvat al organizației, fără pagină găzduită și fără
// redirect (nimeni nu e prezent să confirme). Aceleași reguli de preț ca la
// plata interactivă (recalculat din pachet/planConfig, niciodată dintr-o sumă
// reținută la prima plată — un ONG care își schimbă planul între timp e taxat
// corect la reînnoire).
export async function taxeazaReinnoireAutomata(
  org: {
    id: string;
    slug: string;
    name: string;
    referredByOrgId: string | null;
    package: Exclude<OrgPackage, "trial">;
    pretLunar: number;
    packageLabel: string;
    planConfig: CustomPlanConfigSaved | null;
    netopiaCardTokenEnc: string | null;
    facturareEmail: string;
  },
  baseUrl: string,
): Promise<RezultatReinnoire> {
  if (!org.netopiaCardTokenEnc) return { ok: false, motiv: "fara_card" };

  let token: string;
  try {
    token = decripteaza(org.netopiaCardTokenEnc);
  } catch {
    return { ok: false, motiv: "criptare_indisponibila" };
  }

  // Tranzacție SCURTĂ, doar pentru inserarea comenzii — se închide înainte de
  // apelul de rețea către Netopia de mai jos (o conexiune Postgres ținută
  // deschisă cât durează un apel HTTP extern e exact ce am evitat și la
  // fluxul interactiv, unde apelul rămâne azi în tranzacția lui withOrgAdmin
  // doar pentru că acolo pornește dintr-o acțiune de server existentă — aici,
  // pornind de la zero într-un cron, îl facem corect de la început).
  const { orderId, sumaLei } = await db.transaction(async (tx: Tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return insereazaComandaAbonament(tx, {
      orgId: org.id,
      orgReferredByOrgId: org.referredByOrgId,
      pachet: org.package,
      pretLunar: org.pretLunar,
      planConfig: org.planConfig,
      renewal: true,
    });
  });

  const facturare: DateFacturare = {
    email: org.facturareEmail,
    prenume: "Client",
    nume: org.name.slice(0, 60),
    telefon: "0700000000",
  };

  try {
    const rezultat = await taxeazaCuTokenSalvat({
      orderId,
      sumaLei,
      descriere: `Alexandrit — ${org.packageLabel} (reînnoire automată)`,
      facturare,
      notifyUrl: `${baseUrl}/api/netopia/ipn`,
      redirectUrl: `${baseUrl}/abonament/${org.slug}/rezultat?comanda=${orderId}`,
      token,
    });
    const confirmare = await proceseazaRezultatPlataNetopia(orderId, rezultat);
    return { ok: true, confirmare };
  } catch {
    return { ok: false, motiv: "eroare" };
  }
}
