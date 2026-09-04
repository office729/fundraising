import { NextResponse } from "next/server";

import { withOrgSession } from "@/lib/auth/guard";
import { genereazaTokenVoceTwilio } from "@/lib/twilio";

type Ctx = { params: Promise<{ orgSlug: string }> };

// GET /api/[orgSlug]/twilio-token — Access Token pentru Twilio Voice SDK
// (browser). Autentificat prin sesiunea CRM normală (withOrgSession) —
// identity = org+user, ca apelurile să nu se poată confunda între organizații.
const obtineToken = withOrgSession(async (ctx) => {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    return NextResponse.json({ error: "twilio_neconfigurat" }, { status: 400 });
  }
  try {
    const token = genereazaTokenVoceTwilio(`${ctx.orgId}:${ctx.userId}`);
    return NextResponse.json({ token });
  } catch (e) {
    console.error("Eroare la generarea token-ului Twilio:", e);
    return NextResponse.json({ error: "twilio_neconfigurat" }, { status: 400 });
  }
});

export async function GET(req: Request, { params }: Ctx) {
  const { orgSlug } = await params;
  return obtineToken(orgSlug);
}
