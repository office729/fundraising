"use server";

import { randomUUID } from "node:crypto";

import { and, eq, ne } from "drizzle-orm";

import { withOrgAdmin } from "@/lib/auth/guard";
import { TOATE_DOMENIILE, type DomeniuActivitate } from "@/lib/campaign-templates";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { organizations } from "@/lib/db/schema";
import { cifValidFormat } from "@/lib/iban";
import { domeniuRezervatPlatformei } from "@/lib/platform-domains";
import { esteSlugRezervat } from "@/lib/reserved-slugs";
import { createClient } from "@/lib/supabase/server";

export type BrandingState = { error: string | null; ok: boolean };

// Allowlist explicit — NU includem image/svg+xml: un SVG poate conține
// <script>/handlere de evenimente, iar fișierul e servit public, necontrolat,
// din bucket-ul org-branding (risc de XSS stocat dacă e deschis direct, nu
// doar randat prin <img>). Vezi audit de securitate.
const LOGO_MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const updateBrandingRow = withOrgAdmin(
  async (
    ctx,
    values: {
      slogan: string;
      brandColor: string;
      logoUrl?: string;
      cif: string;
      domeniuActivitate: string;
    },
  ) => {
    const set: Record<string, unknown> = {
      slogan: values.slogan || null,
      brandColor: values.brandColor || null,
      cif: values.cif || null,
      domeniuActivitate: values.domeniuActivitate || null,
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

  // CIF și domeniul de activitate sunt opționale — necompletate nu blochează
  // salvarea (la fel ca sloganul/logo-ul). Validate doar dacă sunt scrise.
  const cifRaw = String(formData.get("cif") ?? "").trim();
  if (cifRaw && !cifValidFormat(cifRaw)) {
    return { error: "CIF invalid — scrie-l cu sau fără prefixul RO (ex. RO12345678).", ok: false };
  }
  const domeniuActivitate = String(formData.get("domeniuActivitate") ?? "").trim();
  if (domeniuActivitate && !TOATE_DOMENIILE.includes(domeniuActivitate as DomeniuActivitate)) {
    return { error: "Domeniu de activitate invalid.", ok: false };
  }

  let logoUrl: string | undefined;
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > 2 * 1024 * 1024) {
      return { error: "Logo-ul e prea mare (max 2MB).", ok: false };
    }
    const ext = LOGO_MIME_EXT[logo.type];
    if (!ext) {
      return { error: "Format neacceptat — folosește PNG, JPG sau WebP.", ok: false };
    }
    const supabase = await createClient();
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
    await updateBrandingRow(orgSlug, { slogan, brandColor, logoUrl, cif: cifRaw, domeniuActivitate });
  } catch (e) {
    return { error: mesajSigur(e, "Salvarea a eșuat.", "setari-branding"), ok: false };
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
    throw new EroareUtilizator("Această adresă e deja folosită de altă organizație.");
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
    return { error: mesajSigur(e, "Salvarea a eșuat.", "setari-slug"), slug: null };
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
      throw new EroareUtilizator("Acest domeniu e deja folosit de altă organizație.");
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
  if (domain && domeniuRezervatPlatformei(domain)) {
    return { error: "Acest domeniu aparține platformei — folosește domeniul propriu al organizației.", ok: false };
  }
  try {
    await updateCustomDomainRow(orgSlug, domain);
  } catch (e) {
    return { error: mesajSigur(e, "Salvarea a eșuat.", "setari-domeniu"), ok: false };
  }
  return { error: null, ok: true };
}
