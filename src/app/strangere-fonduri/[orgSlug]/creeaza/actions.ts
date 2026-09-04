"use server";

import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { fundraisingPages, organizations } from "@/lib/db/schema";
import { slugify } from "@/lib/slugify";
import { genereazaSlugUnic } from "@/lib/unique-slug";
import { EMAIL_RE } from "@/lib/validation";

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
  // Honeypot.
  if (String(formData.get("website") ?? "").trim()) {
    return { error: null };
  }

  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const numeCreator = str("numeCreator");
  const emailCreator = str("emailCreator");
  const titlu = str("titlu");
  const poveste = str("poveste");
  const sumaTintaRaw = str("sumaTinta");
  const consimtamantGdpr = formData.get("consimtamantGdpr") != null;

  if (!numeCreator || !emailCreator || !titlu || !poveste) {
    return { error: "Completează toate câmpurile obligatorii." };
  }
  if (numeCreator.length > MAX_LEN || emailCreator.length > MAX_LEN || titlu.length > MAX_LEN) {
    return { error: "Unul dintre câmpuri e prea lung." };
  }
  if (poveste.length > MAX_POVESTE_LEN) {
    return { error: "Povestea e prea lungă (maximum 5.000 de caractere)." };
  }
  if (!EMAIL_RE.test(emailCreator)) {
    return { error: "Adresa de email nu e validă." };
  }
  if (!consimtamantGdpr) {
    return { error: "Trebuie să fii de acord cu prelucrarea datelor, ca să-ți poți crea pagina." };
  }
  let sumaTinta: number | null = null;
  if (sumaTintaRaw) {
    const n = Math.round(Number(sumaTintaRaw));
    if (!Number.isFinite(n) || n <= 0) {
      return { error: "Suma țintă trebuie să fie un număr pozitiv." };
    }
    sumaTinta = n;
  }

  const id = randomUUID();
  const baseSlug = slugify(titlu);

  let pageSlug: string;
  try {
    pageSlug = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
      const org = await tx.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, orgSlug)).limit(1);
      if (!org[0]) throw new Error("org_not_found");
      const orgId = org[0].id;

      const slug = await genereazaSlugUnic(baseSlug, async (candidat) => {
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
      });

      return slug;
    });
  } catch (e) {
    if (e instanceof Error && e.message === "org_not_found") {
      return { error: "Organizația nu a fost găsită." };
    }
    console.error("creeaza pagina strangere fonduri failed:", e);
    return { error: "A apărut o eroare — încearcă din nou." };
  }

  redirect(`/strangere-fonduri/${orgSlug}/${pageSlug}`);
}
