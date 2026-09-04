"use server";

import { randomUUID } from "node:crypto";

import { and, eq, ne } from "drizzle-orm";

import { withOrgAdmin } from "@/lib/auth/guard";
import { organizations } from "@/lib/db/schema";
import { esteSlugRezervat } from "@/lib/reserved-slugs";
import { createClient } from "@/lib/supabase/server";

export type BrandingState = { error: string | null; ok: boolean };

const updateBrandingRow = withOrgAdmin(
  async (ctx, values: { slogan: string; brandColor: string; logoUrl?: string }) => {
    const set: Record<string, unknown> = {
      slogan: values.slogan || null,
      brandColor: values.brandColor || null,
    };
    if (values.logoUrl) set.logoUrl = values.logoUrl;
    await ctx.db.update(organizations).set(set).where(eq(organizations.id, ctx.orgId));
  },
);

export async function updateBrandingAction(
  orgSlug: string,
  _prevState: BrandingState,
  formData: FormData,
): Promise<BrandingState> {
  const slogan = String(formData.get("slogan") ?? "").trim();
  const brandColor = String(formData.get("brandColor") ?? "").trim();
  const logo = formData.get("logo");

  let logoUrl: string | undefined;
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > 2 * 1024 * 1024) {
      return { error: "Logo-ul e prea mare (max 2MB).", ok: false };
    }
    const supabase = await createClient();
    const ext = (logo.type.split("/")[1] || "png").replace("svg+xml", "svg");
    const path = `${orgSlug}/logo-${randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("org-branding").upload(path, logo, {
      contentType: logo.type,
      upsert: false,
    });
    if (uploadError) {
      return { error: "Încărcarea logo-ului a eșuat: " + uploadError.message, ok: false };
    }
    logoUrl = supabase.storage.from("org-branding").getPublicUrl(path).data.publicUrl;
  }

  try {
    await updateBrandingRow(orgSlug, { slogan, brandColor, logoUrl });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Salvarea a eșuat.", ok: false };
  }
  return { error: null, ok: true };
}

export type SlugState = { error: string | null; slug: string | null };

// Doar minuscule/cifre/cratime — același format ca slugify(), dar validat
// aici pentru că userul îl poate scrie oricum (nu mai trece prin slugify).
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const updateSlugRow = withOrgAdmin(async (ctx, slug: string) => {
  const [conflict] = await ctx.db
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.slug, slug), ne(organizations.id, ctx.orgId)))
    .limit(1);
  if (conflict) {
    throw new Error("Această adresă e deja folosită de altă organizație.");
  }
  await ctx.db.update(organizations).set({ slug }).where(eq(organizations.id, ctx.orgId));
});

export async function updateSlugAction(
  orgSlug: string,
  _prevState: SlugState,
  formData: FormData,
): Promise<SlugState> {
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  if (!SLUG_RE.test(slug)) {
    return { error: "Doar litere mici, cifre și cratime (ex. numele-tau).", slug: null };
  }
  if (esteSlugRezervat(slug)) {
    return { error: "Această adresă e rezervată platformei — alege alta.", slug: null };
  }
  try {
    await updateSlugRow(orgSlug, slug);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Salvarea a eșuat.", slug: null };
  }
  return { error: null, slug };
}

export type DomainState = { error: string | null; ok: boolean };

// Format minimal: cel puțin un punct, fără protocol/cale — un domeniu, nu un URL.
const DOMAIN_RE = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/;

const updateCustomDomainRow = withOrgAdmin(async (ctx, domain: string | null) => {
  if (domain) {
    const [conflict] = await ctx.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(and(eq(organizations.customDomain, domain), ne(organizations.id, ctx.orgId)))
      .limit(1);
    if (conflict) {
      throw new Error("Acest domeniu e deja folosit de altă organizație.");
    }
  }
  await ctx.db.update(organizations).set({ customDomain: domain }).where(eq(organizations.id, ctx.orgId));
});

export async function updateCustomDomainAction(
  orgSlug: string,
  _prevState: DomainState,
  formData: FormData,
): Promise<DomainState> {
  const raw = String(formData.get("customDomain") ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  const domain = raw || null;
  if (domain && !DOMAIN_RE.test(domain)) {
    return { error: "Domeniu invalid — scrie-l fără https:// sau /, ex. susinima.ro", ok: false };
  }
  try {
    await updateCustomDomainRow(orgSlug, domain);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Salvarea a eșuat.", ok: false };
  }
  return { error: null, ok: true };
}
