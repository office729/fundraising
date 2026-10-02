import { NextResponse } from "next/server";

import { cronAutorizat } from "@/lib/cron-auth";
import { emailConfigurat, trimiteEmail } from "@/lib/email";

export async function GET(req: Request) {
  if (!cronAutorizat(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!emailConfigurat()) return NextResponse.json({ error: "email_neconfigurat" }, { status: 501 });

  const to = new URL(req.url).searchParams.get("to");
  if (!to) return NextResponse.json({ error: "to_lipsa" }, { status: 400 });

  try {
    await trimiteEmail({
      to,
      subiect: "Test email Alexandrit (SMTP)",
      html: "<p>Acesta este un email de test trimis de platforma Alexandrit prin SMTP direct (alexandrit.ro). Dacă îl vezi în Inbox (nu în Spam), trimiterea funcționează.</p>",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, eroare: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
