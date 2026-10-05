import "server-only";

import { and, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { donatoriReali, emailSuppression, formular230Beneficiari, formular230CampaniiEmail, formular230Destinatari } from "@/lib/db/schema";
import { trimiteEmailuriInLot } from "@/lib/email";
import { hashSuprimare, linkDezabonare } from "@/lib/dezabonare";
import { SLUG_PRINCIPAL } from "@/lib/formular230-constants";
import { anteteDezabonare, htmlEmailF230, subiectEmailF230 } from "@/lib/formular230-email-template";
import { raporteazaAvertisment } from "@/lib/monitoring";

// Trimiterea campaniei de reamintire F230 — comună cron-ului zilnic și
// butonului manual. REZUMABILĂ și idempotentă:
//  - campania se „revendică" ÎNAINTE de trimitere (rând unic pe organizație și
//    an, status `in_curs`), iar o rulare concurentă (dublu-click, cron livrat de
//    două ori) vede revendicarea și nu trimite;
//  - fiecare email trimis se înregistrează în formular230_destinatari imediat,
//    deci o rulare întreruptă (timeout, crash) continuă a doua zi doar cu cei
//    rămași, fără dubluri;
//  - campania devine `trimisa` abia când nu mai rămâne nimeni de contactat. Dacă
//    SMTP e picat (niciun email plecat), rămâne `in_curs` și e reluată, nu se
//    marchează ca trimisă;
//  - se oprește la `deadline` (ms epoch), ca funcția serverless să nu depășească
//    durata maximă.
// Rulează în contextul de încredere (app.public_lookup), nu prin ctx.db al unui
// user — apelantul manual și-a verificat deja rolul de admin.

export type StareCampanie = "trimisa" | "partiala" | "deja_trimisa" | "fara_link" | "fara_destinatari" | "in_curs_altundeva" | "esuata";

export type RezultatCampanie = { stare: StareCampanie; trimise: number; esuate: number; ramase: number; total: number };

// Cât timp o revendicare rămâne „activă" fără semn de viață (fiecare email
// trimis o reînnoiește). După aceea, o altă rulare poate prelua campania.
const VALABILITATE_REVENDICARE = "10 minutes";

async function intrucat<T>(f: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return f(tx);
  });
}

export async function trimiteCampanieF230(params: {
  org: { id: string; name: string; slug: string };
  an: number;
  baseUrl: string;
  trimisDe: string | null;
  deadline: number;
}): Promise<RezultatCampanie> {
  const { org, an, baseUrl, trimisDe, deadline } = params;
  const gol = (stare: StareCampanie, extra: Partial<RezultatCampanie> = {}): RezultatCampanie => ({ stare, trimise: 0, esuate: 0, ramase: 0, total: 0, ...extra });

  const pregatire = await intrucat(async (tx) => {
    const [existenta] = await tx
      .select({ id: formular230CampaniiEmail.id, status: formular230CampaniiEmail.status })
      .from(formular230CampaniiEmail)
      .where(and(eq(formular230CampaniiEmail.orgId, org.id), eq(formular230CampaniiEmail.an, an)))
      .limit(1);
    if (existenta?.status === "trimisa") return { stare: "deja_trimisa" as const };

    const [beneficiar] = await tx
      .select({ shortCode: formular230Beneficiari.shortCode })
      .from(formular230Beneficiari)
      .where(and(eq(formular230Beneficiari.orgId, org.id), eq(formular230Beneficiari.slug, SLUG_PRINCIPAL)))
      .limit(1);
    if (!beneficiar?.shortCode) return { stare: "fara_link" as const };

    // Lista de suprimare (dezabonați / ștergeri GDPR) — nu mai primesc campanii nici dacă
    // rândul lor din donatori_reali a fost recreat între timp.
    const suprimati = new Set(
      (await tx.select({ h: emailSuppression.emailHash }).from(emailSuppression).where(eq(emailSuppression.orgId, org.id))).map((r) => r.h),
    );
    const toti = await tx
      .select({ email: donatoriReali.email, nume: donatoriReali.nume })
      .from(donatoriReali)
      // Doar cei care NU s-au dezabonat și NU au refuzat explicit emailurile la
      // donație (consimtamant_email false). NULL = donator dinainte de bifa de
      // email: primește ca până acum, cu link de dezabonare în fiecare email.
      .where(
        and(
          eq(donatoriReali.orgId, org.id),
          isNull(donatoriReali.dezabonatEmailLa),
          or(isNull(donatoriReali.consimtamantEmail), eq(donatoriReali.consimtamantEmail, true)),
        ),
      );
    const donatori = toti.filter((d) => !suprimati.has(hashSuprimare(org.id, d.email)));
    if (!donatori.length) return { stare: "fara_destinatari" as const };

    let campanieId: string;
    if (!existenta) {
      const [nou] = await tx
        .insert(formular230CampaniiEmail)
        .values({ orgId: org.id, an, nrDestinatari: 0, trimisDe, status: "in_curs" })
        .onConflictDoNothing()
        .returning({ id: formular230CampaniiEmail.id });
      if (!nou) return { stare: "in_curs_altundeva" as const }; // altă rulare a revendicat-o între timp
      campanieId = nou.id;
    } else {
      const [preluat] = await tx
        .update(formular230CampaniiEmail)
        .set({ ultimaActivitate: sql`now()` })
        .where(
          and(
            eq(formular230CampaniiEmail.id, existenta.id),
            sql`${formular230CampaniiEmail.ultimaActivitate} < now() - ${sql.raw(`interval '${VALABILITATE_REVENDICARE}'`)}`,
          ),
        )
        .returning({ id: formular230CampaniiEmail.id });
      if (!preluat) return { stare: "in_curs_altundeva" as const }; // alt proces trimite chiar acum
      campanieId = preluat.id;
    }

    const deja = await tx
      .select({ email: formular230Destinatari.email })
      .from(formular230Destinatari)
      .where(eq(formular230Destinatari.campanieId, campanieId));
    const trimisi = new Set(deja.map((r) => r.email.toLowerCase()));
    return {
      stare: "ok" as const,
      campanieId,
      shortCode: beneficiar.shortCode,
      toti: donatori.length,
      ramasi: donatori.filter((d) => !trimisi.has(d.email.toLowerCase())),
    };
  });

  if (pregatire.stare !== "ok") return gol(pregatire.stare);
  const { campanieId, shortCode, ramasi } = pregatire;

  // Revendicarea se eliberează mereu la final (o rulare următoare, de exemplu un
  // click manual imediat după o oprire la deadline, nu trebuie să aștepte 10 minute).
  const elibereaza = () =>
    intrucat((tx) =>
      tx
        .update(formular230CampaniiEmail)
        .set({ ultimaActivitate: sql`now() - interval '1 hour'` })
        .where(eq(formular230CampaniiEmail.id, campanieId)),
    );

  try {
    const link = `${baseUrl}/s/${shortCode}`;
    const { trimise, esuate, intrerupt } = await trimiteEmailuriInLot({
      destinatari: ramasi,
      subiect: () => subiectEmailF230(org.name),
      html: (d) => htmlEmailF230(org.name, d.nume, link, linkDezabonare(baseUrl, org.id, d.email)),
      headers: (d) => anteteDezabonare(linkDezabonare(baseUrl, org.id, d.email)),
      opreste: () => Date.now() > deadline,
      // Jurnalul per email + semnul de viață al revendicării.
      laTrimis: (d) =>
        intrucat(async (tx) => {
          await tx.insert(formular230Destinatari).values({ campanieId, orgId: org.id, email: d.email }).onConflictDoNothing();
          await tx.update(formular230CampaniiEmail).set({ ultimaActivitate: sql`now()` }).where(eq(formular230CampaniiEmail.id, campanieId));
        }),
    });

    const ramase = Math.max(0, ramasi.length - trimise - esuate);
    if (intrerupt) {
      await elibereaza();
      return { stare: "partiala", trimise, esuate, ramase, total: pregatire.toti };
    }
    if (trimise === 0 && esuate > 0) {
      // Nimeni nu a primit nimic (SMTP picat) — NU marcăm anul ca trimis.
      raporteazaAvertisment("cron-formular230", "niciun email de reamintire nu a putut fi trimis — campania rămâne în curs", { orgSlug: org.slug, esuate });
      await elibereaza();
      return { stare: "esuata", trimise, esuate, ramase: ramasi.length, total: pregatire.toti };
    }

    if (esuate > 0) {
      raporteazaAvertisment("cron-formular230", "unele emailuri de reamintire au eșuat (nu se mai reîncearcă)", { orgSlug: org.slug, trimise, esuate });
    }
    const [{ n }] = await intrucat((tx) =>
      tx
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(formular230Destinatari)
        .where(eq(formular230Destinatari.campanieId, campanieId)),
    );
    await intrucat((tx) =>
      tx
        .update(formular230CampaniiEmail)
        .set({ status: "trimisa", nrDestinatari: n, ultimaActivitate: sql`now()` })
        .where(eq(formular230CampaniiEmail.id, campanieId)),
    );
    return { stare: "trimisa", trimise, esuate, ramase: 0, total: n };
  } catch (e) {
    await elibereaza().catch(() => {});
    throw e;
  }
}
