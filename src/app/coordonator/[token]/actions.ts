"use server";

import { and, eq } from "drizzle-orm";

import { verificaLimitaRata } from "@/lib/auth/rate-limit";
import { volunteerShifts, volunteerSignups, volunteerVisitors } from "@/lib/db/schema";
import { qrSvg } from "@/lib/qr";
import { calculeazaOre, textCurat, UUID_REGEX } from "@/lib/voluntari-activitati";
import { rezolvaCodCoordonator } from "@/lib/voluntari-coordonator";
import { qrPrezentaDisponibil, tokenPrezenta } from "@/lib/voluntari-prezenta";
import { cuOrg, URL_BAZA } from "@/lib/voluntari-panou-server";

// Acțiunile PUBLICE ale coordonatorului: totul trece prin codul secret al activității, iar fiecare rând atins trebuie să aparțină
// acelei activități. Coordonatorul marchează prezența; orele se validează doar de administrator.
type Rez<T = object> = ({ ok: true } & T) | { ok: false; eroare: string };
const LINK_INVALID = "Linkul nu mai este valabil. Cere organizației un link nou.";

async function context(token: string) {
  const c = await rezolvaCodCoordonator(token);
  if (!c) return { ok: false, eroare: LINK_INVALID } as const;
  if (!(await verificaLimitaRata("coordonator", token, 200, 5))) return { ok: false, eroare: "Prea multe încercări. Încearcă din nou peste câteva minute." } as const;
  if (c.activitate.stare === "anulata") return { ok: false, eroare: "Activitatea a fost anulată." } as const;
  return { ok: true, c } as const;
}

export async function marcheazaCoordAction(token: string, signupId: string, status: "prezent" | "absent" | "confirmata"): Promise<Rez> {
  if (!UUID_REGEX.test(String(signupId)) || !["prezent", "absent", "confirmata"].includes(status)) return { ok: false, eroare: "Cerere invalidă." };
  const x = await context(token);
  if (!x.ok) return x;
  const { org, activitate } = x.c;
  return cuOrg(org.id, async (tx) => {
    const [i] = await tx
      .select({ id: volunteerSignups.id, status: volunteerSignups.status, oreCalculate: volunteerSignups.oreCalculate, inceputLa: volunteerShifts.inceputLa, seTerminaLa: volunteerShifts.seTerminaLa })
      .from(volunteerSignups)
      .innerJoin(volunteerShifts, eq(volunteerShifts.id, volunteerSignups.shiftId))
      .where(and(eq(volunteerSignups.id, signupId), eq(volunteerSignups.activityId, activitate.id), eq(volunteerSignups.orgId, org.id)))
      .limit(1);
    if (!i) return { ok: false as const, eroare: "Înscrierea nu mai există." };
    if (!["confirmata", "prezent", "absent"].includes(i.status)) return { ok: false as const, eroare: "Doar cei confirmați pot fi marcați." };
    const acum = new Date();
    await tx
      .update(volunteerSignups)
      .set({
        status,
        oreCalculate: status === "prezent" ? String(i.oreCalculate != null ? Number(i.oreCalculate) : calculeazaOre(i.inceputLa, i.seTerminaLa)) : null,
        checkinLa: status === "prezent" ? acum : null,
        oreValidate: null,
        validatLa: null,
        validatDe: null,
        updatedAt: acum,
      })
      .where(eq(volunteerSignups.id, i.id));
    return { ok: true as const };
  });
}

// Un voluntar care a venit fără înscriere: se adaugă pe loc (doar prenumele), marcat „la fața locului”.
export async function adaugaLaFataLoculuiAction(token: string, shiftId: string, prenumeBrut: string): Promise<Rez> {
  const prenume = textCurat(prenumeBrut, 40).replace(/[<>]/g, "");
  if (prenume.length < 2) return { ok: false, eroare: "Scrie prenumele (cel puțin 2 caractere)." };
  if (!UUID_REGEX.test(String(shiftId))) return { ok: false, eroare: "Cerere invalidă." };
  const x = await context(token);
  if (!x.ok) return x;
  const { org, activitate } = x.c;
  return cuOrg(org.id, async (tx) => {
    const [t] = await tx
      .select({ id: volunteerShifts.id, inceputLa: volunteerShifts.inceputLa, seTerminaLa: volunteerShifts.seTerminaLa })
      .from(volunteerShifts)
      .where(and(eq(volunteerShifts.id, shiftId), eq(volunteerShifts.activityId, activitate.id), eq(volunteerShifts.orgId, org.id)))
      .limit(1);
    if (!t) return { ok: false as const, eroare: "Tura nu mai există." };
    const [v] = await tx.insert(volunteerVisitors).values({ orgId: org.id, prenume }).returning({ id: volunteerVisitors.id });
    await tx.insert(volunteerSignups).values({
      orgId: org.id,
      activityId: activitate.id,
      shiftId,
      visitorId: v.id,
      status: "prezent",
      oreCalculate: String(calculeazaOre(t.inceputLa, t.seTerminaLa)),
      checkinLa: new Date(),
      observatii: "la fata locului",
    });
    return { ok: true as const };
  });
}

// Codul QR curent al unei ture (se schimbă la fiecare 5 minute; pagina îl reia singură).
export async function qrCurentAction(token: string, shiftId: string): Promise<Rez<{ svg: string }>> {
  if (!UUID_REGEX.test(String(shiftId))) return { ok: false, eroare: "Cerere invalidă." };
  const x = await context(token);
  if (!x.ok) return x;
  const { org, activitate, codVoluntari } = x.c;
  if (!qrPrezentaDisponibil()) return { ok: false, eroare: "Codul QR nu e activat pe acest server. Marchează prezența din listă." };
  if (!codVoluntari) return { ok: false, eroare: "Organizația nu are un link de voluntari activ." };
  const [t] = await cuOrg(org.id, (tx) =>
    tx.select({ id: volunteerShifts.id }).from(volunteerShifts).where(and(eq(volunteerShifts.id, shiftId), eq(volunteerShifts.activityId, activitate.id), eq(volunteerShifts.orgId, org.id))).limit(1),
  );
  if (!t) return { ok: false, eroare: "Tura nu mai există." };
  const tokenPrez = tokenPrezenta(shiftId);
  if (!tokenPrez) return { ok: false, eroare: "Codul QR nu e disponibil." };
  const url = `${URL_BAZA()}/voluntar/${codVoluntari}/prezenta/${shiftId}?t=${tokenPrez}`;
  return { ok: true, svg: qrSvg(url, "100%", "#14213d") };
}
