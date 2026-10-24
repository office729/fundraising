import { and, eq } from "drizzle-orm";

import { autentificaApi } from "@/lib/api-publica-server";
import { esteUuid } from "@/lib/api-publica";
import { donatorPentruApi } from "@/lib/api-publica-date";
import { corpJson, raspuns, raspunsEroare } from "@/lib/api-publica-rute";
import { inOrgApi } from "@/lib/api-publica-server";
import { salveazaValori } from "@/lib/campuri-personalizate-server";
import { donatoriReali } from "@/lib/db/schema";
import { raporteazaEroare } from "@/lib/monitoring";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/v1/donatori/{id} — un donator. Permisiune: donatori:citire.
export async function GET(req: Request, { params }: Ctx) {
  try {
    const auth = await autentificaApi(req, "donatori:citire");
    if (!auth.ok) return raspunsEroare(auth.status, auth.cod, auth.mesaj);
    const { id } = await params;
    if (!esteUuid(id)) return raspunsEroare(404, "negasit", "Donatorul nu există.");
    const [d] = await inOrgApi(auth.cheie.orgId, (tx) => tx.select().from(donatoriReali).where(and(eq(donatoriReali.id, id), eq(donatoriReali.orgId, auth.cheie.orgId))).limit(1));
    return d ? raspuns({ data: donatorPentruApi(d) }) : raspunsEroare(404, "negasit", "Donatorul nu există.");
  } catch (e) {
    raporteazaEroare("api-v1", e);
    return raspunsEroare(500, "eroare_interna", "Eroare neașteptată. Încearcă din nou.");
  }
}

// PATCH /api/v1/donatori/{id} — corp: { "campuri": { "<cheie>": valoare, … } }. Modifică doar câmpurile personalizate active; o valoare goală (null sau "") o șterge.
// Restul datelor donatorului (nume, e-mail, acorduri) nu se schimbă prin API. Permisiune: donatori:scriere.
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const auth = await autentificaApi(req, "donatori:scriere");
    if (!auth.ok) return raspunsEroare(auth.status, auth.cod, auth.mesaj);
    const { id } = await params;
    if (!esteUuid(id)) return raspunsEroare(404, "negasit", "Donatorul nu există.");
    const corp = await corpJson(req);
    const campuri = corp?.campuri;
    if (!campuri || typeof campuri !== "object" || Array.isArray(campuri)) return raspunsEroare(400, "corp_invalid", "Trimite un obiect JSON de forma { \"campuri\": { \"cheie\": \"valoare\" } }.");
    const rez = await inOrgApi(auth.cheie.orgId, async (tx) => {
      const r = await salveazaValori(tx, auth.cheie.orgId, "donator", id, campuri as Record<string, unknown>);
      if (!r.ok) return { r };
      const [d] = await tx.select().from(donatoriReali).where(and(eq(donatoriReali.id, id), eq(donatoriReali.orgId, auth.cheie.orgId))).limit(1);
      return { r, d };
    });
    if (!rez.r.ok) {
      if (rez.r.mesaj.includes("nu a fost găsit")) return raspunsEroare(404, "negasit", "Donatorul nu există.");
      return raspuns({ eroare: { cod: "valori_invalide", mesaj: rez.r.mesaj, campuri: rez.r.erori } }, 422);
    }
    return raspuns({ data: rez.d ? donatorPentruApi(rez.d) : null });
  } catch (e) {
    raporteazaEroare("api-v1", e);
    return raspunsEroare(500, "eroare_interna", "Eroare neașteptată. Încearcă din nou.");
  }
}
