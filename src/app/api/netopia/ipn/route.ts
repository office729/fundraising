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

function plusLuni(data: Date, luni: number): Date {
  const r = new Date(data);
  r.setMonth(r.getMonth() + luni);
  return r;
}

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

      const rows = await tx.select().from(platformPayments).where(eq(platformPayments.orderId, orderId)).limit(1);
      const plata = rows[0];
      if (!plata) return; // comandă necunoscută — confirmăm, nu are ce reîncerca

      if (decizie === "reusita") {
        if (!Number.isFinite(suma) || Math.abs(suma - plata.sumaLei) > 0.01 || (body.payment?.currency && body.payment.currency !== "RON")) {
          console.error("IPN Netopia: sumă/monedă diferită de comandă", { orderId, primit: suma, asteptat: plata.sumaLei });
          return; // nu acordăm acces pentru o sumă care nu corespunde
        }

        const actualizat = await tx
          .update(platformPayments)
          .set({ status: "reusita", paidAt: new Date(), ntpId, netopiaStatus: status })
          .where(and(eq(platformPayments.id, plata.id), sql`${platformPayments.status} <> 'reusita'`))
          .returning({ id: platformPayments.id });
        if (!actualizat[0]) return; // deja procesată

        const org = (await tx.select().from(organizations).where(eq(organizations.id, plata.orgId)).limit(1))[0];
        if (!org) return;
        const acum = new Date();
        // O plată nouă prelungește accesul existent (nu-l suprapune): se adaugă
        // după sfârșitul perioadei curente, dacă aceasta încă e activă.
        const baza =
          org.subscriptionStatus === "active" && org.currentPeriodEnd && org.currentPeriodEnd > acum ? org.currentPeriodEnd : acum;

        await tx
          .update(organizations)
          .set({
            package: plata.package,
            customPlanConfig: plata.package === "custom" ? plata.planConfig : null,
            subscriptionStatus: "active",
            currentPeriodEnd: plusLuni(baza, plata.luni),
          })
          .where(eq(organizations.id, plata.orgId));
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
        const actualizat = await tx
          .update(platformPayments)
          .set({ status: "rambursata", netopiaStatus: status })
          .where(and(eq(platformPayments.id, plata.id), eq(platformPayments.status, "reusita")))
          .returning({ id: platformPayments.id });
        if (!actualizat[0]) return;

        // Luna rambursată nu mai e plătită: scădem perioada acordată de ea.
        const org = (await tx.select().from(organizations).where(eq(organizations.id, plata.orgId)).limit(1))[0];
        if (!org?.currentPeriodEnd) return;
        const nouSfarsit = plusLuni(org.currentPeriodEnd, -plata.luni);
        await tx
          .update(organizations)
          .set({ currentPeriodEnd: nouSfarsit, ...(nouSfarsit <= new Date() ? { subscriptionStatus: "canceled" as const } : {}) })
          .where(eq(organizations.id, plata.orgId));
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
