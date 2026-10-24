import "server-only";

import { sql } from "drizzle-orm";

import type { db } from "@/lib/db";
import { hashSuprimare } from "@/lib/dezabonare";
import { type StareAdresa } from "@/lib/igiena-email";

// Marcarea adreselor de e-mail ale donatorilor (respinsă / reclamată / în regulă) și a frecvenței dorite. Se apelează în contextul organizației (app.current_org_id setat),
// din trimiterile de e-mailuri (parcursuri, campania Formular 230) sau din fișa donatorului.
type Exec = Pick<typeof db, "execute">;

// Marchează adresa donatorului. Idempotent: prima dată a problemei se păstrează. „reclamat” intră și în lista de suprimare (nu mai primește nimic, nici dacă rândul e recreat);
// „respins” doar marchează donatorul (adresa se poate repara din fișă dacă s-a corectat între timp).
export async function marcheazaAdresa(exec: Exec, orgId: string, email: string, stare: StareAdresa, motiv: string | null): Promise<number> {
  const rez = (await exec.execute(sql`
    update donatori_reali set email_stare = ${stare}, email_stare_la = ${stare === "ok" ? sql`null` : sql`coalesce(email_stare_la, now())`}, email_stare_motiv = ${stare === "ok" ? null : motiv}
    where org_id = ${orgId} and lower(email) = ${email.trim().toLowerCase()} and email_stare <> ${stare}
    returning id`)) as unknown as unknown[];
  if (stare === "reclamat") {
    await exec.execute(sql`insert into email_suppression (org_id, email_hash, motiv) values (${orgId}, ${hashSuprimare(orgId, email)}, 'reclamatie') on conflict do nothing`);
  }
  return rez.length;
}
