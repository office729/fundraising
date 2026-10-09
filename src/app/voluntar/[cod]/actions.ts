"use server";

import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { obtineIpClient, verificaLimitaRata } from "@/lib/auth/rate-limit";
import { volunteerShares, volunteerVisitors } from "@/lib/db/schema";
import { esteCanal, normalizeazaTelefon, ziuaRo } from "@/lib/voluntari-panou";
import {
  campaniiVizibile,
  cifreVoluntar,
  cuOrg,
  gasesteVoluntarDupaTelefon,
  numeCookieVoluntar,
  rezolvaCod,
  UN_AN_SECUNDE,
  vizitatorDinCookie,
} from "@/lib/voluntari-panou-server";

// Acțiunile PUBLICE ale panoului voluntarilor. Fiecare verifică întâi codul linkului, apoi (unde e cazul) cookie-ul voluntarului.
// Mesajele de eroare sunt generice: nu spun nimic despre ce există sau nu în baza de date.
export type Rezultat<T = object> = ({ ok: true } & T) | { ok: false; eroare: string };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LINK_INVALID = "Linkul nu mai este valabil. Cere echipei un link nou.";
const PREA_MULTE = "Prea multe încercări. Încearcă din nou peste câteva minute.";

function curataPrenume(s: string): string {
  return s.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim();
}

export async function intraAction(cod: string, prenumeBrut: string, telefonBrut: string): Promise<Rezultat> {
  const prenume = curataPrenume(String(prenumeBrut ?? ""));
  if (prenume.length < 2 || prenume.length > 40) return { ok: false, eroare: "Scrie-ți prenumele (între 2 și 40 de caractere)." };
  const telefonText = String(telefonBrut ?? "").trim();
  const telefon = telefonText ? normalizeazaTelefon(telefonText) : null;
  if (telefonText && !telefon) return { ok: false, eroare: "Numărul de telefon nu pare complet. Lasă câmpul gol dacă nu vrei să-l scrii." };

  const ip = await obtineIpClient();
  if (!(await verificaLimitaRata("voluntar-intrare", ip, 15, 10))) return { ok: false, eroare: PREA_MULTE };
  const link = await rezolvaCod(cod);
  if (!link) return { ok: false, eroare: LINK_INVALID };
  const poateLega = telefon ? await verificaLimitaRata("voluntar-legare", ip, 5, 10) : false;

  const id = await cuOrg(link.org.id, async (tx) => {
    const voluntarId = telefon && poateLega ? await gasesteVoluntarDupaTelefon(tx, link.org.id, telefon) : null;
    const [rand] = await tx
      .insert(volunteerVisitors)
      .values({ orgId: link.org.id, prenume, telefon, voluntarId, legatLa: voluntarId ? new Date() : null })
      .returning({ id: volunteerVisitors.id });
    return rand.id;
  });

  (await cookies()).set(numeCookieVoluntar(link.org.id), id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/voluntar",
    maxAge: UN_AN_SECUNDE,
  });
  return { ok: true };
}

// Voluntarul care a intrat fără telefon și vrea să fie recunoscut în lista echipei.
export async function adaugaTelefonAction(cod: string, telefonBrut: string): Promise<Rezultat<{ legat: boolean }>> {
  const telefon = normalizeazaTelefon(String(telefonBrut ?? ""));
  if (!telefon) return { ok: false, eroare: "Numărul de telefon nu pare complet." };
  const ip = await obtineIpClient();
  if (!(await verificaLimitaRata("voluntar-legare", ip, 5, 10))) return { ok: false, eroare: PREA_MULTE };
  const link = await rezolvaCod(cod);
  if (!link) return { ok: false, eroare: LINK_INVALID };

  return cuOrg(link.org.id, async (tx) => {
    const v = await vizitatorDinCookie(tx, link.org.id);
    if (!v) return { ok: false as const, eroare: "Sesiunea a expirat. Reîncarcă pagina." };
    const voluntarId = await gasesteVoluntarDupaTelefon(tx, link.org.id, telefon);
    await tx
      .update(volunteerVisitors)
      .set({ telefon, voluntarId, legatLa: voluntarId ? new Date() : null })
      .where(and(eq(volunteerVisitors.id, v.id), eq(volunteerVisitors.orgId, link.org.id)));
    return { ok: true as const, legat: voluntarId !== null };
  });
}

// Bifează sau debifează „am distribuit” pentru o campanie pe un canal, azi. Un voluntar poate modifica doar bifele lui, doar pentru ziua curentă.
export async function bifeazaAction(cod: string, campaignId: string, canal: string, bifat: boolean): Promise<Rezultat<{ total: number; azi: number }>> {
  if (!UUID_REGEX.test(String(campaignId)) || !esteCanal(canal)) return { ok: false, eroare: "Cerere invalidă." };
  const link = await rezolvaCod(cod);
  if (!link) return { ok: false, eroare: LINK_INVALID };
  const orgId = link.org.id;

  const v = await cuOrg(orgId, (tx) => vizitatorDinCookie(tx, orgId));
  if (!v) return { ok: false, eroare: "Sesiunea a expirat. Reîncarcă pagina." };
  if (!(await verificaLimitaRata("voluntar-bifa", v.id, 60, 1))) return { ok: false, eroare: PREA_MULTE };

  return cuOrg(orgId, async (tx) => {
    const ziua = ziuaRo();
    if (bifat) {
      const vizibile = await campaniiVizibile(tx, orgId);
      if (!vizibile.some((c) => c.id === campaignId)) return { ok: false as const, eroare: "Campania nu mai este disponibilă." };
      await tx.insert(volunteerShares).values({ orgId, visitorId: v.id, campaignPageId: campaignId, canal, ziua }).onConflictDoNothing();
    } else {
      await tx
        .delete(volunteerShares)
        .where(
          and(
            eq(volunteerShares.orgId, orgId),
            eq(volunteerShares.visitorId, v.id),
            eq(volunteerShares.campaignPageId, campaignId),
            eq(volunteerShares.canal, canal),
            eq(volunteerShares.ziua, ziua),
          ),
        );
    }
    const cifre = await cifreVoluntar(tx, orgId, v.id);
    return { ok: true as const, ...cifre };
  });
}
