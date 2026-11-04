import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { raporteazaEroare } from "@/lib/monitoring";

// Pixel de deschidere pentru emailurile agentului (GIF 1×1 transparent), activat opțional de administrator. PUBLIC: destinatarul nu e autentificat, iar adresa se termină în „.gif”,
// deci nu trece prin gate-ul de sesiune. Fără organizație în context, tokenul din adresă (32 de caractere hex, imposibil de ghicit) trece prin GUC-ul app.agent_pixel:
// politica RLS lasă să se vadă și să se actualizeze doar rândul cu acel token. Ignorăm primele 60 de secunde după trimitere (scanerele antivirus ale serverelor de mail „deschid” imediat).
// Semnal orientativ: unii destinatari blochează imaginile, iar Apple Mail le preîncarcă; „nedeschis” nu înseamnă sigur că nu a citit.
export const dynamic = "force-dynamic";

const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
const raspuns = () => new Response(new Uint8Array(PIXEL), { headers: { "content-type": "image/gif", "cache-control": "no-store, no-cache, must-revalidate, private", "content-length": String(PIXEL.length) } });

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = (id || "").replace(/\.gif$/i, "");
  if (!/^[a-f0-9]{32}$/.test(token)) return raspuns();
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.agent_pixel', ${token}, true)`);
      await tx.execute(sql`
        update agent_email_mesaje set
          deschis_prima = coalesce(deschis_prima, now()),
          deschis_ultima = now(),
          deschis_nr = deschis_nr + 1
        where pixel = ${token} and stare = 'trimis' and trimis_la < now() - interval '60 seconds'`);
    });
  } catch (e) {
    // Pixelul se servește oricum; eroarea se raportează, nu se arată destinatarului.
    raporteazaEroare("agent-email-pixel", e);
  }
  return raspuns();
}
