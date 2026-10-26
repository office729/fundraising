import "server-only";

import { raporteazaEroare } from "@/lib/monitoring";
import { createClient } from "@/lib/supabase/server";

// Șterge fișierele organizației din Storage: în org-branding (logo, poze de campanie, newsletter) folderele `<slug>/` și `newsletter/<orgId>/`,
// iar în bucket-ul privat org-docs-private (atașamente de granturi, documente de firme, facturi) folderul `<slug>/`. Rulează cu sesiunea
// utilizatorului curent (politicile de membru ale bucket-urilor): la ștergerea din panoul platformei, administratorul nu e membru, deci poate
// să nu vadă fișierele; o eroare aici NU oprește ștergerea organizației, doar se raportează — pe fiecare bucket separat. Întoarce câte fișiere au fost șterse.
export async function stergeFisiereOrganizatie(slug: string, orgId: string): Promise<number> {
  const supabase = await createClient();
  let total = 0;
  const bucketuri: [string, string[]][] = [
    ["org-branding", [slug, `newsletter/${orgId}`]],
    ["org-docs-private", [slug]],
  ];
  for (const [bucketId, prefixe] of bucketuri) {
    const bucket = supabase.storage.from(bucketId);
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
      for (const p of prefixe) await colecteaza(p, 0);
      for (let i = 0; i < cai.length; i += 100) {
        const { error } = await bucket.remove(cai.slice(i, i + 100));
        if (error) throw error;
      }
      total += cai.length;
    } catch (e) {
      raporteazaEroare("organizatie-stergere-storage", e, { orgId, orgSlug: slug, bucket: bucketId });
    }
  }
  return total;
}
