import "server-only";

import { and, eq, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { appUsers, memberships, organizations, platformPayments } from "@/lib/db/schema";
import { emailConfigurat, trimiteEmail } from "@/lib/email";
import { escHtml } from "@/lib/html-escape";
import { clasificaStatus, type RezultatPlataNetopia } from "@/lib/netopia";
import { raporteazaAvertisment, raporteazaEroare } from "@/lib/monitoring";
import { emiteFacturaAbonament, facturareFiscalaPermisa, MARCAJ_NEFACTURAT_SANDBOX, oblioConfigurata } from "@/lib/oblio";
import { htmlFacturaEmisa, subiectFacturaEmisa } from "@/lib/oblio-invoice-email-template";
import { criptareConfigurata, cripteaza } from "@/lib/secret-box";

import { NUME_PACHET_FIX } from "./packages";

// Confirmarea unei plăți Netopia — SINGURUL loc care schimbă bani/acces, apelat
// din DOUĂ locuri care ajung aici cu exact aceeași formă de rezultat
// (RezultatPlataNetopia), ca logica să nu existe de două ori:
//  - api/netopia/ipn/route.ts — IPN-ul asincron al unei plăți interactive
//    (card nou, pe pagina găzduită), după ce semnătura JWT e verificată acolo;
//  - api/cron/netopia-reinnoire/route.ts — răspunsul SINCRON al unei taxări cu
//    tokenul salvat (nu există pagină găzduită, deci nu există neapărat un IPN
//    separat de reținut).
// Aceleași garanții ca înainte: prima confirmare a comenzii câștigă (UPDATE
// condiționat pe status), suma trebuie să coincidă cu cea calculată de noi la
// creare, iar o rambursare nu poate readuce o comandă deja rambursată.

export const NETOPIA_RENEWAL_MAX_INCERCARI = 3;

export type ConfirmareNetopia =
  | { actiune: "ignorat" }
  | { actiune: "in_curs" }
  | { actiune: "reusita"; orgId: string; renewal: boolean }
  | { actiune: "esuata"; orgId: string; renewal: boolean; reinnoireDezactivata: boolean }
  | { actiune: "rambursata"; orgId: string; nou?: boolean };

// Factura NU se emite din interiorul tranzacției de mai jos (ar ține blocat rândul
// organizației pe durata apelului către Oblio, un serviciu extern) — se cheamă
// DUPĂ ce tranzacția s-a încheiat cu succes, ca o eroare de facturare să nu
// blocheze niciodată acordarea accesului. Comună fluxului interactiv (IPN) și
// reînnoirii automate (cron) — o reînnoire e o plată reală, care merită factură
// la fel ca prima. `idempotencyKey` (orderId, în emiteFacturaAbonament) face
// reîncercarea sigură dacă rulează de două ori pentru aceeași plată.
//
// Facturează STRICT plata cu acest orderId — NU "cea mai recentă plată
// reușită a organizației". Dacă am lua mereu cea mai recentă, o factură
// eșuată (ex. Oblio indisponibil temporar) ar rămâne orfană definitiv de
// îndată ce apare o plată ULTERIOARĂ: apelul următor ar factura doar plata
// nouă, iar cea veche, nefacturată, n-ar mai fi reconsiderată niciodată.
export async function factureazaPlata(orderId: string): Promise<void> {
  if (!oblioConfigurata()) return;

  // Fără NETOPIA_ENV=live nu emitem facturi fiscale pentru plăți de test. Plata se marchează EXPLICIT ca
  // nefacturată: altfel, la trecerea pe live, reluarea automată a facturilor ar emite facturi reale pentru toate
  // plățile sandbox rămase fără factură.
  if (!facturareFiscalaPermisa()) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
      await tx
        .update(platformPayments)
        .set({ oblioNumber: MARCAJ_NEFACTURAT_SANDBOX, oblioEroare: null })
        .where(and(eq(platformPayments.orderId, orderId), eq(platformPayments.status, "reusita"), isNull(platformPayments.oblioNumber)));
    });
    return;
  }

  // Citirile/scrierile de mai jos trec prin RLS ca oricare altele — fără
  // `app.public_lookup` (contextul de încredere, ca restul confirmării de mai
  // sus), fiecare select ar întoarce 0 rânduri și funcția n-ar face nimic,
  // silențios, indiferent dacă plata există.
  const { plata, org, emailProprietar } = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const rows = await tx
      .select({
        id: platformPayments.id,
        orgId: platformPayments.orgId,
        orderId: platformPayments.orderId,
        sumaLei: platformPayments.sumaLei,
        pachet: platformPayments.package,
        oblioNumber: platformPayments.oblioNumber,
        ntpId: platformPayments.ntpId,
      })
      .from(platformPayments)
      .where(and(eq(platformPayments.orderId, orderId), eq(platformPayments.status, "reusita")))
      .limit(1);
    const plata = rows[0] ?? null;
    if (!plata || plata.oblioNumber) return { plata: null, org: null, emailProprietar: null }; // deja facturată sau plata nu s-a găsit

    const [org] = await tx
      .select({ name: organizations.name, cif: organizations.cif, adresaSediu: organizations.adresaSediu, judet: organizations.judet, iban: organizations.iban })
      .from(organizations)
      .where(eq(organizations.id, plata.orgId))
      .limit(1);
    // Emailul owner-ului — destinatarul facturii, atât pentru trimiterea
    // proprie (mai jos) cât și pentru cea din contul Oblio (sendEmail:1, dacă
    // e activată acolo) — vezi lib/oblio.ts.
    const [proprietar] = await tx
      .select({ email: appUsers.email })
      .from(memberships)
      .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
      .where(and(eq(memberships.orgId, plata.orgId), eq(memberships.role, "owner")))
      .limit(1);
    return { plata, org: org ?? null, emailProprietar: proprietar?.email ?? null };
  });
  if (!plata || !org) return;

  const packageLabel = (NUME_PACHET_FIX as Record<string, string>)[plata.pachet] ?? plata.pachet;

  try {
    const factura = await emiteFacturaAbonament({
      orderId: plata.orderId,
      client: { nume: org.name, cif: org.cif, adresa: org.adresaSediu, judet: org.judet, iban: org.iban, email: emailProprietar },
      descriere: `Alexandrit — ${packageLabel} (o lună)`,
      sumaLei: plata.sumaLei,
      referintaIncasare: plata.ntpId ?? plata.orderId,
    });
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
      await tx
        .update(platformPayments)
        .set({ oblioSeriesName: factura.seriesName, oblioNumber: factura.number, oblioLink: factura.link, oblioInvoicedAt: new Date(), oblioEroare: null })
        .where(eq(platformPayments.id, plata.id));
    });

    // Trimitere PROPRIE a facturii, indiferent dacă emailul automat din contul
    // Oblio (sendEmail:1) e configurat sau nu — best-effort, o eroare aici nu
    // anulează factura deja emisă și salvată mai sus.
    if (emailProprietar && emailConfigurat()) {
      await trimiteEmail({
        to: emailProprietar,
        subiect: subiectFacturaEmisa(factura.number),
        html: htmlFacturaEmisa({ orgName: org.name, packageLabel, sumaLei: plata.sumaLei, numarFactura: factura.number, linkFactura: factura.link }),
      }).catch((e) => raporteazaEroare("oblio-factura-email", e, { orgId: plata.orgId, orderId: plata.orderId }));
    }
  } catch (e) {
    const mesaj = e instanceof Error ? e.message : "eroare necunoscută";
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
      await tx.update(platformPayments).set({ oblioEroare: mesaj.slice(0, 300) }).where(eq(platformPayments.id, plata.id));
    });
    raporteazaEroare("oblio-factura", e, { orgId: plata.orgId, orderId: plata.orderId });
  }
}

async function anuntaStornoNecesar(orderId: string): Promise<void> {
  const plata = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const [r] = await tx
      .select({
        sumaLei: platformPayments.sumaLei,
        serie: platformPayments.oblioSeriesName,
        numar: platformPayments.oblioNumber,
        link: platformPayments.oblioLink,
        orgName: organizations.name,
        orgSlug: organizations.slug,
      })
      .from(platformPayments)
      .innerJoin(organizations, eq(organizations.id, platformPayments.orgId))
      .where(eq(platformPayments.orderId, orderId))
      .limit(1);
    return r ?? null;
  });
  // Plată fără factură (sau marcată ca nefacturată în sandbox) — nimic de stornat.
  // Orice marcaj „NEFACTURAT…" (sandbox sau marcat manual pentru teste) = nu există factură fiscală de stornat.
  if (!plata?.numar || plata.numar.startsWith("NEFACTURAT")) return;

  const factura = `${plata.serie ?? ""} ${plata.numar}`.trim();
  raporteazaAvertisment("netopia-rambursare", "rambursare pe o plată deja facturată — factura trebuie stornată manual în Oblio", {
    orderId,
    factura,
    org: plata.orgSlug,
    sumaLei: plata.sumaLei,
  });
  if (!emailConfigurat()) return;
  await trimiteEmail({
    to: process.env.ALERTE_FACTURARE_EMAIL || "vlad.placinta@alexandrit.ro",
    subiect: `Rambursare — de stornat factura ${factura}`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #14213d;">
      <p>Netopia a confirmat rambursarea comenzii <strong>${escHtml(orderId)}</strong> (${plata.sumaLei} lei, organizația <strong>${escHtml(plata.orgName)}</strong>).</p>
      <p>Factura <strong>${escHtml(factura)}</strong> a fost deja emisă și <strong>nu se stornează automat</strong>. Verifică cu contabilul și emite factura de storno în Oblio.</p>
      ${plata.link ? `<p><a href="${escHtml(plata.link)}">Deschide factura</a></p>` : ""}
      <p style="color:#94a3b8;font-size:12px;">Accesul organizației a fost deja retras, iar reînnoirea automată oprită.</p>
    </div>`,
  });
}

export async function proceseazaRezultatPlataNetopia(orderId: string, rezultat: RezultatPlataNetopia): Promise<ConfirmareNetopia> {
  const decizie = clasificaStatus(rezultat.status);

  const confirmare = await db.transaction(async (tx): Promise<ConfirmareNetopia> => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);

    // FOR UPDATE: confirmări concurente ale ACELEIAȘI comenzi (succes + rambursare,
    // sau retrimiteri) se serializează aici.
    const rows = await tx.select().from(platformPayments).where(eq(platformPayments.orderId, orderId)).limit(1).for("update");
    const plata = rows[0];
    if (!plata) return { actiune: "ignorat" }; // comandă necunoscută — nimic de reîncercat

    if (decizie === "reusita") {
      if (rezultat.suma === null || Math.abs(rezultat.suma - plata.sumaLei) > 0.01 || (rezultat.moneda && rezultat.moneda !== "RON")) {
        raporteazaAvertisment("netopia-confirm", "sumă/monedă diferită de comandă — plata NU a fost acordată, verificare manuală", {
          orderId,
          primit: rezultat.suma,
          asteptat: plata.sumaLei,
        });
        return { actiune: "ignorat" };
      }

      // Exclus și "rambursata" — o confirmare veche/întârziată nu are voie s-o
      // readucă la "reusita" peste o rambursare deja procesată.
      const actualizat = await tx
        .update(platformPayments)
        .set({ status: "reusita", paidAt: new Date(), ntpId: sql`coalesce(${rezultat.ntpId ?? null}, ${platformPayments.ntpId})`, netopiaStatus: rezultat.status })
        .where(and(eq(platformPayments.id, plata.id), sql`${platformPayments.status} not in ('reusita', 'rambursata')`))
        .returning({ id: platformPayments.id });
      if (!actualizat[0]) {
        // Deja procesată (ex. de verificarea de status din pagina de rezultat, al
        // cărei răspuns poate lipsi tokenul) sau deja rambursată. Tokenul vine UNA
        // SINGURĂ DATĂ, în IPN — dacă acesta sosește după ce plata a fost deja
        // confirmată, îl salvăm acum, altfel cardul se pierde și reînnoirea
        // automată nu pornește niciodată. Doar pentru o plată reușită recent și
        // doar dacă organizația nu are deja un card salvat (nu suprascriem un card
        // eliminat sau schimbat între timp).
        const recenta = plata.paidAt !== null && Date.now() - plata.paidAt.getTime() < 6 * 3600_000;
        if (plata.status === "reusita" && recenta && rezultat.cardToken && criptareConfigurata()) {
          const [optOutRand] = await tx.select({ o: organizations.netopiaAutorenewOptOut }).from(organizations).where(eq(organizations.id, plata.orgId)).limit(1);
          await tx
            .update(organizations)
            .set({
              netopiaCardTokenEnc: cripteaza(rezultat.cardToken),
              netopiaCardMasked: rezultat.cardMasked,
              netopiaCardExpireMonth: rezultat.cardExpireMonth,
              netopiaCardExpireYear: rezultat.cardExpireYear,
              netopiaAutoRenew: !optOutRand?.o,
            })
            .where(and(eq(organizations.id, plata.orgId), isNull(organizations.netopiaCardTokenEnc)));
        }
        return { actiune: "ignorat" };
      }

      // Cardul se salvează DOAR dacă Netopia a întors un token reutilizabil ȘI
      // criptarea e configurată — fără ORG_SECRETS_KEY nu salvăm nimic în clar.
      // Implicit ACTIV (reînnoire automată) — disclosure-ul apare pe pagina de
      // alegere a pachetului, ÎNAINTE de plată; organizația poate opri oricând
      // din Setări, fără să piardă cardul salvat.
      // Clientul care a oprit explicit reînnoirea automată nu o primește înapoi doar pentru că a plătit manual o lună.
      const [optOutOrg] = await tx.select({ o: organizations.netopiaAutorenewOptOut }).from(organizations).where(eq(organizations.id, plata.orgId)).limit(1);
      const setCard: Partial<typeof organizations.$inferInsert> =
        rezultat.cardToken && criptareConfigurata()
          ? {
              netopiaCardTokenEnc: cripteaza(rezultat.cardToken),
              netopiaCardMasked: rezultat.cardMasked,
              netopiaCardExpireMonth: rezultat.cardExpireMonth,
              netopiaCardExpireYear: rezultat.cardExpireYear,
              netopiaAutoRenew: !optOutOrg?.o,
            }
          : {};
      const actualizatOrg = await tx
        .update(organizations)
        .set({
          package: plata.package,
          customPlanConfig: plata.package === "custom" ? plata.planConfig : null,
          subscriptionStatus: "active",
          // Aceeași aritmetică GREATEST atomică ca înainte — o plată nouă
          // prelungește accesul existent, nu-l suprapune.
          currentPeriodEnd: sql`greatest(${organizations.currentPeriodEnd}, now()) + (${plata.luni} || ' months')::interval`,
          netopiaRenewalAttempts: 0,
          netopiaRenewalFailedAt: null,
          retentieAvertizari: 0,
          retentieUltimaAvertizare: null,
          ...setCard,
        })
        .where(eq(organizations.id, plata.orgId))
        .returning({ id: organizations.id });
      if (!actualizatOrg[0]) {
        raporteazaAvertisment("netopia-confirm", "organizația comenzii plătite nu mai există", { orderId, orgId: plata.orgId });
      }
      return { actiune: "reusita", orgId: plata.orgId, renewal: plata.renewal };
    }

    if (decizie === "esuata") {
      await tx
        .update(platformPayments)
        .set({ status: "esuata", netopiaStatus: rezultat.status, ntpId: sql`coalesce(${rezultat.ntpId ?? null}, ${platformPayments.ntpId})` })
        .where(and(eq(platformPayments.id, plata.id), eq(platformPayments.status, "in_asteptare")));

      // Doar reînnoirile automate țin evidența eșecurilor consecutive — o plată
      // manuală eșuată nu spune nimic despre cardul salvat (poate fi alt card,
      // sau clientul renunță și reîncearcă manual el însuși).
      if (!plata.renewal) return { actiune: "esuata", orgId: plata.orgId, renewal: false, reinnoireDezactivata: false };

      const dupaIncrementare = await tx
        .update(organizations)
        .set({
          netopiaRenewalAttempts: sql`${organizations.netopiaRenewalAttempts} + 1`,
          netopiaRenewalFailedAt: sql`coalesce(${organizations.netopiaRenewalFailedAt}, now())`,
        })
        .where(eq(organizations.id, plata.orgId))
        .returning({ incercari: organizations.netopiaRenewalAttempts });
      const incercari = dupaIncrementare[0]?.incercari ?? NETOPIA_RENEWAL_MAX_INCERCARI;
      const reinnoireDezactivata = incercari >= NETOPIA_RENEWAL_MAX_INCERCARI;

      if (reinnoireDezactivata) {
        // Cardul salvat e (probabil) mort — nu mai reîncercăm la nesfârșit.
        // Accesul deja plătit (currentPeriodEnd) rămâne neschimbat: un eșec de
        // reînnoire nu retrage acces plătit deja, doar oprește reînnoirea viitoare.
        await tx
          .update(organizations)
          .set({ netopiaAutoRenew: false, netopiaCardTokenEnc: null, netopiaCardMasked: null, netopiaCardExpireMonth: null, netopiaCardExpireYear: null })
          .where(eq(organizations.id, plata.orgId));
      }
      return { actiune: "esuata", orgId: plata.orgId, renewal: true, reinnoireDezactivata };
    }

    if (decizie === "rambursata") {
      if (plata.status === "rambursata") return { actiune: "rambursata", orgId: plata.orgId };

      // Marcăm rambursată orice comandă neînchisă, nu doar "reusita" — o
      // rambursare sosită ÎNAINTEA confirmării de plată nu are voie să se piardă.
      await tx.update(platformPayments).set({ status: "rambursata", netopiaStatus: rezultat.status }).where(eq(platformPayments.id, plata.id));

      if (plata.status !== "reusita") return { actiune: "rambursata", orgId: plata.orgId }; // nu acordase încă acces

      const dupa = await tx
        .update(organizations)
        .set({ currentPeriodEnd: sql`${organizations.currentPeriodEnd} - (${plata.luni} || ' months')::interval` })
        .where(eq(organizations.id, plata.orgId))
        .returning({ sfarsit: organizations.currentPeriodEnd });
      // Rambursarea oprește și reînnoirea automată: altfel perioada scăzută mai
      // sus ar readuce organizația în fereastra cron-ului, care ar taxa din nou
      // cardul clientului rambursat în ziua următoare.
      await tx
        .update(organizations)
        .set({
          netopiaAutoRenew: false,
          netopiaCardTokenEnc: null,
          netopiaCardMasked: null,
          netopiaCardExpireMonth: null,
          netopiaCardExpireYear: null,
          netopiaRenewalAttempts: 0,
          netopiaRenewalFailedAt: null,
        })
        .where(eq(organizations.id, plata.orgId));
      const sfarsit = dupa[0]?.sfarsit;
      if (sfarsit && sfarsit <= new Date()) {
        await tx.update(organizations).set({ subscriptionStatus: "canceled" }).where(eq(organizations.id, plata.orgId));
      }
      return { actiune: "rambursata", orgId: plata.orgId, nou: true };
    }

    // Încă în curs (autentificare 3DS, verificare antifraudă) — doar reținem
    // starea; va veni o confirmare finală.
    await tx.update(platformPayments).set({ netopiaStatus: rezultat.status, ntpId: sql`coalesce(${rezultat.ntpId ?? null}, ${platformPayments.ntpId})` }).where(eq(platformPayments.id, plata.id));
    return { actiune: "in_curs" };
  });

  // Best-effort, DUPĂ commit — o eroare de facturare (Oblio indisponibil etc.)
  // nu are voie să se propage la apelant ca eșec al PLĂȚII (accesul e deja
  // acordat, e strict corect); rămâne raportată și de regenerat manual.
  // Rambursare nouă pe o plată deja facturată: documentul fiscal NU se stornează automat (decizie: storno manual, cu
  // contabilul — o factură validată în SPV nu se poate anula, iar rambursările parțiale cer tratament separat). Cineva
  // trebuie anunțat explicit, altfel factura rămâne în vigoare după ce banii au plecat.
  if (confirmare.actiune === "rambursata" && confirmare.nou) {
    await anuntaStornoNecesar(orderId).catch((e) => raporteazaEroare("oblio-storno-alerta", e, { orderId }));
  }

  if (confirmare.actiune === "reusita") {
    await factureazaPlata(orderId).catch((e) => raporteazaEroare("oblio-factura", e, { orgId: confirmare.orgId, orderId }));
  }
  return confirmare;
}

// Reia facturile rămase neemise (Oblio indisponibil, limita planului gratuit,
// proces întrerupt între confirmare și emitere) — rulat zilnic din
// api/cron/netopia-reinnoire. Doar plăți mai vechi de 10 minute, ca să nu
// concureze cu emiterea încă în curs din IPN; `idempotencyKey` (orderId) din
// emiteFacturaAbonament face reluarea sigură chiar dacă ambele ajung să emită.
// Cel mult 20 pe rulare, ca un cont Oblio blocat să nu consume toată durata.
export async function reiaFacturileNeemise(): Promise<{ incercate: number; emise: number }> {
  if (!oblioConfigurata() || !facturareFiscalaPermisa()) return { incercate: 0, emise: 0 };

  const comenzi = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return tx
      .select({ orderId: platformPayments.orderId })
      .from(platformPayments)
      .where(
        and(
          eq(platformPayments.status, "reusita"),
          isNull(platformPayments.oblioNumber),
          lt(platformPayments.paidAt, sql`now() - interval '10 minutes'`),
        ),
      )
      .orderBy(platformPayments.paidAt)
      .limit(20);
  });

  let emise = 0;
  for (const c of comenzi) {
    await factureazaPlata(c.orderId).catch((e) => raporteazaEroare("oblio-factura-reluare", e, { orderId: c.orderId }));
    const dupa = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
      return tx.select({ nr: platformPayments.oblioNumber }).from(platformPayments).where(eq(platformPayments.orderId, c.orderId)).limit(1);
    });
    if (dupa[0]?.nr) emise++;
  }
  return { incercate: comenzi.length, emise };
}
