import { redirect } from "next/navigation";

// Toate fluxurile de plată (Checkout, Apple Pay/Google Pay, Revolut) se întorc aici. Donatorul nu vede o pagină separată: e adus
// automat înapoi pe pagina campaniei, unde apare popup-ul de mulțumire (vezi ../popup-multumire.tsx). Adresa rămâne valabilă pentru
// linkurile și redirecturile deja trimise.
export default async function MultumimPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; pageSlug: string }>;
  searchParams: Promise<{ session_id?: string; payment_intent?: string; redirect_status?: string }>;
}) {
  const { orgSlug, pageSlug } = await params;
  const { session_id, payment_intent, redirect_status } = await searchParams;
  const q = new URLSearchParams({ multumim: "1" });
  if (session_id) q.set("session_id", session_id);
  if (payment_intent) q.set("payment_intent", payment_intent);
  if (redirect_status) q.set("redirect_status", redirect_status);
  redirect(`/strangere-fonduri/${orgSlug}/${pageSlug}?${q.toString()}`);
}
