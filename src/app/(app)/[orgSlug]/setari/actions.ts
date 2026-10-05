"use server";

import { randomUUID } from "node:crypto";

import { and, eq, ne } from "drizzle-orm";

import { withOrgAdmin } from "@/lib/auth/guard";
import { cifFolositDeAltaOrganizatie, MESAJ_CIF_FOLOSIT } from "@/lib/cif";
import { TOATE_DOMENIILE, type DomeniuActivitate } from "@/lib/campaign-templates";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { organizations } from "@/lib/db/schema";
import { cifValidFormat, ibanValid } from "@/lib/iban";
import { gasesteJudet } from "@/lib/judete";
import { domeniuRezervatPlatformei } from "@/lib/platform-domains";
import { esteSlugRezervat } from "@/lib/reserved-slugs";
import { createClient } from "@/lib/supabase/server";
import { extensieImagine } from "@/lib/upload-imagini";

export type BrandingState = { error: string | null; ok: boolean };

// Allowlist explicit — NU includem image/svg+xml: un SVG poate conține
// <script>/handlere de evenimente, iar fișierul e servit public, necontrolat,
// din bucket-ul org-branding (risc de XSS stocat dacă e deschis direct, nu
// doar randat prin <img>). Vezi audit de securitate.

const updateBrandingRow = withOrgAdmin(
  async (
    ctx,
    values: {
      slogan: string;
      brandColor: string;
      logoUrl?: string;
      cif: string;
      // undefined = câmpurile n-au fost trimise deloc (formularul de
      // onboarding nu le randează — showDateFacturare=false) — NU se ating,
      // ca să nu golească date de facturare deja completate din Setări.
      adresaSediu?: string;
      judet?: string;
      iban?: string;
      domeniuActivitate: string;
    },
  ) => {
    const set: Record<string, unknown> = {
      slogan: values.slogan || null,
      brandColor: values.brandColor || null,
      cif: values.cif || null,
      domeniuActivitate: values.domeniuActivitate || null,
    };
    if (values.adresaSediu !== undefined) set.adresaSediu = values.adresaSediu || null;
    if (values.judet !== undefined) set.judet = values.judet || null;
    if (values.iban !== undefined) set.iban = values.iban || null;
    if (values.logoUrl) set.logoUrl = values.logoUrl;
    // CIF unic între organizații — împiedică trial-uri repetate ale aceleiași
    // entități. Verificat aici (mesaj clar) și garantat de indexul unic
    // organizations_cif_norm_unique (curse între cereri simultane).
    if (values.cif && (await cifFolositDeAltaOrganizatie(values.cif, ctx.orgId))) {
      throw new EroareUtilizator(MESAJ_CIF_FOLOSIT);
    }
    try {
      await ctx.db.update(organizations).set(set).where(eq(organizations.id, ctx.orgId));
    } catch (e) {
      if (String((e as { message?: string; cause?: { message?: string } })?.message ?? "").includes("organizations_cif_norm_unique") ||
        String((e as { cause?: { message?: string } })?.cause?.message ?? "").includes("organizations_cif_norm_unique")) {
        throw new EroareUtilizator(MESAJ_CIF_FOLOSIT);
      }
      throw e;
    }
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

  // CIF, datele de facturare și domeniul de activitate sunt opționale —
  // necompletate nu blochează salvarea (la fel ca sloganul/logo-ul). Validate
  // doar dacă sunt scrise — folosite la emiterea automată a facturii Oblio.
  const cifRaw = String(formData.get("cif") ?? "").trim();
  if (cifRaw && !cifValidFormat(cifRaw)) {
    return { error: "CIF invalid — scrie-l cu sau fără prefixul RO (ex. RO12345678).", ok: false };
  }
  // .has(): dialogul de onboarding nu randează deloc aceste câmpuri
  // (showDateFacturare=false) — absența lor din formData NU trebuie tratată
  // ca „șterge datele de facturare", doar ca „nu le atinge".
  const areCampuriFacturare = formData.has("adresaSediu");
  const adresaSediu = areCampuriFacturare ? String(formData.get("adresaSediu") ?? "").trim() : undefined;
  const judetRaw = areCampuriFacturare ? String(formData.get("judet") ?? "").trim() : "";
  const judet = judetRaw ? gasesteJudet(judetRaw) : null;
  if (judetRaw && !judet) {
    return { error: "Județ invalid.", ok: false };
  }
  const ibanRaw = areCampuriFacturare
    ? String(formData.get("iban") ?? "")
        .replace(/\s+/g, "")
        .toUpperCase()
    : undefined;
  if (ibanRaw && !ibanValid(ibanRaw)) {
    return { error: "IBAN invalid — verifică numărul contului.", ok: false };
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
    const ext = extensieImagine(logo.type);
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
    await updateBrandingRow(orgSlug, {
      slogan,
      brandColor,
      logoUrl,
      cif: cifRaw,
      adresaSediu,
      judet: areCampuriFacturare ? (judet ?? "") : undefined,
      iban: ibanRaw,
      domeniuActivitate,
    });
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
