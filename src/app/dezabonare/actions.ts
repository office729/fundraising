"use server";

import { dezaboneazaDonator, seteazaFrecventaDonator, verificaLinkDezabonare } from "@/lib/dezabonare";
import { raporteazaEroare } from "@/lib/monitoring";

export type DezabonareState = { ok: boolean; error: string | null; rezultat?: "deloc" | "rara" | "normala" };

// Pagina „Cât de des vrei mesaje”: persoana alege ca până acum, „mai rar” (cel mult un mesaj pe lună) sau „deloc”. Linkul semnat din e-mail e singura cheie de acces.
export async function dezaboneazaAction(_prev: DezabonareState, formData: FormData): Promise<DezabonareState> {
  const orgId = String(formData.get("o") ?? "");
  const email = verificaLinkDezabonare(orgId, String(formData.get("e") ?? ""), String(formData.get("t") ?? ""));
  if (!email) return { ok: false, error: "Link invalid sau expirat." };
  const alegere = String(formData.get("alegere") ?? "deloc");
  if (alegere !== "deloc" && alegere !== "rara" && alegere !== "normala") return { ok: false, error: "Alege una dintre variante." };
  try {
    if (alegere === "deloc") await dezaboneazaDonator(orgId, email);
    else await seteazaFrecventaDonator(orgId, email, alegere);
  } catch (e) {
    raporteazaEroare("dezabonare", e);
    return { ok: false, error: "Nu am putut procesa cererea — încearcă din nou." };
  }
  return { ok: true, error: null, rezultat: alegere };
}
