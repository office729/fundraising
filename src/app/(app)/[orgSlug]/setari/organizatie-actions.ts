"use server";

import { eq, sql } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { raporteazaAvertisment } from "@/lib/monitoring";

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
// de aici. Fișierele încărcate în Storage (logo, poze) NU se șterg automat.
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

    const sters = await ctx.db.delete(organizations).where(eq(organizations.id, ctx.orgId)).returning({ id: organizations.id });
    if (!sters.length) throw new EroareUtilizator("Nu s-a putut șterge organizația.");

    // Urmă pentru audit — după ștergere nu mai rămâne nimic în baza de date.
    raporteazaAvertisment("organizatie-stearsa", "organizație ștearsă de owner", { orgId: ctx.orgId, orgSlug: ctx.orgSlug, userId: ctx.userId });
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
