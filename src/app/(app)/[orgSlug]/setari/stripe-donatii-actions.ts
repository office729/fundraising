"use server";

import { eq } from "drizzle-orm";

import { withOrgAdmin } from "@/lib/auth/guard";
import { organizations } from "@/lib/db/schema";
import { stripePentruCheie } from "@/lib/org-stripe";
import { criptareConfigurata, cripteaza, decripteaza } from "@/lib/secret-box";

export type StripeDonatiiState = { error: string | null; ok: boolean };

export type StripeDonatiiStatus = {
  conectat: boolean;
  hint: string | null;
  conectatLa: string | null;
  areWebhook: boolean;
  criptareActiva: boolean;
  publishableKey: string | null;
  domeniuVerificatLa: string | null;
};

export const obtineStatusStripeDonatii = withOrgAdmin(async (ctx): Promise<StripeDonatiiStatus> => {
  const rows = await ctx.db
    .select({
      secret: organizations.donationStripeSecretEnc,
      webhook: organizations.donationStripeWebhookSecretEnc,
      hint: organizations.donationStripeKeyHint,
      la: organizations.donationStripeConnectedAt,
      publishableKey: organizations.donationStripePublishableKey,
      domeniuLa: organizations.donationStripeDomainVerifiedAt,
    })
    .from(organizations)
    .where(eq(organizations.id, ctx.orgId))
    .limit(1);
  const r = rows[0];
  return {
    conectat: Boolean(r?.secret),
    hint: r?.hint ?? null,
    conectatLa: r?.la ? r.la.toISOString() : null,
    areWebhook: Boolean(r?.webhook),
    criptareActiva: criptareConfigurata(),
    publishableKey: r?.publishableKey ?? null,
    domeniuVerificatLa: r?.domeniuLa ? r.domeniuLa.toISOString() : null,
  };
});

const RE_CHEIE = /^(sk|rk)_(live|test)_[A-Za-z0-9]{10,}$/;
const RE_CHEIE_PUBLICA = /^pk_(live|test)_[A-Za-z0-9]{10,}$/;
const RE_WEBHOOK = /^whsec_[A-Za-z0-9]{10,}$/;

const salveaza = withOrgAdmin(async (ctx, cheie: string, webhook: string, cheiePublicabila: string): Promise<StripeDonatiiState> => {
  if (!criptareConfigurata()) {
    return {
      ok: false,
      error: "Serverul nu are încă activată criptarea cheilor (ORG_SECRETS_KEY) — cheile nu pot fi salvate în siguranță. Contactează administratorul platformei.",
    };
  }

  const existent = (
    await ctx.db
      .select({ secret: organizations.donationStripeSecretEnc, hint: organizations.donationStripeKeyHint })
      .from(organizations)
      .where(eq(organizations.id, ctx.orgId))
      .limit(1)
  )[0];

  if (!cheie && !existent?.secret) return { ok: false, error: "Introdu cheia secretă din contul tău Stripe." };
  if (cheie && !RE_CHEIE.test(cheie)) {
    return { ok: false, error: "Cheia nu are formatul corect — trebuie să înceapă cu sk_live_… (sau rk_live_…, pentru o cheie restricționată)." };
  }
  if (webhook && !RE_WEBHOOK.test(webhook)) {
    return { ok: false, error: "Secretul webhook-ului nu are formatul corect — trebuie să înceapă cu whsec_…" };
  }
  if (cheiePublicabila && !RE_CHEIE_PUBLICA.test(cheiePublicabila)) {
    return { ok: false, error: "Cheia publicabilă nu are formatul corect — trebuie să înceapă cu pk_live_… (sau pk_test_…)." };
  }

  const set: Partial<typeof organizations.$inferInsert> = {};

  if (cheie) {
    // Verificăm cheia direct la Stripe, ca o cheie greșită să nu fie salvată și
    // să eșueze abia la prima donație a unui om real. O cheie restricționată
    // fără drept de citire a soldului e totuși validă — respingem doar
    // autentificarea eșuată.
    try {
      await stripePentruCheie(cheie).balance.retrieve();
    } catch (e) {
      const tip = (e as { type?: string }).type;
      if (tip === "StripeAuthenticationError") {
        return { ok: false, error: "Stripe a respins cheia. Verifică dacă ai copiat-o întreagă și dacă e cheia secretă (nu cea publicabilă)." };
      }
      if (tip !== "StripePermissionError") {
        console.error("validare cheie Stripe ONG:", e);
        return { ok: false, error: "Nu am putut verifica cheia la Stripe acum. Încearcă din nou în câteva momente." };
      }
    }
    set.donationStripeSecretEnc = cripteaza(cheie);
    // Doar pentru afișare în Setări: prefixul (sk_live_) + ultimele 4 caractere.
    const prefix = /^(?:sk|rk)_(?:live|test)_/.exec(cheie)?.[0] ?? "";
    set.donationStripeKeyHint = `${prefix}…${cheie.slice(-4)}`;
    set.donationStripeConnectedAt = new Date();
  }
  if (webhook) set.donationStripeWebhookSecretEnc = cripteaza(webhook);
  // Cheia publicabilă e menită să ajungă în browser — nu se criptează, la fel
  // ca orice altă cheie "publishable" Stripe (asta e rostul ei).
  if (cheiePublicabila) set.donationStripePublishableKey = cheiePublicabila;

  await ctx.db.update(organizations).set(set).where(eq(organizations.id, ctx.orgId));
  return { ok: true, error: null };
});

export async function salveazaStripeDonatiiAction(
  orgSlug: string,
  _prev: StripeDonatiiState,
  formData: FormData,
): Promise<StripeDonatiiState> {
  const cheie = String(formData.get("cheieSecreta") ?? "").trim();
  const webhook = String(formData.get("secretWebhook") ?? "").trim();
  const cheiePublicabila = String(formData.get("cheiePublicabila") ?? "").trim();
  return salveaza(orgSlug, cheie, webhook, cheiePublicabila);
}

// Domeniul principal al platformei — pagina publică de donații e servită de
// aici implicit; se adaugă și domeniul propriu al ONG-ului (dacă are unul),
// ca butoanele Apple Pay/Google Pay să funcționeze și acolo.
const DOMENIU_PLATFORMA = "alexandrit.ro";

// Înregistrează domeniile platformei ca "payment method domain" verificat pe
// CONTUL Stripe al ONG-ului (necesar pentru Apple Pay/Google Pay direct pe
// pagină — vezi express-checkout.tsx) — un singur apel acoperă toate
// metodele deodată (Stripe verifică automat, fără fișier de găzduit).
export const activeazaDomeniuPlataAction = withOrgAdmin(async (ctx): Promise<StripeDonatiiState> => {
  const rows = await ctx.db
    .select({ secret: organizations.donationStripeSecretEnc, customDomain: organizations.customDomain })
    .from(organizations)
    .where(eq(organizations.id, ctx.orgId))
    .limit(1);
  const r = rows[0];
  if (!r?.secret) return { ok: false, error: "Conectează întâi cheia secretă Stripe." };

  const domenii = [DOMENIU_PLATFORMA, ...(r.customDomain ? [r.customDomain] : [])];
  try {
    const stripe = stripePentruCheie(decripteaza(r.secret));
    const existente = await stripe.paymentMethodDomains.list({ limit: 100 });
    const dejaInregistrate = new Set(existente.data.map((d) => d.domain_name));
    for (const domeniu of domenii) {
      if (!dejaInregistrate.has(domeniu)) {
        await stripe.paymentMethodDomains.create({ domain_name: domeniu });
      }
    }
  } catch (e) {
    console.error("înregistrare payment method domain Stripe:", e);
    return { ok: false, error: "Nu am putut înregistra domeniul la Stripe acum. Încearcă din nou în câteva momente." };
  }

  await ctx.db.update(organizations).set({ donationStripeDomainVerifiedAt: new Date() }).where(eq(organizations.id, ctx.orgId));
  return { ok: true, error: null };
});

export const deconecteazaStripeDonatii = withOrgAdmin(async (ctx): Promise<StripeDonatiiState> => {
  await ctx.db
    .update(organizations)
    .set({
      donationStripeSecretEnc: null,
      donationStripeWebhookSecretEnc: null,
      donationStripeKeyHint: null,
      donationStripeConnectedAt: null,
      donationStripePublishableKey: null,
      donationStripeDomainVerifiedAt: null,
    })
    .where(eq(organizations.id, ctx.orgId));
  return { ok: true, error: null };
});
