"use server";

import { esteRutaOrganizatie } from "@/lib/link-campanie";
import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import type { CustomPlanConfigSaved } from "@/lib/billing/custom-plan";
import { getTemplatesDisponibile, type CampaignPageTemplate } from "@/lib/campaign-templates";
import { obtineIpClient, verificaLimitaRata } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { fundraisingPages, organizations } from "@/lib/db/schema";
import { SF_PUBLIC_UI_DICT } from "@/lib/i18n/dictionaries/sf-public-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { slugify } from "@/lib/slugify";
import { genereazaSlugUnic } from "@/lib/unique-slug";
import { EMAIL_RE } from "@/lib/validation";
import { raporteazaEroare } from "@/lib/monitoring";

const MAX_LEN = 200;
const MAX_POVESTE_LEN = 5000;

export type CreeazaPaginaState = { error: string | null };

// Creare publică de pagină de strângere fonduri — susținătorul NU e
// autentificat (același model ca /api/[orgSlug]/formular230). org_id se
// rezolvă server-side din slug (organizations_public_lookup), niciodată de
// la client. Pagina e activă imediat, fără moderare — la fel ca Formularul
// 230, cu validare de intrare, nu cu o coadă de aprobare (v1).
export async function creeazaPaginaAction(
  orgSlug: string,
  _prevState: CreeazaPaginaState,
  formData: FormData,
): Promise<CreeazaPaginaState> {
  const er = SF_PUBLIC_UI_DICT[await getLocale()].creeaza.erori;
  // Honeypot.
  if (String(formData.get("website") ?? "").trim()) {
    return { error: null };
  }

  // Pagina se activează imediat, fără moderare — fără limită, un bot poate crea
  // mii de pagini publice (spam, umplerea bazei). 5 pagini/oră/IP.
  if (!(await verificaLimitaRata("creeaza-pagina", await obtineIpClient(), 5, 60))) {
    return { error: er.preaMulte };
  }

  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const numeCreator = str("numeCreator");
  const emailCreator = str("emailCreator");
  const titlu = str("titlu");
  const poveste = str("poveste");
  const sumaTintaRaw = str("sumaTinta");
  const templateCerut = str("template");
  const consimtamantGdpr = formData.get("consimtamantGdpr") != null;

  if (!numeCreator || !emailCreator || !titlu || !poveste) {
    return { error: er.completeaza };
  }
  if (numeCreator.length > MAX_LEN || emailCreator.length > MAX_LEN || titlu.length > MAX_LEN) {
    return { error: er.preaLung };
  }
  if (poveste.length > MAX_POVESTE_LEN) {
    return { error: er.povestePreaLunga };
  }
  if (!EMAIL_RE.test(emailCreator)) {
    return { error: er.emailInvalid };
  }
  if (!consimtamantGdpr) {
    return { error: er.consimtamant };
  }
  let sumaTinta: number | null = null;
  if (sumaTintaRaw) {
    const n = Math.round(Number(sumaTintaRaw));
    if (!Number.isFinite(n) || n <= 0) {
      return { error: er.sumaInvalida };
    }
    sumaTinta = n;
  }

  const id = randomUUID();
  const baseSlug = slugify(titlu);

  let pageSlug: string;
  try {
    pageSlug = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
      const org = await tx
        .select({
          id: organizations.id,
          domeniuActivitate: organizations.domeniuActivitate,
          customPlanConfig: organizations.customPlanConfig,
        })
        .from(organizations)
        .where(eq(organizations.slug, orgSlug))
        .limit(1);
      if (!org[0]) throw new Error("org_not_found");
      const orgId = org[0].id;

      // Nu avem încredere în ce trimite clientul — recalculăm lista de
      // template-uri permise din org-ul real (domeniu + plan personalizat) și
      // păstrăm cererea doar dacă e chiar în acea listă.
      const customPlanConfig = org[0].customPlanConfig as CustomPlanConfigSaved | null;
      const templateuriPermise = getTemplatesDisponibile(org[0].domeniuActivitate, Boolean(customPlanConfig?.accesDesignToate));
      const template: CampaignPageTemplate = templateuriPermise.includes(templateCerut as CampaignPageTemplate)
        ? (templateCerut as CampaignPageTemplate)
        : templateuriPermise[0];

      const slug = await genereazaSlugUnic(baseSlug, async (candidat) => {
        if (esteRutaOrganizatie(candidat)) return true;
        const existing = await tx
          .select({ id: fundraisingPages.id })
          .from(fundraisingPages)
          .where(sql`${fundraisingPages.orgId} = ${orgId} and ${fundraisingPages.slug} = ${candidat}`)
          .limit(1);
        return Boolean(existing[0]);
      });

      await tx.insert(fundraisingPages).values({
        id,
        orgId,
        slug,
        titlu,
        poveste,
        sumaTinta,
        numeCreator,
        emailCreator,
        consimtamantGdpr,
        template,
      });

      return slug;
    });
  } catch (e) {
    if (e instanceof Error && e.message === "org_not_found") {
      return { error: er.orgNegasita };
    }
    raporteazaEroare("pagina-campanie-creare", e);
    return { error: er.generica };
  }

  redirect(`/strangere-fonduri/${orgSlug}/${pageSlug}`);
}
