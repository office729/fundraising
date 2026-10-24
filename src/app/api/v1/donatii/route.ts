import { and, asc, eq, gt, gte } from "drizzle-orm";

import { esteUuid, limitaPagina } from "@/lib/api-publica";
import { donatiePentruApi } from "@/lib/api-publica-date";
import { raspuns, raspunsEroare, ruta } from "@/lib/api-publica-rute";
import { inOrgApi } from "@/lib/api-publica-server";
import { fundraisingDonations, fundraisingPages } from "@/lib/db/schema";

// GET /api/v1/donatii — donațiile reușite ale organizației, paginate cu cursor („dupa” = id-ul ultimei primite). Filtru opțional: ?de_la=2026-01-01 (data creării). Permisiune: donatii:citire.
export const GET = ruta("donatii:citire", async (req, cheie) => {
  const u = new URL(req.url);
  const limita = limitaPagina(u.searchParams.get("limit"));
  const dupa = u.searchParams.get("dupa");
  if (dupa && !esteUuid(dupa)) return raspunsEroare(400, "cursor_invalid", "Parametrul „dupa” trebuie să fie un id primit la pagina anterioară.");
  const deLaBrut = u.searchParams.get("de_la");
  let deLa: Date | null = null;
  if (deLaBrut) {
    deLa = /^\d{4}-\d{2}-\d{2}$/.test(deLaBrut) ? new Date(`${deLaBrut}T00:00:00Z`) : null;
    if (!deLa || Number.isNaN(deLa.getTime())) return raspunsEroare(400, "data_invalida", "Parametrul „de_la” trebuie să fie o dată de forma 2026-01-31.");
  }
  const randuri = await inOrgApi(cheie.orgId, (tx) =>
    tx
      .select({
        id: fundraisingDonations.id,
        createdAt: fundraisingDonations.createdAt,
        suma: fundraisingDonations.suma,
        status: fundraisingDonations.status,
        recurenta: fundraisingDonations.recurenta,
        emailDonator: fundraisingDonations.emailDonator,
        numeDonator: fundraisingDonations.numeDonator,
        campanie: fundraisingPages.titlu,
        campanieId: fundraisingDonations.pageId,
      })
      .from(fundraisingDonations)
      .leftJoin(fundraisingPages, eq(fundraisingPages.id, fundraisingDonations.pageId))
      .where(and(eq(fundraisingDonations.orgId, cheie.orgId), eq(fundraisingDonations.status, "reusita"), ...(dupa ? [gt(fundraisingDonations.id, dupa)] : []), ...(deLa ? [gte(fundraisingDonations.createdAt, deLa)] : [])))
      .orderBy(asc(fundraisingDonations.id))
      .limit(limita + 1),
  );
  const urmatoare = randuri.length > limita;
  const pagina = randuri.slice(0, limita);
  return raspuns({ data: pagina.map(donatiePentruApi), urmatorul: urmatoare ? pagina[pagina.length - 1].id : null });
});
