import "server-only";

import { eq } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { platformPayments } from "@/lib/db/schema";
import { proceseazaRezultatPlataNetopia } from "@/lib/billing/netopia-confirm";
import { interogheazaStatus } from "@/lib/netopia";
import { raporteazaEroare } from "@/lib/monitoring";

const CAMPURI_PLATA = {
  orderId: platformPayments.orderId,
  status: platformPayments.status,
  sumaLei: platformPayments.sumaLei,
  pachet: platformPayments.package,
  facturaLink: platformPayments.oblioLink,
  facturaNumar: platformPayments.oblioNumber,
  ntpId: platformPayments.ntpId,
};

// Starea unei plăți de abonament, doar pentru membrii organizației (RLS pe
// org_id prin ctx.db) — pagina de rezultat nu decide nimic ea însăși, doar
// arată ce a hotărât deja proceseazaRezultatPlataNetopia (IPN-ul verificat,
// SAU — fallback, mai jos — o interogare activă a statusului).
// permiteAccesBlocat: clientul ajunge aici chiar după plată, când IPN-ul poate
// să nu fi sosit încă — organizația e încă „blocată" și trebuie să-și vadă plata.
export const citestePlata = withOrgSession(
  async (ctx, orderId: string) => {
    const rows = await ctx.db
      .select(CAMPURI_PLATA)
      .from(platformPayments)
      .where(eq(platformPayments.orderId, orderId))
      .limit(1);
    const plata = rows[0] ?? null;
    if (!plata || plata.status !== "in_asteptare" || !plata.ntpId) return plata;

    // Fallback: dacă IPN-ul întârzie sau nu ajunge deloc, interogăm direct
    // statusul la Netopia (cerere pornită de NOI, autentificată cu API key-ul
    // nostru — nu depinde de verificarea semnăturii JWT a IPN-ului) și, dacă
    // avem un rezultat decis, îl confirmăm prin ACEEAȘI funcție ca IPN-ul.
    // Best-effort: o eroare aici nu trebuie să strice afișarea paginii —
    // rămâne „în așteptare", iar AutoRefresh mai încearcă la reîncărcarea următoare.
    try {
      const rezultat = await interogheazaStatus({ orderId, ntpId: plata.ntpId });
      if (rezultat) {
        await proceseazaRezultatPlataNetopia(orderId, rezultat);
        const dupa = await ctx.db.select(CAMPURI_PLATA).from(platformPayments).where(eq(platformPayments.orderId, orderId)).limit(1);
        return dupa[0] ?? plata;
      }
    } catch (e) {
      raporteazaEroare("netopia-status-fallback", e, { orderId });
    }
    return plata;
  },
  { permiteAccesBlocat: true },
);
