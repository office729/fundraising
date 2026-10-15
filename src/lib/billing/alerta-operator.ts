import "server-only";

import { verificaLimitaRata } from "@/lib/auth/rate-limit";
import { emailConfigurat, trimiteEmail } from "@/lib/email";
import { raporteazaEroare } from "@/lib/monitoring";

// Alertă către operatorul platformei (acum: ALERTE_FACTURARE_EMAIL, altfel adresa implicită), cel mult o dată pe zi pentru aceeași cheie.
// Nu aruncă niciodată: o alertă eșuată nu trebuie să strice fluxul de plată care a declanșat-o.
export async function alertaOperatorZilnic(cheie: string, subiect: string, html: string): Promise<void> {
  try {
    if (!emailConfigurat()) return;
    if (!(await verificaLimitaRata("alerta-operator", cheie, 1, 24 * 60))) return;
    await trimiteEmail({ to: process.env.ALERTE_FACTURARE_EMAIL || "vlad.placinta@alexandrit.ro", subiect, html });
  } catch (e) {
    raporteazaEroare("alerta-operator", e, { cheie });
  }
}
