import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { withOrgSession } from "@/lib/auth/guard";
import { verificaLimitaRata } from "@/lib/auth/rate-limit";
import { crmKv } from "@/lib/db/schema";
import { emailConfigurat, trimiteEmail, trimiteEmailuriInLot } from "@/lib/email";
import { escHtml } from "@/lib/html-escape";

// Trimitere reală (email, prin Resend) pentru CRM Voluntari — înlocuiește
// ruta veche /api/voluntari-send (inexistentă aici, moștenită neschimbată din
// SOI_CRM). WhatsApp NU e conectat (ar cere Twilio WhatsApp + șablon aprobat,
// separat de asta) — răspundem onest cu eroare, nu pretindem succes.
type Volunteer = { id: string; nume: string; activ: boolean; vreaEmail: boolean; email: string; grup: string; tip: string };
type Audience = {
  mode?: string;
  doarActivi?: boolean;
  doarConsimtit?: boolean;
  grupuri?: string[];
  tip?: string;
  selectedIds?: string[];
};

// Oglindă exactă a recipientsFor(canal) din crm-voluntari.base.html, pentru
// cazul (rar) în care tool-ul trimite doar `audience`, fără `contacte`
// explicite (butonul de trimitere din panoul de Automatizare) — cererile cu
// `contacte` explicite (mesaj individual / mesaj în masă din listă) nu trec
// pe-aici.
function resolveAudience(volunteers: Volunteer[], audience: unknown): Volunteer[] {
  const a = (audience && typeof audience === "object" ? audience : {}) as Audience;
  const hasEmail = (v: Volunteer) => !!v.email;
  if (a.mode === "manual") {
    const ids = new Set(Array.isArray(a.selectedIds) ? a.selectedIds : []);
    return volunteers.filter((v) => ids.has(v.id) && hasEmail(v));
  }
  return volunteers.filter((v) => {
    if (a.doarActivi && !v.activ) return false;
    if (a.doarConsimtit && !v.vreaEmail) return false;
    if (a.grupuri && a.grupuri.length && !a.grupuri.includes(v.grup)) return false;
    if (a.tip && v.tip !== a.tip) return false;
    return hasEmail(v);
  });
}

function buildHtml(continut: string, semnatura: string): string {
  const corp = escHtml(continut).replace(/\n/g, "<br>");
  const sig = semnatura.trim() ? `<p>${escHtml(semnatura).replace(/\n/g, "<br>")}</p>` : "";
  return `<div>${corp}</div>${sig}`;
}

const MAX_DESTINATARI = 500;

type Ctx = { params: Promise<{ orgSlug: string }> };

const postSend = withOrgSession(async (ctx, req: Request) => {
  let body: {
    canal?: string;
    audience?: unknown;
    test?: boolean;
    subiect?: string;
    continut?: string;
    semnatura?: string;
    contacte?: unknown[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  if (body.canal === "whatsapp") {
    return NextResponse.json({ ok: false, error: "WhatsApp nu e conectat încă — necesită integrare Twilio/Make." });
  }
  if (!emailConfigurat()) {
    return NextResponse.json({ ok: false, error: "Trimiterea de email nu e configurată pentru platformă." });
  }

  // Fără CR/LF în subiect (header injection) și limite de lungime.
  const subiect = (typeof body.subiect === "string" ? body.subiect : "").replace(/[\r\n]+/g, " ").slice(0, 200);
  const continut = (typeof body.continut === "string" ? body.continut : "").slice(0, 20_000);
  const semnatura = (typeof body.semnatura === "string" ? body.semnatura : "").slice(0, 2_000);
  if (!continut.trim()) {
    return NextResponse.json({ ok: false, error: "Scrie mesajul (subiect + conținut)." });
  }

  // Destinatarii se rezolvă DOAR din rosterul de voluntari al organizației
  // (crm_kv "voluntari-roster"), niciodată din adrese trimise de client — altfel
  // orice membru ar putea folosi expeditorul platformei (EMAIL_FROM) ca releu de
  // spam/phishing către adrese arbitrare.
  const rows = await ctx.db
    .select({ data: crmKv.data })
    .from(crmKv)
    .where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, "voluntari-roster")))
    .limit(1);
  const volunteers = ((rows[0]?.data as { volunteers?: Volunteer[] } | undefined)?.volunteers ?? []) as Volunteer[];

  let selectati: Volunteer[];
  if (Array.isArray(body.contacte) && body.contacte.length) {
    const dupaEmail = new Map(volunteers.filter((v) => v.email).map((v) => [v.email.trim().toLowerCase(), v]));
    selectati = body.contacte
      .map((c) => dupaEmail.get(String((c as Record<string, unknown>).email || "").trim().toLowerCase()))
      .filter((v): v is Volunteer => Boolean(v));
  } else {
    selectati = resolveAudience(volunteers, body.audience);
  }
  // Mesaj în masă: doar voluntarii care au acceptat emailuri (vreaEmail) —
  // consimțământul se aplică server-side, nu depinde de ce trimite clientul.
  // Un singur destinatar (mesaj individual) rămâne permis.
  if (selectati.length > 1) selectati = selectati.filter((v) => v.vreaEmail);
  let destinatari = [...new Map(selectati.map((v) => [v.email.trim().toLowerCase(), { email: v.email.trim(), nume: v.nume }])).values()];

  if (body.test) {
    destinatari = [{ email: ctx.userEmail, nume: ctx.userName || ctx.userEmail }];
  }
  if (!destinatari.length) {
    return NextResponse.json({ ok: false, error: "Niciun destinatar valid pentru email." });
  }
  if (destinatari.length > MAX_DESTINATARI) {
    return NextResponse.json({ ok: false, error: `Prea mulți destinatari într-o trimitere (maxim ${MAX_DESTINATARI}).` });
  }
  // Plafon per organizație: cel mult 20 de trimiteri pe oră (testele către
  // propria adresă nu contează).
  if (!body.test && !(await verificaLimitaRata("voluntari-send", ctx.orgId, 20, 60))) {
    return NextResponse.json({ ok: false, error: "Prea multe trimiteri într-o oră — încearcă mai târziu." }, { status: 429 });
  }

  const html = buildHtml(continut, semnatura);
  try {
    if (destinatari.length === 1) {
      await trimiteEmail({ to: destinatari[0].email, subiect, html });
      return NextResponse.json({ ok: true, total: 1 });
    }
    const { trimise } = await trimiteEmailuriInLot({
      destinatari,
      subiect: () => subiect,
      html: () => html,
    });
    if (!trimise) return NextResponse.json({ ok: false, error: "Trimiterea a eșuat." });
    return NextResponse.json({ ok: true, total: trimise });
  } catch {
    return NextResponse.json({ ok: false, error: "Trimiterea a eșuat." });
  }
});

export async function POST(req: Request, { params }: Ctx) {
  const { orgSlug } = await params;
  return postSend(orgSlug, req);
}
