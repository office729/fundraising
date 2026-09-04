import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import twilio from "twilio";

import { db } from "@/lib/db";
import { apeluri } from "@/lib/db/schema";

const STATUS_MAP: Record<string, "finalizat" | "esuat" | "fara_raspuns" | "ocupat"> = {
  completed: "finalizat",
  failed: "esuat",
  canceled: "esuat",
  "no-answer": "fara_raspuns",
  busy: "ocupat",
};

// Callback apelat de Twilio după ce apelul (verb <Dial>) se termină — vezi
// `action` din src/app/api/twilio/voice/route.ts. Rută PUBLICĂ, securizată
// prin semnătura Twilio.
export async function POST(req: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return NextResponse.json({ error: "twilio_neconfigurat" }, { status: 400 });

  const apelId = new URL(req.url).searchParams.get("apelId");
  if (!apelId) return NextResponse.json({ error: "apel_lipsa" }, { status: 400 });

  const semnatura = req.headers.get("x-twilio-signature");
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((v, k) => (params[k] = String(v)));

  if (!semnatura || !twilio.validateRequest(authToken, semnatura, req.url, params)) {
    return NextResponse.json({ error: "semnatura_invalida" }, { status: 403 });
  }

  const status = STATUS_MAP[params.DialCallStatus] ?? "esuat";
  const durata = params.DialCallDuration ? Number(params.DialCallDuration) : null;
  const callSid = params.DialCallSid || null;

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
      await tx
        .update(apeluri)
        .set({ status, durataSecunde: durata, twilioCallSid: callSid })
        .where(eq(apeluri.id, apelId));
    });
  } catch (e) {
    console.error("Eroare la actualizarea apelului:", e);
  }

  return new NextResponse("<Response></Response>", { headers: { "Content-Type": "text/xml" } });
}
