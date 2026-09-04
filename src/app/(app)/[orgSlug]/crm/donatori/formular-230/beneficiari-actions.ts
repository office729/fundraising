"use server";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { withOrgAdmin } from "@/lib/auth/guard";
import { formular230Beneficiari } from "@/lib/db/schema";
import { SLUG_PRINCIPAL } from "@/lib/formular230-constants";
import { cifValidFormat, ibanValid } from "@/lib/iban";
import { genereazaCodScurtUnic } from "@/lib/short-code";
import { slugify } from "@/lib/slugify";
import { genereazaSlugUnic } from "@/lib/unique-slug";

function valideazaIbanCif(iban: string, cif: string): string | null {
  if (iban && !ibanValid(iban)) return "IBAN-ul nu e valid — verifică-l (lipsă/în plus o cifră?).";
  if (cif && !cifValidFormat(cif)) return "CIF-ul nu e valid — doar cifre, eventual cu prefixul RO.";
  return null;
}

export type BeneficiarState = { error: string | null; ok: boolean; slug?: string };

const inserteazaBeneficiar = withOrgAdmin(
  async (ctx, values: { nume: string; iban: string; cif: string; emailBeneficiar: string }) => {
    const baseSlug = slugify(values.nume);
    const slug = await genereazaSlugUnic(baseSlug === SLUG_PRINCIPAL ? `${baseSlug}-cont` : baseSlug, async (s) => {
      const [row] = await ctx.db
        .select({ id: formular230Beneficiari.id })
        .from(formular230Beneficiari)
        .where(and(eq(formular230Beneficiari.orgId, ctx.orgId), eq(formular230Beneficiari.slug, s)))
        .limit(1);
      return !!row;
    });
    const shortCode = await genereazaCodScurtUnic(async (cod) => {
      const [row] = await ctx.db
        .select({ id: formular230Beneficiari.id })
        .from(formular230Beneficiari)
        .where(eq(formular230Beneficiari.shortCode, cod))
        .limit(1);
      return !!row;
    });
    await ctx.db.insert(formular230Beneficiari).values({
      id: randomUUID(),
      orgId: ctx.orgId,
      nume: values.nume,
      slug,
      shortCode,
      iban: values.iban || null,
      cif: values.cif || null,
      emailBeneficiar: values.emailBeneficiar || null,
    });
    return slug;
  },
);

export async function adaugaBeneficiarAction(
  orgSlug: string,
  _prevState: BeneficiarState,
  formData: FormData,
): Promise<BeneficiarState> {
  const nume = String(formData.get("nume") ?? "").trim();
  if (!nume) return { error: "Denumirea beneficiarului e obligatorie.", ok: false };
  const iban = String(formData.get("iban") ?? "").trim();
  const cif = String(formData.get("cif") ?? "").trim();
  const emailBeneficiar = String(formData.get("emailBeneficiar") ?? "").trim();
  const eroareValidare = valideazaIbanCif(iban, cif);
  if (eroareValidare) return { error: eroareValidare, ok: false };

  try {
    const slug = await inserteazaBeneficiar(orgSlug, { nume, iban, cif, emailBeneficiar });
    return { error: null, ok: true, slug };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Salvarea a eșuat.", ok: false };
  }
}

const actualizeazaBeneficiar = withOrgAdmin(
  async (ctx, id: string, values: { nume: string; iban: string; cif: string; emailBeneficiar: string }) => {
    await ctx.db
      .update(formular230Beneficiari)
      .set({
        nume: values.nume,
        iban: values.iban || null,
        cif: values.cif || null,
        emailBeneficiar: values.emailBeneficiar || null,
      })
      .where(and(eq(formular230Beneficiari.id, id), eq(formular230Beneficiari.orgId, ctx.orgId)));
  },
);

export async function editeazaBeneficiarAction(
  orgSlug: string,
  _prevState: BeneficiarState,
  formData: FormData,
): Promise<BeneficiarState> {
  const id = String(formData.get("id") ?? "");
  const nume = String(formData.get("nume") ?? "").trim();
  if (!id || !nume) return { error: "Denumirea beneficiarului e obligatorie.", ok: false };
  const iban = String(formData.get("iban") ?? "").trim();
  const cif = String(formData.get("cif") ?? "").trim();
  const emailBeneficiar = String(formData.get("emailBeneficiar") ?? "").trim();
  const eroareValidare = valideazaIbanCif(iban, cif);
  if (eroareValidare) return { error: eroareValidare, ok: false };

  try {
    await actualizeazaBeneficiar(orgSlug, id, { nume, iban, cif, emailBeneficiar });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Salvarea a eșuat.", ok: false };
  }
  return { error: null, ok: true };
}

export const stergeBeneficiarAction = withOrgAdmin(async (ctx, id: string) => {
  const [beneficiar] = await ctx.db
    .select({ slug: formular230Beneficiari.slug })
    .from(formular230Beneficiari)
    .where(and(eq(formular230Beneficiari.id, id), eq(formular230Beneficiari.orgId, ctx.orgId)))
    .limit(1);
  if (!beneficiar) return { error: "Contul nu a fost găsit." };
  if (beneficiar.slug === SLUG_PRINCIPAL) {
    return { error: "Contul principal nu poate fi șters — e legat de link-ul public existent." };
  }
  await ctx.db
    .delete(formular230Beneficiari)
    .where(and(eq(formular230Beneficiari.id, id), eq(formular230Beneficiari.orgId, ctx.orgId)));
  return { error: null };
});
