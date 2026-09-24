"use server";

import { dezaboneazaDonator, verificaLinkDezabonare } from "@/lib/dezabonare";

export type DezabonareState = { ok: boolean; error: string | null };

export async function dezaboneazaAction(_prev: DezabonareState, formData: FormData): Promise<DezabonareState> {
  const email = verificaLinkDezabonare(
    String(formData.get("o") ?? ""),
    String(formData.get("e") ?? ""),
    String(formData.get("t") ?? ""),
  );
  if (!email) return { ok: false, error: "Link invalid sau expirat." };
  try {
    await dezaboneazaDonator(String(formData.get("o")), email);
  } catch (e) {
    console.error("Eroare la dezabonare:", e);
    return { ok: false, error: "Nu am putut procesa cererea — încearcă din nou." };
  }
  return { ok: true, error: null };
}
