"use server";

import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";

import { obtineIpClient, verificaLimitaRata } from "@/lib/auth/rate-limit";
import { volunteerActivities, volunteerReports, volunteerShifts, volunteerSignups, volunteerTaskEngagements, volunteerTasks, volunteerVisitors } from "@/lib/db/schema";
import { emailConfigurat, trimiteEmail } from "@/lib/email";
import { calculeazaOre, emailValid, MAX, normalizeazaLink, sarcinaDeschisa, statusInscriereNoua, textCurat, UUID_REGEX } from "@/lib/voluntari-activitati";
import { blocheazaTura, locuriOcupate, promoveazaDinRezerva } from "@/lib/voluntari-inscrieri";
import { inFereastraCheckin, tokenPrezentaValid } from "@/lib/voluntari-prezenta";
import { ziuaRo } from "@/lib/voluntari-panou";
import { emailConfirmare } from "@/lib/voluntari-email-template";
import { cuOrg, numeCookieVoluntar, rezolvaCod, URL_BAZA, vizitatorDinCookie } from "@/lib/voluntari-panou-server";

// Acțiunile PUBLICE ale voluntarului pentru sarcini online și activități pe teren. Fiecare verifică întâi codul linkului, apoi
// cookie-ul voluntarului; un voluntar poate modifica doar propriile implicări și înscrieri. Mesajele de eroare sunt scurte și generice.
type Rez<T = object> = ({ ok: true } & T) | { ok: false; eroare: string };
const LINK_INVALID = "Linkul nu mai este valabil. Cere echipei un link nou.";
const SESIUNE = "Sesiunea a expirat. Reîncarcă pagina.";
const PREA_MULTE = "Prea multe încercări. Încearcă din nou peste câteva minute.";

type Context = { ok: false; eroare: string } | { ok: true; org: { id: string; nume: string }; v: { id: string } };
async function contextVoluntar(cod: string): Promise<Context> {
  const link = await rezolvaCod(cod);
  if (!link) return { ok: false, eroare: LINK_INVALID };
  const v = await cuOrg(link.org.id, (tx) => vizitatorDinCookie(tx, link.org.id));
  if (!v) return { ok: false, eroare: SESIUNE };
  if (!(await verificaLimitaRata("voluntar-actiune", v.id, 60, 5))) return { ok: false, eroare: PREA_MULTE };
  return { ok: true, org: link.org, v };
}

// ===== Sarcini online =====
export async function maImplicAction(cod: string, taskId: string): Promise<Rez> {
  if (!UUID_REGEX.test(String(taskId))) return { ok: false, eroare: "Cerere invalidă." };
  const c = await contextVoluntar(cod);
  if (!c.ok) return c;
  return cuOrg(c.org.id, async (tx) => {
    const [s] = await tx
      .select({ stare: volunteerTasks.stare, inceputLa: volunteerTasks.inceputLa, termen: volunteerTasks.termen, nrVoluntari: volunteerTasks.nrVoluntari })
      .from(volunteerTasks)
      .where(and(eq(volunteerTasks.id, taskId), eq(volunteerTasks.orgId, c.org.id)))
      .limit(1);
    if (!s) return { ok: false as const, eroare: "Sarcina nu mai este disponibilă." };
    const [fin] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(volunteerTaskEngagements)
      .where(and(eq(volunteerTaskEngagements.taskId, taskId), eq(volunteerTaskEngagements.orgId, c.org.id), eq(volunteerTaskEngagements.stare, "finalizat")));
    if (!sarcinaDeschisa({ ...s, finalizari: fin?.n ?? 0 }, ziuaRo())) return { ok: false as const, eroare: "Sarcina nu mai este disponibilă." };
    await tx
      .insert(volunteerTaskEngagements)
      .values({ orgId: c.org.id, taskId, visitorId: c.v.id, stare: "angajat" })
      .onConflictDoUpdate({ target: [volunteerTaskEngagements.taskId, volunteerTaskEngagements.visitorId], set: { stare: "angajat", finalizatLa: null }, setWhere: eq(volunteerTaskEngagements.stare, "renuntat") });
    return { ok: true as const };
  });
}

export async function finalizeazaSarcinaAction(cod: string, taskId: string, linkPostareBrut: string): Promise<Rez> {
  if (!UUID_REGEX.test(String(taskId))) return { ok: false, eroare: "Cerere invalidă." };
  const brut = textCurat(linkPostareBrut, MAX.linkPostare);
  const linkPostare = brut ? normalizeazaLink(brut) : null;
  if (brut && !linkPostare) return { ok: false, eroare: "Linkul postării trebuie să înceapă cu https://. Poți lăsa câmpul gol." };
  const c = await contextVoluntar(cod);
  if (!c.ok) return c;
  return cuOrg(c.org.id, async (tx) => {
    const r = await tx
      .update(volunteerTaskEngagements)
      .set({ stare: "finalizat", linkPostare, confirmat: true, finalizatLa: new Date() })
      .where(and(eq(volunteerTaskEngagements.taskId, taskId), eq(volunteerTaskEngagements.visitorId, c.v.id), eq(volunteerTaskEngagements.orgId, c.org.id)))
      .returning({ id: volunteerTaskEngagements.id });
    return r[0] ? { ok: true as const } : { ok: false as const, eroare: "Apasă mai întâi „Mă implic”." };
  });
}

// „Nu pot acum”: renunțare fără explicații și fără insistențe ulterioare.
export async function renuntaSarcinaAction(cod: string, taskId: string): Promise<Rez> {
  if (!UUID_REGEX.test(String(taskId))) return { ok: false, eroare: "Cerere invalidă." };
  const c = await contextVoluntar(cod);
  if (!c.ok) return c;
  return cuOrg(c.org.id, async (tx) => {
    await tx
      .update(volunteerTaskEngagements)
      .set({ stare: "renuntat", finalizatLa: null })
      .where(and(eq(volunteerTaskEngagements.taskId, taskId), eq(volunteerTaskEngagements.visitorId, c.v.id), eq(volunteerTaskEngagements.orgId, c.org.id), eq(volunteerTaskEngagements.stare, "angajat")));
    return { ok: true as const };
  });
}

// ===== Activități pe teren =====
async function trimiteConfirmare(email: string | null, cod: string, orgNume: string, titlu: string, locatie: string, inceputLa: Date, rol: string) {
  if (!email || !emailConfigurat()) return;
  try {
    const mail = emailConfirmare({ org: orgNume, titlu, locatie, inceputLa, rol, link: `${URL_BAZA()}/voluntar/${cod}` });
    await trimiteEmail({ to: email, subiect: mail.subiect, html: mail.html });
  } catch {
    // Un email eșuat nu trebuie să strice înscrierea.
  }
}

export async function inscrieAction(cod: string, shiftId: string): Promise<Rez<{ status: string }>> {
  if (!UUID_REGEX.test(String(shiftId))) return { ok: false, eroare: "Cerere invalidă." };
  const c = await contextVoluntar(cod);
  if (!c.ok) return c;

  const rezultat = await cuOrg(c.org.id, async (tx) => {
    const tura = await blocheazaTura(tx, c.org.id, shiftId);
    if (!tura) return { ok: false as const, eroare: "Tura nu mai există." };
    const [activitate] = await tx
      .select({ titlu: volunteerActivities.titlu, locatie: volunteerActivities.locatie, aprobare: volunteerActivities.aprobare, stare: volunteerActivities.stare, seTerminaLa: volunteerActivities.seTerminaLa })
      .from(volunteerActivities)
      .where(and(eq(volunteerActivities.id, tura.activityId), eq(volunteerActivities.orgId, c.org.id)))
      .limit(1);
    if (!activitate || activitate.stare !== "publicata" || activitate.seTerminaLa.getTime() < Date.now()) return { ok: false as const, eroare: "Activitatea nu mai primește înscrieri." };
    const [tInfo] = await tx.select({ nume: volunteerShifts.nume, inceputLa: volunteerShifts.inceputLa }).from(volunteerShifts).where(eq(volunteerShifts.id, shiftId)).limit(1);

    const [exista] = await tx
      .select({ id: volunteerSignups.id, status: volunteerSignups.status })
      .from(volunteerSignups)
      .where(and(eq(volunteerSignups.shiftId, shiftId), eq(volunteerSignups.visitorId, c.v.id), eq(volunteerSignups.orgId, c.org.id)))
      .limit(1);
    if (exista && exista.status !== "anulata") return { ok: false as const, eroare: "Ești deja înscris(ă) la această tură." };

    const status = statusInscriereNoua(activitate.aprobare, await locuriOcupate(tx, c.org.id, shiftId), tura.locuri);
    if (exista) await tx.update(volunteerSignups).set({ status, updatedAt: new Date() }).where(eq(volunteerSignups.id, exista.id));
    else await tx.insert(volunteerSignups).values({ orgId: c.org.id, activityId: tura.activityId, shiftId, visitorId: c.v.id, status });
    const [vi] = await tx.select({ email: volunteerVisitors.email }).from(volunteerVisitors).where(eq(volunteerVisitors.id, c.v.id)).limit(1);
    return { ok: true as const, status, email: vi?.email ?? null, activitate, tInfo };
  });
  if (!rezultat.ok) return rezultat;
  if (rezultat.status === "confirmata" && rezultat.tInfo) await trimiteConfirmare(rezultat.email, cod, c.org.nume, rezultat.activitate.titlu, rezultat.activitate.locatie, rezultat.tInfo.inceputLa, rezultat.tInfo.nume);
  return { ok: true, status: rezultat.status };
}

export async function anuleazaInscriereAction(cod: string, signupId: string): Promise<Rez> {
  if (!UUID_REGEX.test(String(signupId))) return { ok: false, eroare: "Cerere invalidă." };
  const c = await contextVoluntar(cod);
  if (!c.ok) return c;
  const promovat = await cuOrg(c.org.id, async (tx) => {
    const [i] = await tx
      .select({ id: volunteerSignups.id, status: volunteerSignups.status, shiftId: volunteerSignups.shiftId })
      .from(volunteerSignups)
      .where(and(eq(volunteerSignups.id, signupId), eq(volunteerSignups.visitorId, c.v.id), eq(volunteerSignups.orgId, c.org.id)))
      .limit(1);
    if (!i) return { ok: false as const, eroare: "Înscrierea nu mai există." };
    if (!["confirmata", "in_asteptare", "rezerva"].includes(i.status)) return { ok: false as const, eroare: "Această înscriere nu mai poate fi anulată." };
    await tx.update(volunteerSignups).set({ status: "anulata", updatedAt: new Date() }).where(eq(volunteerSignups.id, i.id));
    const idPromovat = await promoveazaDinRezerva(tx, c.org.id, i.shiftId);
    let notifica: { email: string; titlu: string; locatie: string; inceputLa: Date; rol: string } | null = null;
    if (idPromovat) {
      const [p] = await tx
        .select({ email: volunteerVisitors.email, titlu: volunteerActivities.titlu, locatie: volunteerActivities.locatie, inceputLa: volunteerShifts.inceputLa, rol: volunteerShifts.nume })
        .from(volunteerSignups)
        .innerJoin(volunteerVisitors, eq(volunteerVisitors.id, volunteerSignups.visitorId))
        .innerJoin(volunteerActivities, eq(volunteerActivities.id, volunteerSignups.activityId))
        .innerJoin(volunteerShifts, eq(volunteerShifts.id, volunteerSignups.shiftId))
        .where(eq(volunteerSignups.id, idPromovat))
        .limit(1);
      if (p?.email) notifica = { email: p.email, titlu: p.titlu, locatie: p.locatie, inceputLa: p.inceputLa, rol: p.rol };
    }
    return { ok: true as const, notifica };
  });
  if (!promovat.ok) return promovat;
  if (promovat.notifica) await trimiteConfirmare(promovat.notifica.email, cod, c.org.nume, promovat.notifica.titlu, promovat.notifica.locatie, promovat.notifica.inceputLa, promovat.notifica.rol);
  return { ok: true };
}

// ===== Contact, raportare, ștergerea datelor =====
export async function salveazaEmailAction(cod: string, emailBrut: string, acordInvitatii: boolean): Promise<Rez> {
  const email = textCurat(emailBrut, 120).toLowerCase();
  if (email && !emailValid(email)) return { ok: false, eroare: "Adresa de email nu pare completă." };
  const c = await contextVoluntar(cod);
  if (!c.ok) return c;
  // Fără email nu are sens acordul pentru invitații: se șterg împreună.
  await cuOrg(c.org.id, (tx) =>
    tx
      .update(volunteerVisitors)
      .set({ email: email || null, acordInvitatii: !!email && !!acordInvitatii })
      .where(and(eq(volunteerVisitors.id, c.v.id), eq(volunteerVisitors.orgId, c.org.id))),
  );
  return { ok: true };
}

export async function raporteazaProblemaAction(cod: string, descriereBruta: string, activityId: string | null): Promise<Rez> {
  const descriere = textCurat(descriereBruta, MAX.problema);
  if (descriere.length < 5) return { ok: false, eroare: "Descrie pe scurt problema." };
  const ip = await obtineIpClient();
  if (!(await verificaLimitaRata("voluntar-raport", ip, 5, 10))) return { ok: false, eroare: PREA_MULTE };
  const c = await contextVoluntar(cod);
  if (!c.ok) return c;
  await cuOrg(c.org.id, async (tx) => {
    let activitate: string | null = null;
    if (activityId && UUID_REGEX.test(activityId)) {
      const [a] = await tx.select({ id: volunteerActivities.id }).from(volunteerActivities).where(and(eq(volunteerActivities.id, activityId), eq(volunteerActivities.orgId, c.org.id))).limit(1);
      activitate = a?.id ?? null;
    }
    await tx.insert(volunteerReports).values({ orgId: c.org.id, visitorId: c.v.id, activityId: activitate, descriere });
  });
  return { ok: true };
}

// Dreptul la ștergere: voluntarul își șterge singur datele (profil, implicări, înscrieri). Orele deja validate dispar odată cu el.
export async function stergeDateleMeleAction(cod: string): Promise<Rez> {
  const c = await contextVoluntar(cod);
  if (!c.ok) return c;
  await cuOrg(c.org.id, (tx) => tx.delete(volunteerVisitors).where(and(eq(volunteerVisitors.id, c.v.id), eq(volunteerVisitors.orgId, c.org.id))));
  (await cookies()).delete({ name: numeCookieVoluntar(c.org.id), path: "/voluntar" });
  return { ok: true };
}


// Check-in prin cod QR: valid doar cu tokenul curent al turei (se schimbă la 5 minute), în fereastra turei, pentru un voluntar confirmat.
export async function checkInAction(cod: string, shiftId: string, token: string): Promise<Rez> {
  if (!UUID_REGEX.test(String(shiftId)) || !tokenPrezentaValid(shiftId, token)) return { ok: false, eroare: "Codul a expirat. Scanează din nou codul curent." };
  const c = await contextVoluntar(cod);
  if (!c.ok) return c;
  return cuOrg(c.org.id, async (tx) => {
    const [t] = await tx
      .select({ inceputLa: volunteerShifts.inceputLa, seTerminaLa: volunteerShifts.seTerminaLa, stare: volunteerActivities.stare })
      .from(volunteerShifts)
      .innerJoin(volunteerActivities, eq(volunteerActivities.id, volunteerShifts.activityId))
      .where(and(eq(volunteerShifts.id, shiftId), eq(volunteerShifts.orgId, c.org.id)))
      .limit(1);
    if (!t || t.stare === "anulata") return { ok: false as const, eroare: "Activitatea nu mai este disponibilă." };
    if (!inFereastraCheckin(t.inceputLa, t.seTerminaLa)) return { ok: false as const, eroare: "Prezența se poate confirma doar în jurul turei." };
    const r = await tx
      .update(volunteerSignups)
      .set({ status: "prezent", oreCalculate: String(calculeazaOre(t.inceputLa, t.seTerminaLa)), checkinLa: new Date(), updatedAt: new Date() })
      .where(and(eq(volunteerSignups.shiftId, shiftId), eq(volunteerSignups.visitorId, c.v.id), eq(volunteerSignups.orgId, c.org.id), eq(volunteerSignups.status, "confirmata")))
      .returning({ id: volunteerSignups.id });
    return r[0] ? { ok: true as const } : { ok: false as const, eroare: "Nu ești confirmat(ă) la această tură." };
  });
}
