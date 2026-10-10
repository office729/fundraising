import "server-only";

import { and, eq, isNotNull, isNull, gt, lte } from "drizzle-orm";

import { volunteerActivities, volunteerShifts, volunteerSignups, volunteerVisitors } from "@/lib/db/schema";
import { trimiteEmail } from "@/lib/email";
import { emailMultumire, emailReminder } from "@/lib/voluntari-email-template";
import { cuOrg, URL_BAZA } from "@/lib/voluntari-panou-server";

// Remindere și mulțumiri pentru voluntari, rulate zilnic de cron (vezi api/cron/voluntari-remindere). Fiecare mesaj pleacă o singură
// dată: rândul se „revendică” (se pune data trimiterii) înainte de trimitere și se eliberează dacă trimiterea eșuează, ca să se reia
// la rularea următoare. Pleacă doar către voluntarii care și-au lăsat emailul.

const FEREASTRA_REMINDER_ORE = 36;

export type RezultatRemindere = { remindere: number; multumiri: number; esuate: number };

export async function trimiteRemindereVoluntari(org: { id: string; nume: string }, codLink: string | null, deadline: number): Promise<RezultatRemindere> {
  const linkPagina = codLink ? `${URL_BAZA()}/voluntar/${codLink}` : null;
  const rez: RezultatRemindere = { remindere: 0, multumiri: 0, esuate: 0 };
  const acum = new Date();
  const limita = new Date(acum.getTime() + FEREASTRA_REMINDER_ORE * 3_600_000);

  // ===== Remindere: ture care încep în următoarele 36 de ore, pentru cei confirmați =====
  const deReamintit = await cuOrg(org.id, (tx) =>
    tx
      .select({
        id: volunteerSignups.id,
        email: volunteerVisitors.email,
        titlu: volunteerActivities.titlu,
        locatie: volunteerActivities.locatie,
        contactZi: volunteerActivities.contactZi,
        coordonatorNume: volunteerActivities.coordonatorNume,
        coordonatorTelefon: volunteerActivities.coordonatorTelefon,
        inceputLa: volunteerShifts.inceputLa,
        rol: volunteerShifts.nume,
      })
      .from(volunteerSignups)
      .innerJoin(volunteerVisitors, eq(volunteerVisitors.id, volunteerSignups.visitorId))
      .innerJoin(volunteerActivities, eq(volunteerActivities.id, volunteerSignups.activityId))
      .innerJoin(volunteerShifts, eq(volunteerShifts.id, volunteerSignups.shiftId))
      .where(
        and(
          eq(volunteerSignups.orgId, org.id),
          eq(volunteerSignups.status, "confirmata"),
          isNull(volunteerSignups.reminderTrimisLa),
          isNotNull(volunteerVisitors.email),
          eq(volunteerActivities.stare, "publicata"),
          gt(volunteerShifts.inceputLa, acum),
          lte(volunteerShifts.inceputLa, limita),
        ),
      )
      .limit(200),
  );

  for (const r of deReamintit) {
    if (Date.now() > deadline) return rez;
    if (!r.email) continue;
    const revendicat = await cuOrg(org.id, (tx) =>
      tx
        .update(volunteerSignups)
        .set({ reminderTrimisLa: new Date() })
        .where(and(eq(volunteerSignups.id, r.id), eq(volunteerSignups.orgId, org.id), isNull(volunteerSignups.reminderTrimisLa)))
        .returning({ id: volunteerSignups.id }),
    );
    if (revendicat.length === 0) continue;
    const contact = [r.coordonatorNume, r.coordonatorTelefon, r.contactZi].filter(Boolean).join(" · ");
    const mail = emailReminder({ org: org.nume, titlu: r.titlu, locatie: r.locatie, inceputLa: r.inceputLa, rol: r.rol, contact, link: linkPagina });
    try {
      await trimiteEmail({ to: r.email, subiect: mail.subiect, html: mail.html });
      rez.remindere += 1;
    } catch {
      rez.esuate += 1;
      await cuOrg(org.id, (tx) => tx.update(volunteerSignups).set({ reminderTrimisLa: null }).where(and(eq(volunteerSignups.id, r.id), eq(volunteerSignups.orgId, org.id))));
    }
  }

  // ===== Mulțumiri: după validarea orelor =====
  const deMultumit = await cuOrg(org.id, (tx) =>
    tx
      .select({
        id: volunteerSignups.id,
        email: volunteerVisitors.email,
        prenume: volunteerVisitors.prenume,
        ore: volunteerSignups.oreValidate,
        titlu: volunteerActivities.titlu,
        eticheta: volunteerActivities.rezultatEticheta,
        valoare: volunteerActivities.rezultatValoare,
      })
      .from(volunteerSignups)
      .innerJoin(volunteerVisitors, eq(volunteerVisitors.id, volunteerSignups.visitorId))
      .innerJoin(volunteerActivities, eq(volunteerActivities.id, volunteerSignups.activityId))
      .where(
        and(
          eq(volunteerSignups.orgId, org.id),
          eq(volunteerSignups.status, "prezent"),
          isNotNull(volunteerSignups.oreValidate),
          isNull(volunteerSignups.multumireTrimisaLa),
          isNotNull(volunteerVisitors.email),
        ),
      )
      .limit(200),
  );

  for (const r of deMultumit) {
    if (Date.now() > deadline) return rez;
    if (!r.email) continue;
    const revendicat = await cuOrg(org.id, (tx) =>
      tx
        .update(volunteerSignups)
        .set({ multumireTrimisaLa: new Date() })
        .where(and(eq(volunteerSignups.id, r.id), eq(volunteerSignups.orgId, org.id), isNull(volunteerSignups.multumireTrimisaLa)))
        .returning({ id: volunteerSignups.id }),
    );
    if (revendicat.length === 0) continue;
    const rezultat = r.eticheta && r.valoare != null ? `${Number(r.valoare).toLocaleString("ro-RO")} ${r.eticheta}` : null;
    const mail = emailMultumire({ org: org.nume, prenume: r.prenume, titlu: r.titlu, ore: Number(r.ore), rezultat, link: linkPagina });
    try {
      await trimiteEmail({ to: r.email, subiect: mail.subiect, html: mail.html });
      rez.multumiri += 1;
    } catch {
      rez.esuate += 1;
      await cuOrg(org.id, (tx) => tx.update(volunteerSignups).set({ multumireTrimisaLa: null }).where(and(eq(volunteerSignups.id, r.id), eq(volunteerSignups.orgId, org.id))));
    }
  }
  return rez;
}
