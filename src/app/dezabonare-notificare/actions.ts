"use server";

import { linkNotificareValid, opreNotificare } from "@/lib/notificari-oprite";
import { DEZABONARE_UI_DICT } from "@/lib/i18n/dictionaries/dezabonare-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { raporteazaEroare } from "@/lib/monitoring";

export type DezabonareNotificareState = { ok: boolean; error: string | null };

// Dezabonarea se face doar la apăsarea butonului (POST), nu la deschiderea linkului: scanerele de e-mail deschid automat linkurile și ar dezabona oameni fără știrea lor.
export async function dezaboneazaNotificareAction(_prev: DezabonareNotificareState, formData: FormData): Promise<DezabonareNotificareState> {
  const er = DEZABONARE_UI_DICT[await getLocale()].notificare.erori;
  const tip = String(formData.get("tip") ?? "");
  const u = String(formData.get("u") ?? "");
  const t = String(formData.get("t") ?? "");
  if (!linkNotificareValid(tip, u, t)) return { ok: false, error: er.linkInvalid };
  try {
    await opreNotificare(u, tip);
  } catch (e) {
    raporteazaEroare("dezabonare-notificare", e);
    return { ok: false, error: er.nuProcesat };
  }
  return { ok: true, error: null };
}
