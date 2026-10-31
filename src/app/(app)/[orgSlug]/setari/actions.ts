"use server";

import { randomUUID } from "node:crypto";

import { and, eq, ne } from "drizzle-orm";

import { withOrgAdmin } from "@/lib/auth/guard";
import { getLimiteleEfective, mesajeCote } from "@/lib/billing/quota";
import { cifFolositDeAltaOrganizatie } from "@/lib/cif";
import { getTr } from "@/lib/i18n/tr-server";
import { ERORI_UI_DICT } from "@/lib/i18n/dictionaries/erori-ui";
import { getLocale } from "@/lib/i18n/get-locale";
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
      throw new EroareUtilizator(ERORI_UI_DICT[await getLocale()].cifFolosit);
    }
    try {
      await ctx.db.update(organizations).set(set).where(eq(organizations.id, ctx.orgId));
    } catch (e) {
      if (String((e as { message?: string; cause?: { message?: string } })?.message ?? "").includes("organizations_cif_norm_unique") ||
        String((e as { cause?: { message?: string } })?.cause?.message ?? "").includes("organizations_cif_norm_unique")) {
        throw new EroareUtilizator(ERORI_UI_DICT[await getLocale()].cifFolosit);
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
  const t = await getTr();
  const slogan = String(formData.get("slogan") ?? "").trim();
  const brandColor = String(formData.get("brandColor") ?? "").trim();
  const logo = formData.get("logo");

  // CIF, datele de facturare și domeniul de activitate sunt opționale —
  // necompletate nu blochează salvarea (la fel ca sloganul/logo-ul). Validate
  // doar dacă sunt scrise — folosite la emiterea automată a facturii Oblio.
  const cifRaw = String(formData.get("cif") ?? "").trim();
  if (cifRaw && !cifValidFormat(cifRaw)) {
    return { error: t("CIF invalid — scrie-l cu sau fără prefixul RO (ex. RO12345678).", "Invalid CIF (tax ID) — enter it with or without the RO prefix (e.g. RO12345678)."), ok: false };
  }
  // .has(): dialogul de onboarding nu randează deloc aceste câmpuri
  // (showDateFacturare=false) — absența lor din formData NU trebuie tratată
  // ca „șterge datele de facturare", doar ca „nu le atinge".
  const areCampuriFacturare = formData.has("adresaSediu");
  const adresaSediu = areCampuriFacturare ? String(formData.get("adresaSediu") ?? "").trim() : undefined;
  const judetRaw = areCampuriFacturare ? String(formData.get("judet") ?? "").trim() : "";
  const judet = judetRaw ? gasesteJudet(judetRaw) : null;
  if (judetRaw && !judet) {
    return { error: t("Județ invalid.", "Invalid county (județ)."), ok: false };
  }
  const ibanRaw = areCampuriFacturare
    ? String(formData.get("iban") ?? "")
        .replace(/\s+/g, "")
        .toUpperCase()
    : undefined;
  if (ibanRaw && !ibanValid(ibanRaw)) {
    return { error: t("IBAN invalid — verifică numărul contului.", "Invalid IBAN — check the account number."), ok: false };
  }
  const domeniuActivitate = String(formData.get("domeniuActivitate") ?? "").trim();
  if (domeniuActivitate && !TOATE_DOMENIILE.includes(domeniuActivitate as DomeniuActivitate)) {
    return { error: t("Domeniu de activitate invalid.", "Invalid field of activity."), ok: false };
  }

  let logoUrl: string | undefined;
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > 2 * 1024 * 1024) {
      return { error: t("Logo-ul e prea mare (max 2MB).", "The logo is too large (max 2MB)."), ok: false };
    }
    const ext = extensieImagine(logo.type);
    if (!ext) {
      return { error: t("Format neacceptat — folosește PNG, JPG sau WebP.", "Unsupported format — use PNG, JPG or WebP."), ok: false };
    }
    const supabase = await createClient();
    const path = `${orgSlug}/logo-${randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("org-branding").upload(path, logo, {
      contentType: logo.type,
      upsert: false,
    });
    if (uploadError) {
      return { error: t("Încărcarea logo-ului a eșuat: ", "The logo upload failed: ") + uploadError.message, ok: false };
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
    return { error: mesajSigur(e, t("Salvarea a eșuat.", "Saving failed."), "setari-branding"), ok: false };
  }
  return { error: null, ok: true };
}

export type SlugState = { error: string | null; slug: string | null };

// Doar minuscule/cifre/cratime — același format ca slugify(), dar validat
// aici pentru că userul îl poate scrie oricum (nu mai trece prin slugify).
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const updateSlugRow = withOrgAdmin(async (ctx, slug: string) => {
  const t = await getTr();
  const [conflict] = await ctx.db
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.slug, slug), ne(organizations.id, ctx.orgId)))
    .limit(1);
  if (conflict) {
    throw new EroareUtilizator(t("Această adresă e deja folosită de altă organizație.", "This address is already used by another organization."));
  }
  // Webhook-urile Stripe configurate înainte de adresa cu ID au slug-ul în URL: redenumirea ar opri tăcut confirmarea
  // donațiilor (rămân „în așteptare", fără alertă). Se face împreună, ca URL-ul din Stripe să fie mutat întâi.
  const [stripe] = await ctx.db
    .select({ webhook: organizations.donationStripeWebhookSecretEnc })
    .from(organizations)
    .where(eq(organizations.id, ctx.orgId))
    .limit(1);
  if (stripe?.webhook) {
    throw new EroareUtilizator(
      t(
        "Ai conectat Stripe pentru donații: schimbarea adresei ar opri confirmarea donațiilor. Scrie-ne la vlad.placinta@alexandrit.ro și o schimbăm împreună, fără pierderi.",
        "You have connected Stripe for donations: changing the address would stop donation confirmations. Write to us at vlad.placinta@alexandrit.ro and we will change it together, without losses.",
      ),
    );
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
  const t = await getTr();
  if (!SLUG_RE.test(slug)) {
    return { error: t("Doar litere mici, cifre și cratime (ex. numele-tau).", "Only lowercase letters, digits and hyphens (e.g. your-name)."), slug: null };
  }
  if (esteSlugRezervat(slug)) {
    return { error: t("Această adresă e rezervată platformei — alege alta.", "This address is reserved by the platform — choose another."), slug: null };
  }
  try {
    await updateSlugRow(orgSlug, slug);
  } catch (e) {
    return { error: mesajSigur(e, t("Salvarea a eșuat.", "Saving failed."), "setari-slug"), slug: null };
  }
  return { error: null, slug };
}

export type DomainState = { error: string | null; ok: boolean };

// Format minimal: cel puțin un punct, fără protocol/cale — un domeniu, nu un URL.
const DOMAIN_RE = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/;

const updateCustomDomainRow = withOrgAdmin(async (ctx, domain: string | null) => {
  const t = await getTr();
  if (domain) {
    // Domeniul propriu e inclus în IMPACT; cine îl are deja (de dinainte) îl poate păstra.
    const [curent] = await ctx.db.select({ d: organizations.customDomain }).from(organizations).where(eq(organizations.id, ctx.orgId)).limit(1);
    if (curent?.d !== domain && !getLimiteleEfective(ctx.orgPackage, ctx.orgCustomPlanConfig).domeniuPropriu) {
      throw new EroareUtilizator(mesajeCote.domeniuPropriu(ctx.orgPackage));
    }
    const [conflict] = await ctx.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(and(eq(organizations.customDomain, domain), ne(organizations.id, ctx.orgId)))
      .limit(1);
    if (conflict) {
      throw new EroareUtilizator(t("Acest domeniu e deja folosit de altă organizație.", "This domain is already used by another organization."));
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
  const t = await getTr();
  if (domain && !DOMAIN_RE.test(domain)) {
    return { error: t("Domeniu invalid — scrie-l fără https:// sau /, ex. susinima.ro", "Invalid domain — write it without https:// or /, e.g. susinima.ro"), ok: false };
  }
  if (domain && domeniuRezervatPlatformei(domain)) {
    return { error: t("Acest domeniu aparține platformei — folosește domeniul propriu al organizației.", "This domain belongs to the platform — use your organization's own domain."), ok: false };
  }
  try {
    await updateCustomDomainRow(orgSlug, domain);
  } catch (e) {
    return { error: mesajSigur(e, t("Salvarea a eșuat.", "Saving failed."), "setari-domeniu"), ok: false };
  }
  return { error: null, ok: true };
}
