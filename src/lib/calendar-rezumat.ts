import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { verificaLimitaRata } from "@/lib/auth/rate-limit";
import { areModul } from "@/lib/billing/packages";
import { colecteazaEvenimente } from "@/lib/calendar-evenimente";
import { adaugaZile, ETICHETE_TIP_EVENIMENT, selecteazaPentruRezumat, type EvenimentCalendar } from "@/lib/calendar-fundraising";
import { db } from "@/lib/db";
import { appUsers, memberships } from "@/lib/db/schema";
import { trimiteEmail } from "@/lib/email";
import { aziBucuresti } from "@/lib/granturi/stari";
import { escHtml } from "@/lib/html-escape";
import { linkDezabonareNotificare, utilizatoriCuNotificareOprita } from "@/lib/notificari-oprite";
import { raporteazaEroare } from "@/lib/monitoring";

// Rezumatul săptămânal pe e-mail al calendarului (cron, lunea): termenele din următoarele 7 zile și momentele de campanie din următoarele 14,
// către proprietarii organizației. Nu pleacă nimic dacă nu e nimic de spus. Un singur e-mail pe organizație pe săptămână (revendicat în
// auth_rate_limits, ca două rulări ale cron-ului să nu trimită de două ori).

const URL_BAZA = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://alexandrit.ro").replace(/\/+$/, "");
const dataScurta = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("ro-RO", { weekday: "short", day: "numeric", month: "long" });

function linie(e: EvenimentCalendar): string {
  const titlu = e.href ? `<a href="${escHtml(URL_BAZA() + e.href)}" style="color:#154a85;text-decoration:none;font-weight:600;">${escHtml(e.titlu)}</a>` : `<strong>${escHtml(e.titlu)}</strong>`;
  return `<li style="margin:0 0 8px 0;">${titlu}<br><span style="color:#64748b;font-size:13px;">${escHtml(dataScurta(e.data))} · ${escHtml(ETICHETE_TIP_EVENIMENT[e.tip])}${e.detaliu ? " · " + escHtml(e.detaliu) : ""}</span></li>`;
}

export function emailRezumat(p: { org: string; slug: string; termene: EvenimentCalendar[]; momente: EvenimentCalendar[]; linkDezabonare?: string }) {
  const baza = URL_BAZA();
  const nr = p.termene.length;
  return {
    subiect: nr > 0 ? `Săptămâna aceasta: ${nr} ${nr === 1 ? "termen" : "termene"} în fundraising` : "Săptămâna aceasta în fundraising: momente bune de campanie",
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #14213d; line-height: 1.5;">
      <p>Rezumatul săptămânii pentru <strong>${escHtml(p.org)}</strong>.</p>
      ${nr > 0 ? `<h3 style="margin:16px 0 8px 0;font-size:15px;">Termene în următoarele 7 zile</h3><ul style="padding-left:18px;margin:0;">${p.termene.map(linie).join("")}</ul>` : "<p>Nu ai termene în următoarele 7 zile.</p>"}
      ${p.momente.length > 0 ? `<h3 style="margin:16px 0 8px 0;font-size:15px;">Momente bune de campanie, în curând</h3><ul style="padding-left:18px;margin:0;">${p.momente.map(linie).join("")}</ul>` : ""}
      <p style="text-align:center;margin:24px 0;"><a href="${escHtml(baza)}/${escHtml(p.slug)}/crm/calendar" style="background:#154a85;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Deschide calendarul</a></p>
      <p style="color:#64748b;font-size:12.5px;">Primești acest rezumat în fiecare luni, ca proprietar al organizației ${escHtml(p.org)} în Alexandrit, cât timp pachetul include calendarul. Termenele fiscale și momentele de campanie sunt orientative: verifică termenele oficiale pe anaf.ro.</p>
      ${p.linkDezabonare ? `<p style="color:#64748b;font-size:12.5px;">Nu mai vrei acest rezumat? <a href="${escHtml(p.linkDezabonare)}" style="color:#64748b;">Dezabonează-te</a>. Te poți reabona oricând din „Contul meu”.</p>` : ""}
    </div>`,
  };
}

export type RezultatRezumat = { trimis: boolean };

export async function trimiteRezumatCalendar(org: { id: string; slug: string; nume: string; pachet: Parameters<typeof areModul>[0] }): Promise<RezultatRezumat> {
  if (!areModul(org.pachet, "calendar")) return { trimis: false };
  const azi = aziBucuresti();

  const { evenimente, proprietari } = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_org_id', ${org.id}, true)`);
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const evenimente = await colecteazaEvenimente({ db: tx as unknown as typeof db, orgId: org.id, orgSlug: org.slug, orgPackage: org.pachet }, azi, adaugaZile(azi, 14));
    const proprietari = await tx
      .select({ id: appUsers.id, email: appUsers.email })
      .from(memberships)
      .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
      .where(and(eq(memberships.orgId, org.id), eq(memberships.role, "owner")));
    return { evenimente, proprietari };
  });

  const { termene, momente } = selecteazaPentruRezumat(evenimente, azi);
  if (termene.length === 0 && momente.length === 0) return { trimis: false };
  // Cine s-a dezabonat nu primește rezumatul, pentru nicio organizație.
  const opriti = await utilizatoriCuNotificareOprita(proprietari.map((p) => p.id), "rezumat-calendar");
  const destinatari = proprietari.filter((p) => !opriti.has(p.id));
  if (destinatari.length === 0) return { trimis: false };

  // Revendicare: o singură trimitere pe săptămână, chiar dacă cron-ul rulează de două ori.
  if (!(await verificaLimitaRata("calendar-rezumat", org.id, 1, 6 * 24 * 60))) return { trimis: false };

  let trimis = false;
  for (const p of destinatari) {
    try {
      // Fiecare destinatar are propriul link semnat de dezabonare, și în corp, și în antetele List-Unsubscribe (dezabonare cu un clic în Gmail / Apple Mail).
      const mail = emailRezumat({ org: org.nume, slug: org.slug, termene, momente, linkDezabonare: linkDezabonareNotificare("rezumat-calendar", p.id) });
      await trimiteEmail({
        to: p.email,
        subiect: mail.subiect,
        html: mail.html,
        headers: { "List-Unsubscribe": `<${linkDezabonareNotificare("rezumat-calendar", p.id, true)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      });
      trimis = true;
    } catch (e) {
      raporteazaEroare("calendar-rezumat", e, { orgSlug: org.slug });
    }
  }
  return { trimis };
}
