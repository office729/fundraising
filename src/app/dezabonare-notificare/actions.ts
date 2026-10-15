"use server";

import { linkNotificareValid, opreNotificare } from "@/lib/notificari-oprite";
import { raporteazaEroare } from "@/lib/monitoring";

export type DezabonareNotificareState = { ok: boolean; error: string | null };

// Dezabonarea se face doar la apăsarea butonului (POST), nu la deschiderea linkului: scanerele de e-mail deschid automat linkurile și ar dezabona oameni fără știrea lor.
export async function dezaboneazaNotificareAction(_prev: DezabonareNotificareState, formData: FormData): Promise<DezabonareNotificareState> {
  const tip = String(formData.get("tip") ?? "");
  const u = String(formData.get("u") ?? "");
  const t = String(formData.get("t") ?? "");
  if (!linkNotificareValid(tip, u, t)) return { ok: false, error: "Link invalid sau expirat." };
  try {
    await opreNotificare(u, tip);
  } catch (e) {
    raporteazaEroare("dezabonare-notificare", e);
    return { ok: false, error: "Nu am putut procesa cererea. Încearcă din nou." };
  }
  return { ok: true, error: null };
}
