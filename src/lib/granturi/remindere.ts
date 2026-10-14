import "server-only";

import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { areModul } from "@/lib/billing/packages";
import { db } from "@/lib/db";
import { appUsers, granturi, memberships } from "@/lib/db/schema";
import { trimiteEmail } from "@/lib/email";
import { escHtml } from "@/lib/html-escape";
import { raporteazaEroare } from "@/lib/monitoring";

import { aziBucuresti, reminderDeTrimis, STARI_CU_TERMEN_DEPUNERE, textTermen, zileLaTermen } from "./stari";

// Remindere de termen pentru cererile de finanțare care nu au fost încă depuse, rulate zilnic de cron (api/cron/granturi-remindere):
// un e-mail cu 7 zile înainte și unul cu o zi înainte (sau în ziua termenului). Fiecare pleacă o singură dată: rândul se „revendică”
// înainte de trimitere și se eliberează dacă trimiterea eșuează, ca să se reia la rularea următoare. Merge la responsabilul cererii;
// fără responsabil, la proprietarii organizației.

const URL_BAZA = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://alexandrit.ro").replace(/\/$/, "");

function emailReminder(p: { org: string; finantator: string; titlu: string; termen: string; zile: number; link: string }) {
  const cand = textTermen(p.zile);
  return {
    subiect: `Termen ${cand}: ${p.titlu}`,
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #14213d; line-height: 1.5;">
      <p>Cererea de finanțare <strong>${escHtml(p.titlu)}</strong> (${escHtml(p.finantator)}) are termenul de depunere <strong>${escHtml(p.termen)}</strong> — ${escHtml(cand)}, și încă nu e marcată ca depusă.</p>
      <p>Verifică documentele și draftul, apoi marchează cererea ca „Aplicat” după depunere.</p>
      <p style="text-align:center;margin:24px 0;"><a href="${escHtml(p.link)}" style="background:#154a85;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Deschide cererea</a></p>
      <p style="color:#64748b;font-size:12.5px;">Ți-am scris pentru că ești responsabilul cererii sau proprietar al organizației ${escHtml(p.org)} în Alexandrit. Reminderul pleacă o singură dată pentru fiecare prag (7 zile și o zi).</p>
    </div>`,
  };
}

export type RezultatRemindereGranturi = { trimise: number; esuate: number };

export async function trimiteRemindereGranturi(org: { id: string; slug: string; nume: string; pachet: Parameters<typeof areModul>[0] }, deadline: number): Promise<RezultatRemindereGranturi> {
  const rez: RezultatRemindereGranturi = { trimise: 0, esuate: 0 };
  if (!areModul(org.pachet, "granturi")) return rez;
  const azi = aziBucuresti();

  // Citire sub contextul organizației (RLS pe granturi) + căutare publică pentru e-mailurile membrilor.
  const { cereri, proprietari, membri } = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_org_id', ${org.id}, true)`);
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const cereri = await tx
      .select({
        id: granturi.id,
        finantator: granturi.finantator,
        titlu: granturi.titlu,
        termen: granturi.termen,
        responsabilId: granturi.responsabilId,
        r7: granturi.reminder7zLa,
        r1: granturi.reminder1zLa,
      })
      .from(granturi)
      .where(and(eq(granturi.orgId, org.id), inArray(granturi.stare, [...STARI_CU_TERMEN_DEPUNERE]), isNotNull(granturi.termen)));
    const proprietari = await tx
      .select({ email: appUsers.email })
      .from(memberships)
      .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
      .where(and(eq(memberships.orgId, org.id), eq(memberships.role, "owner")));
    const membri = await tx
      .select({ id: appUsers.id, email: appUsers.email })
      .from(memberships)
      .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
      .where(eq(memberships.orgId, org.id));
    return { cereri, proprietari, membri };
  });

  for (const c of cereri) {
    if (Date.now() > deadline) break;
    const zile = zileLaTermen(c.termen, azi);
    const prag = reminderDeTrimis(zile, c.r7 !== null, c.r1 !== null);
    if (!prag || zile === null || !c.termen) continue;

    const responsabil = membri.find((m) => m.id === c.responsabilId)?.email;
    const destinatari = responsabil ? [responsabil] : proprietari.map((p) => p.email);
    if (destinatari.length === 0) continue;

    // Revendicare: la pragul de o zi se marchează și cel de 7 zile (altfel ar pleca două e-mailuri la rând pentru același termen).
    const coloane = prag === "1z" ? { reminder1zLa: new Date(), ...(c.r7 === null ? { reminder7zLa: new Date() } : {}) } : { reminder7zLa: new Date() };
    const revendicat = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_org_id', ${org.id}, true)`);
      return tx
        .update(granturi)
        .set(coloane)
        .where(and(eq(granturi.id, c.id), eq(granturi.orgId, org.id), sql`${prag === "1z" ? granturi.reminder1zLa : granturi.reminder7zLa} is null`))
        .returning({ id: granturi.id });
    });
    if (revendicat.length === 0) continue;

    const mail = emailReminder({
      org: org.nume,
      finantator: c.finantator,
      titlu: c.titlu,
      termen: new Date(`${c.termen}T00:00:00`).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" }),
      zile,
      link: `${URL_BAZA()}/${org.slug}/crm/granturi`,
    });
    try {
      for (const to of destinatari) await trimiteEmail({ to, subiect: mail.subiect, html: mail.html });
      rez.trimise += 1;
    } catch (e) {
      rez.esuate += 1;
      raporteazaEroare("granturi-reminder", e, { orgSlug: org.slug });
      // Eliberăm revendicarea: reminderul se reia la rularea următoare.
      await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.current_org_id', ${org.id}, true)`);
        await tx
          .update(granturi)
          .set(prag === "1z" ? { reminder1zLa: null, ...(c.r7 === null ? { reminder7zLa: null } : {}) } : { reminder7zLa: null })
          .where(and(eq(granturi.id, c.id), eq(granturi.orgId, org.id)));
      });
    }
  }
  return rez;
}
