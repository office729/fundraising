"use server";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { withOrgAdmin } from "@/lib/auth/guard";
import { fundraisingDonations, fundraisingPages, fundraisingUpdates } from "@/lib/db/schema";
import { slugify } from "@/lib/slugify";
import { createClient } from "@/lib/supabase/server";
import { genereazaSlugUnic } from "@/lib/unique-slug";

export type StergePaginaState = { error: string | null };

// Owner/admin al organizației — ex. pagină spam sau creată din greșeală.
// Ștergerea e definitivă (CASCADE și pe donațiile asociate). Blocată dacă
// pagina are deja donații reușite — altfel donatoriReali rămâne cu sume
// umflate, permanent nereconciliabile (nicio referință înapoi către pagina
// ștearsă). Pentru o campanie încheiată cu succes, folosește "Închide" în
// loc — păstrează istoricul. `org_id` filtrat explicit (nu doar prin RLS) —
// chiar dacă id-ul e ghicit, nu atinge alt org.
export const stergePaginaStrangereFonduri = withOrgAdmin(async (ctx, id: string): Promise<StergePaginaState> => {
  const donatii = await ctx.db
    .select({ id: fundraisingDonations.id })
    .from(fundraisingDonations)
    .where(and(eq(fundraisingDonations.pageId, id), eq(fundraisingDonations.status, "reusita")))
    .limit(1);
  if (donatii[0]) {
    return { error: "Pagina are donații reușite — nu poate fi ștearsă definitiv. Închide-o în loc, ca să păstrezi istoricul." };
  }

  await ctx.db.delete(fundraisingPages).where(and(eq(fundraisingPages.id, id), eq(fundraisingPages.orgId, ctx.orgId)));
  return { error: null };
});

// Comută o pagină între "activa" și "inchisa" — nedistructiv, păstrează
// istoricul donațiilor. O pagină închisă nu mai apare public ca activă și nu
// mai acceptă donații noi (vezi pagina publică + doneazaAction).
export const comutaStatusPaginaStrangereFonduri = withOrgAdmin(async (ctx, id: string, statusNou: "activa" | "inchisa") => {
  await ctx.db
    .update(fundraisingPages)
    .set({ status: statusNou })
    .where(and(eq(fundraisingPages.id, id), eq(fundraisingPages.orgId, ctx.orgId)));
});

export type CreeazaPaginaAdminState = { error: string | null };

// Aceleași validări ca fluxul public (src/app/strangere-fonduri/[orgSlug]/creeaza),
// dar org_id vine direct din sesiunea autentificată — nu mai e nevoie de
// rezolvare prin slug/app.public_lookup. Folosit când organizația însăși vrea
// să pornească o pagină de campanie (nu doar susținătorii, prin link public).
export const creeazaPaginaAdminAction = withOrgAdmin(
  async (ctx, _prevState: CreeazaPaginaAdminState, formData: FormData): Promise<CreeazaPaginaAdminState> => {
    const str = (k: string) => String(formData.get(k) ?? "").trim();
    const numeCreator = str("numeCreator");
    const emailCreator = str("emailCreator");
    const titlu = str("titlu");
    const poveste = str("poveste");
    const sumaTintaRaw = str("sumaTinta");

    if (!numeCreator || !emailCreator || !titlu || !poveste) {
      return { error: "Completează toate câmpurile obligatorii." };
    }
    let sumaTinta: number | null = null;
    if (sumaTintaRaw) {
      const n = Math.round(Number(sumaTintaRaw));
      if (!Number.isFinite(n) || n <= 0) {
        return { error: "Suma țintă trebuie să fie un număr pozitiv." };
      }
      sumaTinta = n;
    }

    const baseSlug = slugify(titlu);
    const slug = await genereazaSlugUnic(baseSlug, async (candidat) => {
      const existing = await ctx.db
        .select({ id: fundraisingPages.id })
        .from(fundraisingPages)
        .where(and(eq(fundraisingPages.orgId, ctx.orgId), eq(fundraisingPages.slug, candidat)))
        .limit(1);
      return Boolean(existing[0]);
    });

    await ctx.db.insert(fundraisingPages).values({
      id: randomUUID(),
      orgId: ctx.orgId,
      slug,
      titlu,
      poveste,
      sumaTinta,
      numeCreator,
      emailCreator,
      // Pagină creată de organizație însăși (nu de un susținător extern) —
      // organizația e proprietara datelor publicate, nu un terț a cărui
      // consimțământ trebuie colectat separat.
      consimtamantGdpr: true,
    });

    return { error: null };
  },
);

export type EditeazaPaginaAdminState = { error: string | null };

// Editează câmpurile de bază ale unei pagini deja create — NU atinge slug-ul
// (link-ul public deja distribuit trebuie să rămână valid).
export const editeazaPaginaAdminAction = withOrgAdmin(
  async (ctx, pageId: string, _prevState: EditeazaPaginaAdminState, formData: FormData): Promise<EditeazaPaginaAdminState> => {
    const str = (k: string) => String(formData.get(k) ?? "").trim();
    const numeCreator = str("numeCreator");
    const emailCreator = str("emailCreator");
    const titlu = str("titlu");
    const poveste = str("poveste");
    const sumaTintaRaw = str("sumaTinta");

    if (!numeCreator || !emailCreator || !titlu || !poveste) {
      return { error: "Completează toate câmpurile obligatorii." };
    }
    let sumaTinta: number | null = null;
    if (sumaTintaRaw) {
      const n = Math.round(Number(sumaTintaRaw));
      if (!Number.isFinite(n) || n <= 0) {
        return { error: "Suma țintă trebuie să fie un număr pozitiv." };
      }
      sumaTinta = n;
    }

    const r = await ctx.db
      .update(fundraisingPages)
      .set({ titlu, poveste, sumaTinta, numeCreator, emailCreator })
      .where(and(eq(fundraisingPages.id, pageId), eq(fundraisingPages.orgId, ctx.orgId)))
      .returning({ id: fundraisingPages.id });
    if (!r[0]) return { error: "Pagina nu a fost găsită." };

    return { error: null };
  },
);

export type AdaugaActualizareState = { error: string | null };

// Postată de owner/admin, vizibilă public pe pagina campaniei (vezi
// fundraising_updates_public_select) — text simplu, fără poză (deferred
// până se configurează Supabase Storage).
export const adaugaActualizareAction = withOrgAdmin(
  async (ctx, _prevState: AdaugaActualizareState, formData: FormData): Promise<AdaugaActualizareState> => {
    const pageId = String(formData.get("pageId") ?? "").trim();
    const titlu = String(formData.get("titlu") ?? "").trim();
    const continut = String(formData.get("continut") ?? "").trim();

    if (!pageId || !titlu || !continut) {
      return { error: "Completează titlul și conținutul actualizării." };
    }

    const pagina = await ctx.db
      .select({ id: fundraisingPages.id })
      .from(fundraisingPages)
      .where(and(eq(fundraisingPages.id, pageId), eq(fundraisingPages.orgId, ctx.orgId)))
      .limit(1);
    if (!pagina[0]) return { error: "Pagina nu a fost găsită." };

    await ctx.db.insert(fundraisingUpdates).values({
      id: randomUUID(),
      pageId,
      orgId: ctx.orgId,
      titlu,
      continut,
    });

    return { error: null };
  },
);

// Ștergere actualizare — org_id filtrat explicit, defense-in-depth ca la
// stergePaginaStrangereFonduri.
export const stergeActualizareAction = withOrgAdmin(async (ctx, id: string) => {
  await ctx.db.delete(fundraisingUpdates).where(and(eq(fundraisingUpdates.id, id), eq(fundraisingUpdates.orgId, ctx.orgId)));
});

export type ImaginePaginaState = { error: string | null; ok: boolean };

// Poză copertă pentru pagina publică — încărcată aici (CRM, autentificat),
// nu din formularul public de creare, ca să nu deschidem upload anonim către
// storage. Refolosește bucket-ul "org-branding" (deja public + upload permis
// pentru useri autentificați), sub alt prefix de path decât logo-urile.
export const actualizeazaImaginePaginaAction = withOrgAdmin(
  async (ctx, pageId: string, _prevState: ImaginePaginaState, formData: FormData): Promise<ImaginePaginaState> => {
    const imagine = formData.get("imagine");
    if (!(imagine instanceof File) || imagine.size === 0) {
      return { error: "Alege o imagine.", ok: false };
    }
    if (imagine.size > 5 * 1024 * 1024) {
      return { error: "Imaginea e prea mare (max 5MB).", ok: false };
    }

    const pagina = await ctx.db
      .select({ id: fundraisingPages.id })
      .from(fundraisingPages)
      .where(and(eq(fundraisingPages.id, pageId), eq(fundraisingPages.orgId, ctx.orgId)))
      .limit(1);
    if (!pagina[0]) return { error: "Pagina nu a fost găsită.", ok: false };

    const supabase = await createClient();
    const ext = (imagine.type.split("/")[1] || "jpg").replace("svg+xml", "svg");
    const path = `${ctx.orgSlug}/campanie-${pageId}-${randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("org-branding").upload(path, imagine, {
      contentType: imagine.type,
      upsert: false,
    });
    if (uploadError) {
      return { error: "Încărcarea imaginii a eșuat: " + uploadError.message, ok: false };
    }
    const imagineUrl = supabase.storage.from("org-branding").getPublicUrl(path).data.publicUrl;

    await ctx.db.update(fundraisingPages).set({ imagineUrl }).where(eq(fundraisingPages.id, pageId));
    return { error: null, ok: true };
  },
);
