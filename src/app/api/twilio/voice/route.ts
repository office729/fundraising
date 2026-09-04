import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import twilio from "twilio";

import { db } from "@/lib/db";
import { apeluri } from "@/lib/db/schema";

// TwiML webhook apelat de Twilio când un agent inițiază un apel din browser
// (Twilio Voice SDK → device.connect({params: {...}})). Rută PUBLICĂ (Twilio
// nu are sesiune de utilizator) — securizată prin validarea semnăturii
// Twilio, NU prin autentificare CRM.
//
// ⚠️ org_id/user_id NU se citesc din parametrii custom trimiși de browser
// (companyId/catreNume rămân așa, dar acelea nu sunt folosite pentru izolare
// de tenant) — un client rău-intenționat ar putea trimite orice orgId prin
// device.connect(). În loc, le extragem din `From` (`client:<identity>`),
// unde identity = "orgId:userId" a fost stabilit server-side la generarea
// Access Token-ului (semnat, nefalsificabil) — vezi genereazaTokenVoceTwilio.
export async function POST(req: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const callerId = process.env.TWILIO_PHONE_NUMBER;
  if (!authToken || !callerId) {
    return NextResponse.json({ error: "twilio_neconfigurat" }, { status: 400 });
  }

  const semnatura = req.headers.get("x-twilio-signature");
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((v, k) => (params[k] = String(v)));

  if (!semnatura || !twilio.validateRequest(authToken, semnatura, req.url, params)) {
    return NextResponse.json({ error: "semnatura_invalida" }, { status: 403 });
  }

  const catre = params.To?.trim();
  const identity = params.From?.startsWith("client:") ? params.From.slice("client:".length) : "";
  const [orgId, initiatorId] = identity.split(":");
  if (!catre || !orgId) {
    return new NextResponse('<Response><Say language="ro-RO">Apel invalid.</Say></Response>', {
      status: 400,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const apelId = crypto.randomUUID();
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
      await tx.insert(apeluri).values({
        id: apelId,
        orgId,
        companyId: params.companyId || null,
        catreNume: params.catreNume || null,
        catreTelefon: catre,
        initiatorId: initiatorId || null,
        status: "sunand",
      });
    });
  } catch (e) {
    console.error("Eroare la înregistrarea apelului:", e);
    // Continuăm oricum — mai bine sună apelul fără jurnal, decât să pice.
  }

  const acasa = new URL(req.url).origin;
  const twiml = new twilio.twiml.VoiceResponse();
  const dial = twiml.dial({
    callerId,
    action: `${acasa}/api/twilio/voice-status?apelId=${apelId}`,
    method: "POST",
  });
  dial.number(catre);

  return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
}
