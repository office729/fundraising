"use server";

import { eq, sql } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { raporteazaAvertisment, raporteazaEroare } from "@/lib/monitoring";
import { createClient } from "@/lib/supabase/server";

export type RezultatStergere = { error: string | null };

// Ștergerea DEFINITIVĂ a organizației și a tuturor datelor ei (contacte, donatori,
// campanii, plăți, invitații, membership-uri etc. — toate FK-urile din tabelele copil
// sunt ON DELETE CASCADE). Doar owner-ul, cu confirmare prin scrierea slug-ului
// organizației. Conturile de utilizator (app_users) NU se șterg — un utilizator poate
// aparține și altor organizații. Abonamentul se oprește odată cu rândul organizației
// (tokenul cardului dispare), dar o eventuală plată deja încasată nu se rambursează.
//
// Cascada ocolește RLS (verificările de integritate referențială nu o aplică), deci
// singura poartă de acces e politica organizations_owner_delete + verificarea de rol
// de aici. Fișierele din Storage (logo, poze, facturi) se șterg explicit, înaintea organizației.

// Șterge fișierele organizației din Storage (logo, poze de campanie, facturi, newsletter) — folderele
// `<slug>/` și `newsletter/<orgId>/` din bucket-ul org-branding. Rulează cu sesiunea owner-ului (politica
// org_branding_admin_delete); o eroare aici NU oprește ștergerea organizației, doar se raportează.
async function stergeFisiereOrganizatie(slug: string, orgId: string): Promise<number> {
  const supabase = await createClient();
  const bucket = supabase.storage.from("org-branding");
  const cai: string[] = [];

  async function colecteaza(prefix: string, adancime: number): Promise<void> {
    if (adancime > 4) return;
    const { data, error } = await bucket.list(prefix, { limit: 1000 });
    if (error || !data) throw error ?? new Error("list a eșuat");
    for (const intrare of data) {
      // Folderele vin fără `id`; fișierele au id.
      if (intrare.id) cai.push(`${prefix}/${intrare.name}`);
      else await colecteaza(`${prefix}/${intrare.name}`, adancime + 1);
    }
  }

  try {
    await colecteaza(slug, 0);
    await colecteaza(`newsletter/${orgId}`, 0);
    for (let i = 0; i < cai.length; i += 100) {
      const { error } = await bucket.remove(cai.slice(i, i + 100));
      if (error) throw error;
    }
    return cai.length;
  } catch (e) {
    raporteazaEroare("organizatie-stergere-storage", e, { orgId, orgSlug: slug });
    return 0;
  }
}

const stergeOrganizatia = withOrgSession(
  async (ctx, confirmare: string): Promise<void> => {
    if (ctx.role !== "owner") throw new EroareUtilizator("Doar owner-ul poate șterge organizația.");
    if (confirmare.trim() !== ctx.orgSlug) throw new EroareUtilizator("Confirmarea nu coincide cu numele organizației (slug).");

    // Organizațiile recomandate de aceasta păstrează o referință (FK fără cascadă) —
    // o anulăm înainte, în context de încredere, altfel ștergerea e blocată.
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
      await tx.update(organizations).set({ referredByOrgId: null }).where(eq(organizations.referredByOrgId, ctx.orgId));
    });

    // Plățile abonamentului (cu seria/numărul facturii) dispar în cascadă odată cu organizația, dar sunt evidență
    // contabilă: le copiem într-o arhivă fără cheie străină, în aceeași tranzacție ca ștergerea.
    await ctx.db.execute(sql`
      insert into platform_payments_arhiva (org_id, org_name, org_cif, order_id, package, suma_lei, status, created_at, paid_at, oblio_series_name, oblio_number, oblio_link)
      select p.org_id, ${ctx.orgName}, ${ctx.orgCif}, p.order_id, p.package::text, p.suma_lei, p.status::text, p.created_at, p.paid_at, p.oblio_series_name, p.oblio_number, p.oblio_link
      from platform_payments p where p.org_id = ${ctx.orgId}
      on conflict (order_id) do nothing`);

    // Fișierele din Storage se șterg ÎNAINTE de rândul organizației (politica verifică încă apartenența
    // owner-ului la organizație).
    const fisiereSterse = await stergeFisiereOrganizatie(ctx.orgSlug, ctx.orgId);

    const sters = await ctx.db.delete(organizations).where(eq(organizations.id, ctx.orgId)).returning({ id: organizations.id });
    if (!sters.length) throw new EroareUtilizator("Nu s-a putut șterge organizația.");

    // Urmă pentru audit — după ștergere nu mai rămâne nimic în baza de date.
    raporteazaAvertisment("organizatie-stearsa", "organizație ștearsă de owner", { orgId: ctx.orgId, orgSlug: ctx.orgSlug, userId: ctx.userId, fisiereSterse });
  },
  { permiteAccesBlocat: true },
);

export async function stergeOrganizatiaAction(orgSlug: string, confirmare: string): Promise<RezultatStergere> {
  try {
    await stergeOrganizatia(orgSlug, confirmare);
    return { error: null };
  } catch (e) {
    return { error: mesajSigur(e, "Nu am putut șterge organizația.", "organizatie-stergere") };
  }
}
