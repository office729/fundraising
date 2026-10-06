import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { withOrgFaze, type OrgContext } from "@/lib/auth/guard";
import { esteAbonamentPlatit, isPlatformAdmin } from "@/lib/billing/trial";
import { verificaLimitaRata } from "@/lib/auth/rate-limit";
import { crmKv, emailSuppression } from "@/lib/db/schema";
import { hashSuprimare, linkDezabonare } from "@/lib/dezabonare";
import { emailConfigurat, trimiteEmail, trimiteEmailuriInLot } from "@/lib/email";
import { anteteDezabonare } from "@/lib/formular230-email-template";
import { escHtml } from "@/lib/html-escape";
import { raporteazaEroare } from "@/lib/monitoring";

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
const MAX_EMAILURI_ZI = 1000;

type Ctx = { params: Promise<{ orgSlug: string }> };

type Pregatit = { destinatari: { email: string; nume: string }[]; subiect: string; html: string; orgId: string; orgName: string; masa: boolean };

// Faza 1 (în tranzacție, scurtă): validări, roster, limite. Întoarce un răspuns gata (eroare) SAU datele de trimis.
async function pregateste(ctx: OrgContext, req: Request): Promise<NextResponse | Pregatit> {
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
  // Trimiterea în masă din numele platformei (expeditor comun) e rezervată
  // owner/admin ai organizațiilor cu abonament: rosterul de voluntari e
  // editabil de orice membru, deci un cont de probă ar putea folosi ruta ca
  // releu de spam. Testul către propria adresă rămâne permis tuturor.
  if (!body.test) {
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Doar administratorii organizației pot trimite emailuri în masă." }, { status: 403 });
    }
    if (!esteAbonamentPlatit({ subscriptionStatus: ctx.orgSubscriptionStatus, currentPeriodEnd: ctx.orgCurrentPeriodEnd }) && !isPlatformAdmin(ctx.userEmail)) {
      return NextResponse.json({ ok: false, error: "Trimiterea de emailuri către voluntari e disponibilă după alegerea unui pachet." }, { status: 403 });
    }
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
  // Cine s-a dezabonat dintr-un mesaj anterior (lista de suprimare a organizației) nu mai primește mesaje în masă.
  const masa = !body.test && destinatari.length > 1;
  if (masa) {
    const suprimati = new Set((await ctx.db.select({ h: emailSuppression.emailHash }).from(emailSuppression).where(eq(emailSuppression.orgId, ctx.orgId))).map((r) => r.h));
    destinatari = destinatari.filter((d) => !suprimati.has(hashSuprimare(ctx.orgId, d.email)));
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
  // Plafon zilnic pe cantitate (emailuri, nu cereri) — expeditorul e comun, deci
  // volumul unei organizații afectează reputația tuturor.
  if (!body.test && !(await verificaLimitaRata("voluntari-emailuri-zi", ctx.orgId, MAX_EMAILURI_ZI, 24 * 60, destinatari.length))) {
    return NextResponse.json({ ok: false, error: `Ai atins limita zilnică de ${MAX_EMAILURI_ZI} emailuri către voluntari — încearcă mâine.` }, { status: 429 });
  }

  return { destinatari, subiect, html: buildHtml(continut, semnatura), orgId: ctx.orgId, orgName: ctx.orgName, masa };
}

// Faza 2: trimiterea propriu-zisă (până la 500 de emailuri, secvențial) — FĂRĂ conexiune DB deschisă. Înainte, toată
// trimiterea rula în tranzacția acțiunii și ținea o conexiune din pool minute în șir.
async function trimite({ destinatari, subiect, html, orgId, orgName, masa }: Pregatit): Promise<NextResponse> {
  try {
    if (destinatari.length === 1) {
      await trimiteEmail({ to: destinatari[0].email, subiect, html });
      return NextResponse.json({ ok: true, total: 1 });
    }
    // Mesajele în masă pleacă de la expeditorul comun al platformei: fiecare are link de dezabonare (semnat, per
    // destinatar) și antetele List-Unsubscribe (RFC 8058) — cum cer textele noastre și legea (comunicări comerciale).
    const baza = (process.env.NEXT_PUBLIC_SITE_URL || "https://alexandrit.ro").replace(/\/$/, "");
    const { trimise } = await trimiteEmailuriInLot({
      destinatari,
      subiect: () => subiect,
      html: masa
        ? (d) =>
            `${html}<p style="margin-top:24px;font-size:12px;color:#94a3b8;">Primești acest mesaj de la ${escHtml(orgName)}. <a href="${linkDezabonare(baza, orgId, d.email)}" style="color:#94a3b8;">Nu mai vreau emailuri de la această organizație</a>.</p>`
        : () => html,
      ...(masa ? { headers: (d: { email: string }) => anteteDezabonare(linkDezabonare(baza, orgId, d.email)) } : {}),
    });
    if (!trimise) return NextResponse.json({ ok: false, error: "Trimiterea a eșuat." });
    return NextResponse.json({ ok: true, total: trimise });
  } catch (e) {
    raporteazaEroare("voluntari-send", e, { orgId });
    return NextResponse.json({ ok: false, error: "Trimiterea a eșuat." });
  }
}

const postSend = withOrgFaze<[Request], Pregatit, NextResponse, NextResponse>({
  pregateste: async (ctx, req) => {
    const r = await pregateste(ctx, req);
    return r instanceof NextResponse ? { gata: r } : { pregatit: r };
  },
  extern: trimite,
});

export async function POST(req: Request, { params }: Ctx) {
  const { orgSlug } = await params;
  return postSend(orgSlug, req);
}
