import "server-only";

import { emailConfigurat, trimiteEmail } from "@/lib/email";
import { raporteazaEroare } from "@/lib/monitoring";

import { compuneChestionarCuProblema, compuneSugestie, type ChestionarNou, type SugestieNoua } from "./notificare-continut";

// Anunță echipa platformei pe e-mail când vine feedback nou. Destinatar: FEEDBACK_EMAIL, altfel ALERTE_FACTURARE_EMAIL, altfel adresa implicită.
// Nu aruncă niciodată: un e-mail eșuat nu trebuie să piardă sau să strice feedbackul, care e deja salvat.
const destinatar = () => process.env.FEEDBACK_EMAIL || process.env.ALERTE_FACTURARE_EMAIL || "vlad.placinta@alexandrit.ro";
const linkPanou = () => `${(process.env.NEXT_PUBLIC_SITE_URL || "https://alexandrit.ro").replace(/\/+$/, "")}/platform-admin/feedback`;

async function trimite(zona: string, c: { subiect: string; html: string }): Promise<void> {
  try {
    if (!emailConfigurat()) return;
    await trimiteEmail({ to: destinatar(), subiect: c.subiect, html: c.html });
  } catch (e) {
    raporteazaEroare(zona, e);
  }
}

export const notificaSugestieNoua = (s: SugestieNoua) => trimite("feedback-notificare-sugestie", compuneSugestie(s, linkPanou()));
export const notificaChestionarCuProblema = (c: ChestionarNou) => trimite("feedback-notificare-chestionar", compuneChestionarCuProblema(c, linkPanou()));
