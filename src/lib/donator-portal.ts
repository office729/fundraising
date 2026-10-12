import "server-only";

import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { appUsers, fundraisingDonations, fundraisingPages, memberships, organizations } from "@/lib/db/schema";
import { escHtml } from "@/lib/html-escape";
import type { Locale } from "@/lib/i18n/config";
import { PORTAL_DONATOR_DICT } from "@/lib/i18n/dictionaries/portal-donator";
import { emailConfigurat, trimiteEmail } from "@/lib/email";
import { raporteazaEroare } from "@/lib/monitoring";

import { parametriLinkPortal, verificaLinkPortal } from "./donator-portal-token";
import type { DescriereAbonament } from "./donator-portal-ops";

const cheie = () => {
  const c = process.env.ORG_SECRETS_KEY;
  if (!c) throw new Error("ORG_SECRETS_KEY lipsește — nu se pot semna linkuri pentru donatori.");
  return c;
};

export const baseUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://alexandrit.ro").replace(/\/$/, "");

export type LinkPortal = { e: string; x: string; t: string };

export const creeazaLinkPortal = (orgId: string, email: string): LinkPortal => parametriLinkPortal(cheie(), orgId, email);
export const verificaLink = (orgId: string, l: Partial<LinkPortal>): string | null => verificaLinkPortal(cheie(), orgId, l.e, l.x, l.t);

export const adresaPaginiiDeCerere = (orgSlug: string) => `${baseUrl()}/strangere-fonduri/${orgSlug}/donator`;
export const adresaGestionare = (orgSlug: string, l: LinkPortal) =>
  `${baseUrl()}/strangere-fonduri/${orgSlug}/donator/gestioneaza?e=${encodeURIComponent(l.e)}&x=${l.x}&t=${encodeURIComponent(l.t)}`;

export type AbonamentDonator = { subId: string; campanie: string };

// Abonamentele lunare cunoscute pentru (organizație, email), după donațiile înregistrate. Starea reală vine din Stripe.
export async function abonamenteDupaEmail(orgId: string, email: string): Promise<AbonamentDonator[]> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const rows = await tx
      .select({ subId: fundraisingDonations.stripeSubscriptionId, campanie: fundraisingPages.titlu, creat: fundraisingDonations.createdAt })
      .from(fundraisingDonations)
      .innerJoin(fundraisingPages, eq(fundraisingPages.id, fundraisingDonations.pageId))
      .where(
        and(
          eq(fundraisingDonations.orgId, orgId),
          eq(fundraisingDonations.recurenta, true),
          isNotNull(fundraisingDonations.stripeSubscriptionId),
          sql`lower(${fundraisingDonations.emailDonator}) = ${email.toLowerCase()}`,
        ),
      )
      .orderBy(desc(fundraisingDonations.createdAt));
    const vazute = new Set<string>();
    const rezultat: AbonamentDonator[] = [];
    for (const r of rows) {
      if (!r.subId || vazute.has(r.subId)) continue;
      vazute.add(r.subId);
      rezultat.push({ subId: r.subId, campanie: r.campanie });
      if (rezultat.length >= 10) break;
    }
    return rezultat;
  });
}

export async function organizatiePublica(orgSlug: string): Promise<{ id: string; name: string } | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const [o] = await tx.select({ id: organizations.id, name: organizations.name }).from(organizations).where(eq(organizations.slug, orgSlug)).limit(1);
    return o ?? null;
  });
}

async function destinatariOrganizatie(orgId: string): Promise<string[]> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const rows = await tx
      .select({ email: appUsers.email })
      .from(memberships)
      .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
      .where(and(eq(memberships.orgId, orgId), inArray(memberships.role, ["owner", "admin"])))
      .orderBy(asc(memberships.createdAt));
    return [...new Set(rows.map((r) => r.email).filter(Boolean))].slice(0, 5);
  });
}

// Emailul cu linkul de gestionare, trimis doar dacă adresa are cel puțin o donație lunară la organizația respectivă.
export async function trimiteLinkulDonatorului(orgSlug: string, orgId: string, orgName: string, email: string, locale: Locale): Promise<void> {
  if (!emailConfigurat()) return;
  const t = PORTAL_DONATOR_DICT[locale];
  const link = adresaGestionare(orgSlug, creeazaLinkPortal(orgId, email));
  await trimiteEmail({ to: email, subiect: t.emailLink.subiect(orgName.replace(/[\r\n]+/g, " ")), html: t.emailLink.html(escHtml(orgName), escHtml(link)) });
}

const textSuma = (d: DescriereAbonament) => `${d.suma.toLocaleString("ro-RO")} ${d.moneda === "ron" ? "lei" : d.moneda.toUpperCase()} / lună${d.stare === "pauza" ? " (în pauză)" : d.stare === "oprit" ? " (oprită)" : ""}`;

// Înștiințarea organizației (proprietari și administratori): donatorul și-a modificat singur donația lunară. Best-effort.
export async function avertizeazaOrganizatia(orgId: string, actiune: "suma" | "pauza" | "reia" | "opreste" | "card", email: string, campanie: string, inainte?: DescriereAbonament, dupa?: DescriereAbonament): Promise<void> {
  try {
    if (!emailConfigurat()) return;
    const destinatari = await destinatariOrganizatie(orgId);
    if (destinatari.length === 0) return;
    const t = PORTAL_DONATOR_DICT.ro.emailOrganizatie;
    const nume = t.actiuni[actiune];
    const html = t.html({ actiune: nume, email: escHtml(email), campanie: escHtml(campanie), inainte: inainte ? escHtml(textSuma(inainte)) : "—", dupa: dupa ? escHtml(textSuma(dupa)) : "—" });
    for (const to of destinatari) {
      await trimiteEmail({ to, subiect: t.subiect(nume), html }).catch((e) => raporteazaEroare("portal-donator-alerta", e, { orgId }));
    }
  } catch (e) {
    raporteazaEroare("portal-donator-alerta", e, { orgId });
  }
}
