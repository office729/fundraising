import { redirect } from "next/navigation";

// Link vechi, distribuit înainte de conturile/subconturile multiple de
// Formular 230 — rămâne funcțional la nesfârșit, redirecționat către contul
// implicit "principal" (creat automat pentru orice organizație, vezi
// src/lib/formular230-constants.ts). Verificarea reală (organizație +
// beneficiar există) se face în [beneficiarSlug]/page.tsx.
export default async function Formular230PublicRedirect({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  redirect(`/f230/${orgSlug}/principal`);
}
