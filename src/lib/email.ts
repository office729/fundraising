import "server-only";

import { Resend } from "resend";

// Inițializare LAZY (ca la Twilio/db) — conexiunea/clientul se creează la
// prima folosire, nu la evaluarea modulului, altfel `next build` ar pica
// fără RESEND_API_KEY disponibil. Complet inert până organizația/platforma
// primește o cheie reală — vezi EMAIL_FROM pentru domeniul de trimitere.
let cached: Resend | null = null;

function getResend(): Resend {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY lipsește din mediu — email-ul nu e configurat.");
  }
  cached = new Resend(apiKey);
  return cached;
}

export function emailConfigurat(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export type DestinatarEmail = { email: string; nume: string };

// Trimite câte un email individual fiecărui destinatar (nu un singur email cu
// toți în CC/BCC — fiecare donator își vede doar propriul nume). Resend
// acceptă trimiteri în lot (batch.send, până la 100/apel) — folosim asta
// pentru eficiență, dar în bucăți, ca liste mari să nu depășească limita.
export async function trimiteEmailuriInLot(params: {
  destinatari: DestinatarEmail[];
  subiect: (d: DestinatarEmail) => string;
  html: (d: DestinatarEmail) => string;
}): Promise<{ trimise: number; esuate: number }> {
  const resend = getResend();
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM lipsește din mediu.");

  const LOT = 100;
  let trimise = 0;
  let esuate = 0;

  for (let i = 0; i < params.destinatari.length; i += LOT) {
    const bucata = params.destinatari.slice(i, i + LOT);
    const { data, error } = await resend.batch.send(
      bucata.map((d) => ({
        from,
        to: d.email,
        subject: params.subiect(d),
        html: params.html(d),
      })),
    );
    if (error) {
      esuate += bucata.length;
      continue;
    }
    trimise += data?.data?.length ?? bucata.length;
    esuate += bucata.length - (data?.data?.length ?? bucata.length);
  }

  return { trimise, esuate };
}
