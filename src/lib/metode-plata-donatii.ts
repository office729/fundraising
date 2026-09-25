import "server-only";

import { cursEurRon } from "@/lib/curs-valutar";
import { stripeOrgDupaSlug } from "@/lib/org-stripe";

// Ce metode de plată cu redirect are voie să afișeze pagina publică a unei
// organizații: Revolut Pay (RON) și PayPal (doar EUR, deci și un curs valutar).
// Calculat pe SERVER, la randarea paginii — rândurile apar odată cu pagina, nu după
// încărcare, ca Google Pay / Apple Pay. Reținut 10 minute în memorie per organizație
// (2 minute dacă lipsește cursul, ca PayPal să reapară repede după o defecțiune).
export type MetodeRedirect = { revolut: boolean; paypal: boolean; cursEur: number | null };

const NICIUNA: MetodeRedirect = { revolut: false, paypal: false, cursEur: null };
const CACHE = new Map<string, { la: number; ttl: number; valoare: MetodeRedirect }>();

async function pornite(orgSlug: string): Promise<{ revolut: boolean; paypal: boolean }> {
  try {
    const stripeOrg = await stripeOrgDupaSlug(orgSlug);
    if (!stripeOrg) return { revolut: false, paypal: false };
    const configuratii = await stripeOrg.stripe.paymentMethodConfigurations.list({ limit: 20 });
    const activ = (metoda: "revolut_pay" | "paypal") =>
      configuratii.data.some((c) => c.active && c[metoda]?.available === true && c[metoda].display_preference?.value === "on");
    return { revolut: activ("revolut_pay"), paypal: activ("paypal") };
  } catch (e) {
    console.error("verificare metode de plată cu redirect:", e);
    return { revolut: false, paypal: false };
  }
}

export async function metodeRedirect(orgSlug: string): Promise<MetodeRedirect> {
  const cached = CACHE.get(orgSlug);
  if (cached && Date.now() - cached.la < cached.ttl) return cached.valoare;

  // Cererea către Stripe și cursul rulează în paralel.
  const [p, curs] = await Promise.all([pornite(orgSlug), cursEurRon()]);
  const valoare: MetodeRedirect = { revolut: p.revolut, paypal: p.paypal && curs !== null, cursEur: curs };
  if (CACHE.size > 500) CACHE.clear();
  CACHE.set(orgSlug, { la: Date.now(), ttl: curs === null ? 2 * 60_000 : 10 * 60_000, valoare });
  return valoare;
}

export { NICIUNA as FARA_METODE_REDIRECT };
