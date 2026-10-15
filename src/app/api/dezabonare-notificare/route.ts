import { NextResponse } from "next/server";

import { raporteazaEroare } from "@/lib/monitoring";
import { linkNotificareValid, opreNotificare } from "@/lib/notificari-oprite";

// Dezabonare cu un clic (RFC 8058): clientul de e-mail (Gmail, Apple Mail) face POST direct pe adresa din antetul List-Unsubscribe, după ce
// utilizatorul apasă „Dezabonare”. Aceeași semnătură ca linkul din corpul e-mailului.
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const tip = searchParams.get("tip");
  const u = searchParams.get("u");
  if (!linkNotificareValid(tip, u, searchParams.get("t"))) return NextResponse.json({ error: "link_invalid" }, { status: 400 });
  try {
    await opreNotificare(u!, tip);
  } catch (e) {
    raporteazaEroare("dezabonare-notificare-one-click", e);
    return NextResponse.json({ error: "eroare_temporara" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
