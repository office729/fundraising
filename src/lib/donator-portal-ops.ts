import type Stripe from "stripe";

// Operațiile unui donator lunar asupra propriului abonament, în contul Stripe al ONG-ului. Funcțiile primesc clientul Stripe,
// deci pot fi testate cu unul simulat; verificarea de proprietate (abonamentul aparține organizației ȘI adresei din link)
// se face aici, la fiecare operație, nu doar la afișare.

export const SUMA_MIN = 3;
export const SUMA_MAX = 50_000;

export type StareAbonament = "activ" | "pauza" | "oprit";
export type DescriereAbonament = { id: string; stare: StareAbonament; suma: number; moneda: string; urmatoarea: number | null; clientId: string | null };
export type Operatie = { tip: "suma"; suma: number } | { tip: "pauza" } | { tip: "reia" } | { tip: "opreste" };
export type CodEroare = "negasit" | "nu_e_al_tau" | "oprit" | "suma_invalida" | "moneda" | "stare" | "eroare";
export type RezultatOperatie = { ok: true; inainte: DescriereAbonament; dupa: DescriereAbonament } | { ok: false; cod: CodEroare };

const idDin = (ref: string | { id: string } | null | undefined): string | null => (ref ? (typeof ref === "string" ? ref : ref.id) : null);

export function esteAlDonatorului(sub: Stripe.Subscription, orgId: string, email: string): boolean {
  const md = sub.metadata ?? {};
  return md.orgId === orgId && (md.emailDonator ?? "").trim().toLowerCase() === email.trim().toLowerCase();
}

export function descrieAbonament(sub: Stripe.Subscription): DescriereAbonament {
  const item = sub.items?.data?.[0];
  // Versiunile noi ale API-ului mută sfârșitul perioadei pe elementul abonamentului; o citim din ambele locuri.
  const perioada = (item as unknown as { current_period_end?: number } | undefined)?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end ?? null;
  const stare: StareAbonament = sub.status === "canceled" ? "oprit" : sub.pause_collection ? "pauza" : "activ";
  return {
    id: sub.id,
    stare,
    suma: Math.round(((item?.price?.unit_amount ?? 0) * (item?.quantity ?? 1)) / 100),
    moneda: (item?.price?.currency ?? "ron").toLowerCase(),
    urmatoarea: stare === "activ" && perioada ? perioada * 1000 : null,
    clientId: idDin(sub.customer as string | { id: string } | null),
  };
}

export async function aplicaOperatie(stripe: Stripe, subId: string, orgId: string, email: string, op: Operatie): Promise<RezultatOperatie> {
  let sub: Stripe.Subscription;
  try {
    sub = await stripe.subscriptions.retrieve(subId);
  } catch {
    return { ok: false, cod: "negasit" };
  }
  if (!esteAlDonatorului(sub, orgId, email)) return { ok: false, cod: "nu_e_al_tau" };
  const inainte = descrieAbonament(sub);
  if (inainte.stare === "oprit") return { ok: false, cod: "oprit" };

  try {
    let nou: Stripe.Subscription;
    if (op.tip === "suma") {
      const suma = Math.round(op.suma);
      if (!Number.isFinite(suma) || suma < SUMA_MIN || suma > SUMA_MAX) return { ok: false, cod: "suma_invalida" };
      if (inainte.moneda !== "ron") return { ok: false, cod: "moneda" };
      const item = sub.items.data[0];
      const produs = idDin(item?.price?.product as string | { id: string } | null | undefined);
      if (!item || !produs) return { ok: false, cod: "eroare" };
      nou = await stripe.subscriptions.update(subId, {
        items: [{ id: item.id, price_data: { currency: "ron", product: produs, unit_amount: suma * 100, recurring: { interval: "month" } } }],
        proration_behavior: "none",
      });
    } else if (op.tip === "pauza") {
      if (inainte.stare === "pauza") return { ok: false, cod: "stare" };
      nou = await stripe.subscriptions.update(subId, { pause_collection: { behavior: "void" } });
    } else if (op.tip === "reia") {
      if (inainte.stare !== "pauza") return { ok: false, cod: "stare" };
      nou = await stripe.subscriptions.update(subId, { pause_collection: "" });
    } else {
      nou = await stripe.subscriptions.cancel(subId);
    }
    return { ok: true, inainte, dupa: descrieAbonament(nou) };
  } catch {
    return { ok: false, cod: "eroare" };
  }
}

// Pagina Stripe pe care donatorul își schimbă cardul. Configurația portalului (doar actualizarea metodei de plată) se creează o
// singură dată în contul ONG-ului și se regăsește după etichetă; restul funcțiilor portalului (anulare, istoric) rămân oprite,
// ca toate acțiunile să treacă prin pagina noastră și organizația să fie înștiințată.
export async function linkActualizareCard(stripe: Stripe, clientId: string, returnUrl: string): Promise<string | null> {
  try {
    const existente = await stripe.billingPortal.configurations.list({ limit: 20 });
    let configuratie = existente.data.find((c) => c.metadata?.alexandrit === "donator-card")?.id;
    if (!configuratie) {
      const noua = await stripe.billingPortal.configurations.create({
        features: {
          payment_method_update: { enabled: true },
          invoice_history: { enabled: false },
          customer_update: { enabled: false },
          subscription_cancel: { enabled: false },
          subscription_update: { enabled: false },
        },
        metadata: { alexandrit: "donator-card" },
      });
      configuratie = noua.id;
    }
    const sesiune = await stripe.billingPortal.sessions.create({
      customer: clientId,
      return_url: returnUrl,
      configuration: configuratie,
      flow_data: { type: "payment_method_update" },
    });
    return sesiune.url ?? null;
  } catch {
    return null;
  }
}
