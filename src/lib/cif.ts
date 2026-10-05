import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

// Forma normalizată a CIF-ului (fără spații, fără prefixul RO, majuscule) — AceeaȘI
// expresie ca în indexul unic organizations_cif_norm_unique din baza de date.
export function normalizeazaCif(cif: string): string {
  return cif.replace(/\s+/g, "").toUpperCase().replace(/^RO/, "");
}

// true dacă ALTĂ organizație are deja acest CIF. Citire în context de încredere
// (app.public_lookup): politicile RLS ascund organizațiile străine, iar
// verificarea trebuie să le vadă. Nu întoarce nimic despre organizația găsită.
export async function cifFolositDeAltaOrganizatie(cif: string, organizatieCurentaId: string): Promise<boolean> {
  const norm = normalizeazaCif(cif);
  if (!norm) return false;
  const rows = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return tx.execute<{ id: string }>(sql`
      select id from organizations
      where upper(regexp_replace(regexp_replace(cif, '[[:space:]]', '', 'g'), '^RO', '', 'i')) = ${norm}
        and id <> ${organizatieCurentaId}
      limit 1
    `);
  });
  return rows.length > 0;
}

export const MESAJ_CIF_FOLOSIT =
  "Există deja o organizație cu acest CIF pe platformă. Dacă ești reprezentantul ei, scrie-ne la vlad.placinta@alexandrit.ro.";
