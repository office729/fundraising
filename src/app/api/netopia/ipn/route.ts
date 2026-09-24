import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { organizations, platformPayments } from "@/lib/db/schema";
import { clasificaStatus, verificaIpn } from "@/lib/netopia";

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
          console.error("IPN Netopia: sumă/monedă diferită de comandă", { orderId, primit: suma, asteptat: plata.sumaLei });
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
          console.error("IPN Netopia: organizația comenzii nu mai există", { orderId, orgId: plata.orgId });
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
    console.error("Eroare la procesarea IPN Netopia:", e);
    return NextResponse.json({ errorType: 1, errorCode: 3, errorMessage: "eroare temporara" }, { status: 500 });
  }

  return NextResponse.json(ACK);
}
