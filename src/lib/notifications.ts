import "server-only";

import type { db as dbType } from "@/lib/db";
import { fundraisingNotifications } from "@/lib/db/schema";
import { emailConfigurat, trimiteEmail } from "@/lib/email";

// Creează o notificare in-app și, dacă emailul e configurat, trimite și un
// email best-effort (nu blochează/nu strică acțiunea principală dacă eșuează
// — de-asta e într-un try/catch separat, nu propagă eroarea).
export async function notifica(
  db: typeof dbType,
  params: { appUserId: string; tip: string; titlu: string; continut?: string; link?: string; email?: string | null },
): Promise<void> {
  await db.insert(fundraisingNotifications).values({
    appUserId: params.appUserId,
    tip: params.tip,
    titlu: params.titlu,
    continut: params.continut ?? null,
    link: params.link ?? null,
  });

  if (params.email && emailConfigurat()) {
    try {
      await trimiteEmail({
        to: params.email,
        subiect: params.titlu,
        html: `<p>${params.continut ?? params.titlu}</p>${params.link ? `<p><a href="${params.link}">Vezi detalii</a></p>` : ""}`,
      });
    } catch {
      // best-effort — un email eșuat nu trebuie să strice acțiunea principală
    }
  }
}
