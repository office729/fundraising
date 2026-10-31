"use server";

import { dezaboneazaDonator, seteazaFrecventaDonator, verificaLinkDezabonare } from "@/lib/dezabonare";
import { DEZABONARE_UI_DICT } from "@/lib/i18n/dictionaries/dezabonare-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { raporteazaEroare } from "@/lib/monitoring";

export type DezabonareState = { ok: boolean; error: string | null; rezultat?: "deloc" | "rara" | "normala" };

// Pagina „Cât de des vrei mesaje”: persoana alege ca până acum, „mai rar” (cel mult un mesaj pe lună) sau „deloc”. Linkul semnat din e-mail e singura cheie de acces.
export async function dezaboneazaAction(_prev: DezabonareState, formData: FormData): Promise<DezabonareState> {
  const er = DEZABONARE_UI_DICT[await getLocale()].donator.erori;
  const orgId = String(formData.get("o") ?? "");
  const email = verificaLinkDezabonare(orgId, String(formData.get("e") ?? ""), String(formData.get("t") ?? ""));
  if (!email) return { ok: false, error: er.linkInvalid };
  const alegere = String(formData.get("alegere") ?? "deloc");
  if (alegere !== "deloc" && alegere !== "rara" && alegere !== "normala") return { ok: false, error: er.alegeVarianta };
  try {
    if (alegere === "deloc") await dezaboneazaDonator(orgId, email);
    else await seteazaFrecventaDonator(orgId, email, alegere);
  } catch (e) {
    raporteazaEroare("dezabonare", e);
    return { ok: false, error: er.nuProcesat };
  }
  return { ok: true, error: null, rezultat: alegere };
}
