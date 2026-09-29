import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { organizations, platformPayments } from "@/lib/db/schema";
import { clasificaStatus, verificaIpn } from "@/lib/netopia";
import { raporteazaAvertisment, raporteazaEroare } from "@/lib/monitoring";
import { emiteFacturaAbonament, oblioConfigurata } from "@/lib/oblio";

const NUME_PACHET: Record<string, string> = {
  start: "Pachet START",
  crestere: "Pachet CREȘTERE",
  impact: "Pachet IMPACT",
  custom: "Plan personalizat",
};

// Factura NU se emite din interiorul tranzacției de mai jos (ar ține blocat rândul
// organizației pe durata apelului către Oblio, un serviciu extern) — se cheamă
// DUPĂ ce accesul e deja acordat, ca o eroare de facturare să nu-l blocheze
// niciodată. `idempotencyKey` (orderId) face reîncercarea sigură.
async function factureazaPlata(orgId: string): Promise<void> {
  if (!oblioConfigurata()) return;

  // Citirile/scrierile de mai jos trec prin RLS ca oricare altele — fără
  // `app.public_lookup` (contextul de încredere al acestui webhook, ca restul
  // rutei), fiecare select ar întoarce 0 rânduri și funcția n-ar face nimic,
  // silențios, indiferent dacă plata există.
  const { plata, org } = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const rows = await tx
      .select({ id: platformPayments.id, orderId: platformPayments.orderId, sumaLei: platformPayments.sumaLei, pachet: platformPayments.package, oblioNumber: platformPayments.oblioNumber })
      .from(platformPayments)
      .where(and(eq(platformPayments.orgId, orgId), eq(platformPayments.status, "reusita")))
      .orderBy(sql`${platformPayments.paidAt} desc`)
      .limit(1);
    const plata = rows[0] ?? null;
    if (!plata || plata.oblioNumber) return { plata: null, org: null }; // deja facturată sau plata nu s-a găsit

    const [org] = await tx.select({ name: organizations.name, cif: organizations.cif }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
    return { plata, org: org ?? null };
  });
  if (!plata || !org) return;

  try {
    const factura = await emiteFacturaAbonament({
      orderId: plata.orderId,
      client: { nume: org.name, cif: org.cif, email: null },
      descriere: `Alexandrit — ${NUME_PACHET[plata.pachet] ?? plata.pachet} (o lună)`,
      sumaLei: plata.sumaLei,
    });
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
      await tx
        .update(platformPayments)
        .set({ oblioSeriesName: factura.seriesName, oblioNumber: factura.number, oblioLink: factura.link, oblioInvoicedAt: new Date(), oblioEroare: null })
        .where(eq(platformPayments.id, plata.id));
    });
  } catch (e) {
    const mesaj = e instanceof Error ? e.message : "eroare necunoscută";
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
      await tx.update(platformPayments).set({ oblioEroare: mesaj.slice(0, 300) }).where(eq(platformPayments.id, plata.id));
    });
    raporteazaEroare("oblio-factura", e, { orgId, orderId: plata.orderId });
  }
}

// IPN Netopia — singurul loc care confirmă o plată de abonament. Niciun acces
// nu se acordă din redirectul clientului, doar de aici, după ce:
//  1. semnătura JWT din `Verification-token` e validă (cheia publică a POS-ului)
//     și hash-ul corpului coincide cu `sub`;
//  2. comanda există în platform_payments, iar suma plătită coincide cu cea
//     calculată de noi la crearea comenzii (nu se are încredere în client);
//  3. prima confirmare a comenzii câștigă (UPDATE condiționat pe status) —
//     un IPN retrimis nu prelungește accesul a doua oară.
// Actualizările rulează în contextul de încredere `app.public_lookup`, ca la
// celelalte webhook-uri (vezi scripts/restore-rls.mjs).

const ACK = { errorType: 0, errorCode: 0, errorMessage: "" };

type IpnBody = {
  payment?: { status?: number; ntpID?: string; amount?: number | string; currency?: string };
  order?: { orderID?: string };
};

export async function POST(req: Request) {
  const corp = await req.text();

  const verificare = verificaIpn(corp, req.headers.get("verification-token"));
  if (!verificare.ok) {
    console.error("IPN Netopia respins:", verificare.motiv);
    return NextResponse.json({ errorType: 2, errorCode: 1, errorMessage: "verificare esuata" }, { status: 400 });
  }

  let body: IpnBody;
  try {
    body = JSON.parse(corp) as IpnBody;
  } catch {
    return NextResponse.json({ errorType: 2, errorCode: 2, errorMessage: "corp invalid" }, { status: 400 });
  }

  const orderId = body.order?.orderID;
  const status = Number(body.payment?.status);
  if (!orderId || !Number.isFinite(status)) {
    return NextResponse.json({ errorType: 2, errorCode: 2, errorMessage: "campuri lipsa" }, { status: 400 });
  }
  const ntpId = body.payment?.ntpID ?? null;
  const suma = Number(body.payment?.amount);
  const decizie = clasificaStatus(status);
  // Setat DOAR când accesul chiar a fost acordat în tranzacția de mai jos — factura
  // se emite după commit, niciodată dintr-o ramură care s-a oprit mai devreme
  // (comandă necunoscută, sumă nepotrivită, IPN retrimis, plată deja procesată).
  let orgIdFacturat: string | null = null;

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);

      // FOR UPDATE: IPN-urile aceleiași comenzi (succes + rambursare, sau
      // retrimiteri) se serializează aici — fără el, o rambursare sosită în timp
      // ce succesul e încă necomis vede statusul vechi "in_asteptare" și se pierde.
      const rows = await tx
        .select()
        .from(platformPayments)
        .where(eq(platformPayments.orderId, orderId))
        .limit(1)
        .for("update");
      const plata = rows[0];
      if (!plata) return; // comandă necunoscută — confirmăm, nu are ce reîncerca

      if (decizie === "reusita") {
        if (!Number.isFinite(suma) || Math.abs(suma - plata.sumaLei) > 0.01 || (body.payment?.currency && body.payment.currency !== "RON")) {
          raporteazaAvertisment("netopia-ipn", "sumă/monedă diferită de comandă — plata NU a fost acordată, verificare manuală", { orderId, primit: suma, asteptat: plata.sumaLei });
          return; // nu acordăm acces pentru o sumă care nu corespunde
        }

        // Exclus și "rambursata", nu doar "reusita": o confirmare de plată
        // veche/întârziată, retrimisă de Netopia DUPĂ ce o rambursare a fost deja
        // procesată, nu are voie s-o readucă la "reusita" și să recrediteze bani
        // deja returnați — "reusita" nu mai e o stare finală o dată rambursată.
        const actualizat = await tx
          .update(platformPayments)
          .set({ status: "reusita", paidAt: new Date(), ntpId, netopiaStatus: status })
          .where(and(eq(platformPayments.id, plata.id), sql`${platformPayments.status} not in ('reusita', 'rambursata')`))
          .returning({ id: platformPayments.id });
        if (!actualizat[0]) return; // deja procesată sau deja rambursată

        // O plată nouă prelungește accesul existent (nu-l suprapune): se adaugă
        // după sfârșitul perioadei curente, dacă aceasta încă e activă. Calculat
        // ATOMIC, direct în UPDATE (GREATEST + interval), nu citit-apoi-scris în
        // JS — altfel două confirmări de plată suprapuse pentru aceeași
        // organizație (retrimitere IPN, două comenzi plătite aproape simultan)
        // pot citi amândouă același currentPeriodEnd vechi înainte ca vreuna să
        // scrie, iar a doua ar suprascrie prima în loc s-o extindă: o lună
        // plătită s-ar pierde silențios. Postgres serializează UPDATE-uri pe
        // ACELAȘI rând (blocare de rând sub MVCC), deci varianta de mai jos e
        // corectă indiferent câte IPN-uri pentru aceeași organizație se
        // procesează concurent. GREATEST ignoră NULL — dacă nu exista încă
        // niciun currentPeriodEnd, pornește de la acum.
        const actualizatOrg = await tx
          .update(organizations)
          .set({
            package: plata.package,
            customPlanConfig: plata.package === "custom" ? plata.planConfig : null,
            subscriptionStatus: "active",
            currentPeriodEnd: sql`greatest(${organizations.currentPeriodEnd}, now()) + (${plata.luni} || ' months')::interval`,
          })
          .where(eq(organizations.id, plata.orgId))
          .returning({ id: organizations.id });
        if (!actualizatOrg[0]) {
          raporteazaAvertisment("netopia-ipn", "organizația comenzii plătite nu mai există", { orderId, orgId: plata.orgId });
        } else {
          orgIdFacturat = plata.orgId;
        }
        return;
      }

      if (decizie === "esuata") {
        await tx
          .update(platformPayments)
          .set({ status: "esuata", netopiaStatus: status, ntpId })
          .where(and(eq(platformPayments.id, plata.id), eq(platformPayments.status, "in_asteptare")));
        return;
      }

      if (decizie === "rambursata") {
        if (plata.status === "rambursata") return;

        // Marcăm rambursată orice comandă neînchisă, nu doar "reusita": o
        // rambursare sosită ÎNAINTEA confirmării de plată (IPN-uri în altă
        // ordine) altfel se pierdea, iar succesul întârziat acorda acces pentru
        // bani deja returnați (ramura de succes exclude "rambursata").
        await tx
          .update(platformPayments)
          .set({ status: "rambursata", netopiaStatus: status })
          .where(eq(platformPayments.id, plata.id));

        // Perioada se scade doar dacă plata acordase-o deja (era "reusita").
        if (plata.status !== "reusita") return;

        // Luna rambursată nu mai e plătită. Scăderea e ATOMICĂ în UPDATE, nu
        // citit-apoi-scris în JS: două IPN-uri concurente pe aceeași organizație
        // (ex. rambursare + o plată nouă) se pierdeau reciproc modificarea.
        const dupa = await tx
          .update(organizations)
          .set({ currentPeriodEnd: sql`${organizations.currentPeriodEnd} - (${plata.luni} || ' months')::interval` })
          .where(eq(organizations.id, plata.orgId))
          .returning({ sfarsit: organizations.currentPeriodEnd });
        const sfarsit = dupa[0]?.sfarsit;
        if (sfarsit && sfarsit <= new Date()) {
          await tx.update(organizations).set({ subscriptionStatus: "canceled" }).where(eq(organizations.id, plata.orgId));
        }
        return;
      }

      // Încă în curs (autentificare 3DS, verificare antifraudă) — doar reținem
      // starea; va veni un IPN final.
      await tx.update(platformPayments).set({ netopiaStatus: status, ntpId }).where(eq(platformPayments.id, plata.id));
    });
  } catch (e) {
    raporteazaEroare("netopia-ipn", e, { orderId });
    return NextResponse.json({ errorType: 1, errorCode: 3, errorMessage: "eroare temporara" }, { status: 500 });
  }

  // Accesul e deja acordat (tranzacția de mai sus s-a încheiat cu succes) — o
  // eroare de facturare de aici nu mai poate anula asta, doar rămâne de regenerat.
  if (orgIdFacturat) await factureazaPlata(orgIdFacturat);

  return NextResponse.json(ACK);
}
