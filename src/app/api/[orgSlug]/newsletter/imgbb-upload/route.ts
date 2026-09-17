import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { withOrgSession } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

// Newsletter PF/PJ cereau /api/newsletter/imgbb-upload — inexistentă aici
// (moștenită din SOI_CRM, unde ținta era serviciul extern imgbb.com, cu o
// cheie API separată). Nu mai avem nevoie de imgbb: platforma are deja
// Supabase Storage configurat și un bucket public de imagini ("campanii",
// vezi scripts/setup-storage.mjs) — refolosit aici, ca la logo-ul din Setări
// (setari/actions.ts). Tool-ul are deja fallback grațios dacă ruta lipsește
// sau eșuează (Newsman cere poza la lipire), deci acest fix e o îmbunătățire,
// nu o reparare de crash.
const BUCKET = "campanii";
const MAX_BYTES = 5 * 1024 * 1024;

type Ctx = { params: Promise<{ orgSlug: string }> };

const postUpload = withOrgSession(async (ctx, req: Request) => {
  let body: { image?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const b64 = typeof body.image === "string" ? body.image : "";
  if (!b64) return NextResponse.json({ error: "no_image" }, { status: 400 });

  const bytes = Buffer.from(b64, "base64");
  if (!bytes.length) return NextResponse.json({ error: "bad_image" }, { status: 400 });
  if (bytes.length > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 400 });

  const supabase = await createClient();
  const path = `newsletter/${ctx.orgId}/${randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (uploadError) return NextResponse.json({ error: "upload_failed" }, { status: 500 });

  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ url });
});

export async function POST(req: Request, { params }: Ctx) {
  const { orgSlug } = await params;
  return postUpload(orgSlug, req);
}
