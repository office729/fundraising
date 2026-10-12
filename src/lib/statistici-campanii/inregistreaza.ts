"use server";

import { createHmac } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";

import { obtineIpClient, verificaLimitaRata } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { campaignPageEvents, fundraisingPages, organizations } from "@/lib/db/schema";
import { raporteazaEroare } from "@/lib/monitoring";

import { clasificaDispozitiv, clasificaSursa, curataEticheta, esteBot, gazdaDinReferrer } from "./clasificare";

export type TipEveniment = "vizita" | "deschide_donatia";

const ziuaRo = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

// Înregistrează o vizualizare sau deschiderea formularului de donație pe o pagină publică de campanie.
// Fără cookie-uri și fără scripturi externe; nu se păstrează IP-ul, browserul sau adresa completă de proveniență.
// Nu aruncă niciodată: măsurarea nu are voie să strice pagina de donații.
export async function inregistreazaEveniment(
  orgSlug: string,
  pageSlug: string,
  tip: TipEveniment,
  context: { referrer?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string } = {},
): Promise<void> {
  try {
    if (tip !== "vizita" && tip !== "deschide_donatia") return;
    const h = await headers();
    // Respectăm semnalele „nu mă urmări” ale browserului.
    if (h.get("dnt") === "1" || h.get("sec-gpc") === "1") return;
    const ua = h.get("user-agent");
    if (esteBot(ua)) return;
    // Membrii echipei (sesiune de autentificare) care își privesc propriile campanii nu se numără ca public.
    const biscuiti = await cookies();
    if (biscuiti.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"))) return;

    const ip = await obtineIpClient();
    if (!(await verificaLimitaRata("campanie-eveniment", ip, 120, 10))) return;

    const ziua = ziuaRo();
    // Fără cheie dedicată nu înregistrăm nimic (o cheie de rezervă ar face amprenta zilnică ușor de regăsit din IP).
    const cheie = process.env.ORG_SECRETS_KEY;
    if (!cheie) return;
    // Amprentă care se schimbă zilnic: permite „vizitatori unici pe zi”, nu urmărirea între zile.
    const vizitator = createHmac("sha256", cheie).update(`${ziua}|${ip}|${ua}`).digest("hex").slice(0, 32);

    const gazdeProprii = [h.get("host") ?? "", new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://alexandrit.ro").hostname]
      .map((x) => x.replace(/^www\./, "").split(":")[0]!)
      .filter(Boolean);
    const { sursa, detaliu } = clasificaSursa({
      referrerHost: gazdaDinReferrer(context.referrer),
      utmSource: curataEticheta(context.utmSource),
      utmMedium: curataEticheta(context.utmMedium),
      gazdeProprii,
    });
    const tara = /^[A-Za-z]{2}$/.test(h.get("x-vercel-ip-country") ?? "") ? h.get("x-vercel-ip-country")!.toUpperCase() : null;

    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
      const [pagina] = await tx
        .select({ id: fundraisingPages.id, orgId: fundraisingPages.orgId })
        .from(fundraisingPages)
        .innerJoin(organizations, eq(organizations.id, fundraisingPages.orgId))
        .where(and(eq(organizations.slug, orgSlug), eq(fundraisingPages.slug, pageSlug)))
        .limit(1);
      if (!pagina) return;
      // Scrierea trece prin izolarea pe organizație, ca orice altă scriere de tenant.
      await tx.execute(sql`select set_config('app.current_org_id', ${pagina.orgId}, true)`);
      await tx.insert(campaignPageEvents).values({
        orgId: pagina.orgId,
        pageId: pagina.id,
        tip,
        ziua,
        vizitator,
        sursa,
        sursaDetaliu: detaliu,
        utmCampanie: curataEticheta(context.utmCampaign),
        dispozitiv: clasificaDispozitiv(ua),
        tara,
      });
    });
  } catch (e) {
    raporteazaEroare("statistici-campanii-inregistrare", e, { tip });
  }
}
