import "server-only";

import { construiesteCerereInitSubscribe, interpreteazaRaspunsInit, type CredentialeNewsman, type RezultatAbonare } from "./newsman-api";

// Abonarea la newsletter prin Newsman, cu confirmare prin email (double opt-in). Credențialele sunt în mediu (Vercel): NEWSMAN_USER_ID, NEWSMAN_API_KEY, NEWSMAN_LIST_ID; cheia are
// acces „Limitat (doar import și abonare)” și nu se citește nicăieri altundeva. Lipsa lor înseamnă „abonare indisponibilă”, nu o eroare de aplicație.

export function credentialeNewsman(): CredentialeNewsman | null {
  const userId = process.env.NEWSMAN_USER_ID?.trim();
  const apiKey = process.env.NEWSMAN_API_KEY?.trim();
  const listId = process.env.NEWSMAN_LIST_ID?.trim();
  return userId && apiKey && listId ? { userId, apiKey, listId } : null;
}

export const abonareNewsmanDisponibila = () => credentialeNewsman() !== null;

export async function aboneazaNewsman(email: string, ip: string): Promise<RezultatAbonare | "indisponibil"> {
  const cred = credentialeNewsman();
  if (!cred) return "indisponibil";
  const { url, corp } = construiesteCerereInitSubscribe(cred, { email, ip });
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: corp, signal: AbortSignal.timeout(10_000), cache: "no-store" });
    const text = await r.text();
    const { rezultat, cod } = interpreteazaRaspunsInit(r.status, text);
    // Jurnal fără adresa cererii (conține cheia) și fără emailul vizitatorului: doar starea și codul Newsman.
    if (rezultat === "eroare" || rezultat === "ip_invalid") console.error(`[newsman] abonare eșuată: ${rezultat}, status HTTP ${r.status}${cod !== undefined ? `, cod ${cod}` : ""}`);
    return rezultat;
  } catch (e) {
    console.error(`[newsman] abonare eșuată: ${e instanceof Error ? e.name : "eroare necunoscută"}`);
    return "eroare";
  }
}
