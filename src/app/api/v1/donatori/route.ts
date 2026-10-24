import { and, asc, eq, gt, sql } from "drizzle-orm";

import { esteUuid, limitaPagina } from "@/lib/api-publica";
import { donatorPentruApi } from "@/lib/api-publica-date";
import { raspuns, raspunsEroare, ruta } from "@/lib/api-publica-rute";
import { inOrgApi } from "@/lib/api-publica-server";
import { donatoriReali } from "@/lib/db/schema";

// GET /api/v1/donatori — lista donatorilor organizației, paginată cu cursor („dupa” = id-ul ultimului primit). Filtru opțional: ?email=. Permisiune: donatori:citire.
export const GET = ruta("donatori:citire", async (req, cheie) => {
  const u = new URL(req.url);
  const limita = limitaPagina(u.searchParams.get("limit"));
  const dupa = u.searchParams.get("dupa");
  if (dupa && !esteUuid(dupa)) return raspunsEroare(400, "cursor_invalid", "Parametrul „dupa” trebuie să fie un id primit la pagina anterioară.");
  const email = u.searchParams.get("email")?.trim().toLowerCase().slice(0, 320) || null;
  const randuri = await inOrgApi(cheie.orgId, (tx) =>
    tx
      .select()
      .from(donatoriReali)
      .where(and(eq(donatoriReali.orgId, cheie.orgId), ...(dupa ? [gt(donatoriReali.id, dupa)] : []), ...(email ? [sql`lower(${donatoriReali.email}) = ${email}`] : [])))
      .orderBy(asc(donatoriReali.id))
      .limit(limita + 1),
  );
  const urmatoare = randuri.length > limita;
  const pagina = randuri.slice(0, limita);
  return raspuns({ data: pagina.map(donatorPentruApi), urmatorul: urmatoare ? pagina[pagina.length - 1].id : null });
});
