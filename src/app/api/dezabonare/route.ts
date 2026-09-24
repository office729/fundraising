import { NextResponse } from "next/server";

import { dezaboneazaDonator, verificaLinkDezabonare } from "@/lib/dezabonare";

// One-click unsubscribe (RFC 8058) — clientul de email (Gmail/Apple Mail) face
// POST direct pe URL-ul din antetul List-Unsubscribe, după apăsarea butonului
// „Dezabonare" din interfața lui. Aceeași semnătură ca linkul din corpul emailului.
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = verificaLinkDezabonare(searchParams.get("o"), searchParams.get("e"), searchParams.get("t"));
  if (!email) return NextResponse.json({ error: "link_invalid" }, { status: 400 });
  try {
    await dezaboneazaDonator(searchParams.get("o")!, email);
  } catch (e) {
    console.error("Eroare la dezabonare (one-click):", e);
    return NextResponse.json({ error: "eroare_temporara" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
