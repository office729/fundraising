"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/billing/trial";
import { programariConfig, programariDisponibilitate, programariExceptii, programariTipuri } from "@/lib/db/schema";
import { EroareUtilizator } from "@/lib/erori";
import { ETICHETE_STARE as ETICHETE_STARE_LEAD } from "@/lib/lead-uri";
import { dateAdministrare, inContextPlatforma, listeazaProgramari, programeazaDeEchipa, randDupaToken, schimbaStareDeEchipa, sloturiZi, zileDisponibile, type DateAdmin, type RandProgramare } from "@/lib/programari/server";
import { curataSetari, esteData, esteOra, oraScurta, type Interval, type Slot } from "@/lib/programari/sloturi";
import { listeazaOrganizatiiAction } from "../actions";
import { listeazaLeaduriAction } from "../lead-uri/actions";

// Doar contul platformei: programul disponibil, tipurile de întâlniri, setările și programările primite.
async function cerePlatformAdmin(): Promise<string> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login");
  if (!isPlatformAdmin(authUser.email)) throw new EroareUtilizator("Acces interzis.");
  return authUser.email;
}
const reimprospateaza = () => {
  revalidatePath("/platform-admin/programari");
  revalidatePath("/programare");
};

export async function incarcaProgramariAction(): Promise<{ randuri: RandProgramare[]; date: DateAdmin }> {
  await cerePlatformAdmin();
  return { randuri: await listeazaProgramari(), date: await dateAdministrare() };
}

export type Rezultat = { ok: true } | { ok: false; eroare: string };

export async function salveazaSetariAction(setari: unknown): Promise<Rezultat> {
  const email = await cerePlatformAdmin();
  const curate = curataSetari(setari);
  await inContextPlatforma((tx) =>
    tx
      .insert(programariConfig)
      .values({ id: 1, config: curate, actualizatLa: new Date(), actualizatDe: email })
      .onConflictDoUpdate({ target: programariConfig.id, set: { config: curate, actualizatLa: new Date(), actualizatDe: email } }),
  );
  reimprospateaza();
  return { ok: true };
}

// Programul săptămânal se înlocuiește integral cu ce e în formular (intervalele invalide sau care se suprapun sunt refuzate cu un mesaj clar).
export async function salveazaProgramAction(intervale: Interval[]): Promise<Rezultat> {
  await cerePlatformAdmin();
  if (!Array.isArray(intervale) || intervale.length > 70) return { ok: false, eroare: "Program invalid." };
  const curate: Interval[] = [];
  for (const i of intervale) {
    const zi = Number(i?.zi);
    if (!Number.isInteger(zi) || zi < 1 || zi > 7 || !esteOra(i.de) || !esteOra(i.pana)) return { ok: false, eroare: "Completează orele în forma 09:00." };
    if (oraScurta(i.pana) <= oraScurta(i.de)) return { ok: false, eroare: "Ora de sfârșit trebuie să fie după ora de început." };
    curate.push({ zi, de: oraScurta(i.de), pana: oraScurta(i.pana) });
  }
  for (let z = 1; z <= 7; z++) {
    const zi = curate.filter((i) => i.zi === z).sort((a, b) => a.de.localeCompare(b.de));
    for (let k = 1; k < zi.length; k++) if (zi[k]!.de < zi[k - 1]!.pana) return { ok: false, eroare: "Două intervale din aceeași zi se suprapun." };
  }
  await inContextPlatforma(async (tx) => {
    await tx.delete(programariDisponibilitate);
    if (curate.length) await tx.insert(programariDisponibilitate).values(curate.map((i) => ({ zi: i.zi, deLa: i.de, panaLa: i.pana })));
  });
  reimprospateaza();
  return { ok: true };
}

export async function salveazaExceptiiAction(exceptii: DateAdmin["exceptii"]): Promise<Rezultat> {
  await cerePlatformAdmin();
  if (!Array.isArray(exceptii) || exceptii.length > 400) return { ok: false, eroare: "Listă invalidă." };
  const curate: { data: string; tip: string; deLa: string | null; panaLa: string | null; nota: string | null }[] = [];
  for (const e of exceptii) {
    if (!esteData(e?.data)) return { ok: false, eroare: "Data nu e validă." };
    if (e.tip === "liber") curate.push({ data: e.data, tip: "liber", deLa: null, panaLa: null, nota: String(e.nota ?? "").trim().slice(0, 120) || null });
    else if (e.tip === "program") {
      if (!esteOra(e.de) || !esteOra(e.pana) || oraScurta(e.pana) <= oraScurta(e.de)) return { ok: false, eroare: `Program special la ${e.data}: completează ora de început și de sfârșit.` };
      curate.push({ data: e.data, tip: "program", deLa: oraScurta(e.de), panaLa: oraScurta(e.pana), nota: String(e.nota ?? "").trim().slice(0, 120) || null });
    } else return { ok: false, eroare: "Tip de excepție invalid." };
  }
  await inContextPlatforma(async (tx) => {
    // Se păstrează excepțiile trecute (istoric); se înlocuiesc doar cele de azi încolo.
    await tx.delete(programariExceptii).where(sqlDataViitoare());
    if (curate.length) await tx.insert(programariExceptii).values(curate);
  });
  reimprospateaza();
  return { ok: true };
}

const sqlDataViitoare = () => sql`${programariExceptii.data} >= (current_date - 1)`;

export async function salveazaTipuriAction(tipuri: DateAdmin["tipuri"]): Promise<Rezultat> {
  await cerePlatformAdmin();
  if (!Array.isArray(tipuri) || tipuri.length > 20) return { ok: false, eroare: "Listă invalidă." };
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const curate: { id: string | undefined; titlu: string; descriere: string | null; durataMin: number; locatie: string | null; activ: boolean; ordine: number }[] = [];
  for (const [ordine, t] of tipuri.entries()) {
    const titlu = String(t?.titlu ?? "").trim().slice(0, 120);
    const durata = Math.round(Number(t?.durataMin));
    if (!titlu) return { ok: false, eroare: "Fiecare tip de întâlnire are nevoie de un titlu." };
    if (!Number.isFinite(durata) || durata < 10 || durata > 480) return { ok: false, eroare: `„${titlu}”: durata trebuie să fie între 10 și 480 de minute.` };
    curate.push({ id: UUID.test(String(t.id)) ? String(t.id) : undefined, titlu, descriere: String(t.descriere ?? "").trim().slice(0, 600) || null, durataMin: durata, locatie: String(t.locatie ?? "").trim().slice(0, 300) || null, activ: t.activ !== false, ordine });
  }
  await inContextPlatforma(async (tx) => {
    const existente = await tx.select({ id: programariTipuri.id }).from(programariTipuri);
    const pastrate = new Set(curate.map((c) => c.id).filter(Boolean));
    for (const e of existente) {
      // Un tip șters nu dispare din istoric: programările lui își păstrează titlul și durata (tip_id devine null).
      if (!pastrate.has(e.id)) await tx.delete(programariTipuri).where(sql`${programariTipuri.id} = ${e.id}`);
    }
    for (const c of curate) {
      if (c.id) await tx.update(programariTipuri).set({ titlu: c.titlu, descriere: c.descriere, durataMin: c.durataMin, locatie: c.locatie, activ: c.activ, ordine: c.ordine }).where(sql`${programariTipuri.id} = ${c.id}`);
      else await tx.insert(programariTipuri).values({ titlu: c.titlu, descriere: c.descriere, durataMin: c.durataMin, locatie: c.locatie, activ: c.activ, ordine: c.ordine });
    }
  });
  reimprospateaza();
  return { ok: true };
}

export async function schimbaStareProgramareAction(id: string, stare: string): Promise<Rezultat> {
  const email = await cerePlatformAdmin();
  if (stare !== "confirmata" && stare !== "anulata" && stare !== "efectuata") return { ok: false, eroare: "Stare invalidă." };
  const ok = await schimbaStareDeEchipa(String(id), stare, email);
  reimprospateaza();
  return ok ? { ok: true } : { ok: false, eroare: "Programarea nu a fost găsită." };
}

// ---------- programează un înscris (doar echipa platformei) ----------

export type InscrisPentruProgramare = {
  cheie: string;
  origine: "organizatie" | "lead";
  orgId: string | null;
  nume: string;
  email: string;
  telefon: string;
  organizatie: string;
  info: string;
  creatLa: string;
};

// „Înscrișii” pe care îi poți programa: organizațiile cu cont (persoana de contact = proprietarul contului) și lead-urile din formularul „Descoperă Alexandrit”.
export async function incarcaInscrisiAction(): Promise<InscrisPentruProgramare[]> {
  await cerePlatformAdmin();
  const [organizatii, leaduri] = await Promise.all([listeazaOrganizatiiAction(), listeazaLeaduriAction()]);
  const dinOrg: InscrisPentruProgramare[] = organizatii
    .filter((o) => o.proprietarEmail)
    .map((o) => ({
      cheie: `org:${o.id}`,
      origine: "organizatie" as const,
      orgId: o.id,
      nume: o.proprietarNume ?? "",
      email: o.proprietarEmail ?? "",
      telefon: o.telefon ?? "",
      organizatie: o.nume,
      info: `Cont în platformă · pachet ${o.package}`,
      creatLa: o.createdAt.toISOString(),
    }));
  const dinLead: InscrisPentruProgramare[] = leaduri.map((l) => ({
    cheie: `lead:${l.id}`,
    origine: "lead" as const,
    orgId: null,
    nume: l.nume,
    email: l.email,
    telefon: l.telefon ?? "",
    organizatie: l.organizatie,
    info: `Lead · ${ETICHETE_STARE_LEAD[l.stare] ?? l.stare}${l.areCont ? " · are cont" : ""}`,
    creatLa: l.creatLa,
  }));
  return [...dinOrg, ...dinLead];
}

// Zilele cu cel puțin o oră liberă, în luna curentă și în cea următoare (ora României), pentru tipul ales.
export async function zileLibereAction(tipId: string): Promise<string[]> {
  await cerePlatformAdmin();
  const [an, luna] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit" }).format(new Date()).split("-").map(Number) as [number, number];
  const urmatoarea: [number, number] = luna === 12 ? [an + 1, 1] : [an, luna + 1];
  const [a, b] = await Promise.all([zileDisponibile(String(tipId), an, luna), zileDisponibile(String(tipId), urmatoarea[0], urmatoarea[1])]);
  return [...new Set([...a, ...b])].sort();
}

export async function oreLibereAction(tipId: string, data: string): Promise<Slot[]> {
  await cerePlatformAdmin();
  return sloturiZi(String(tipId), String(data));
}

export type PersoanaProgramata = { nume: string; email: string; telefon: string; organizatie: string; mesaj: string };
export type RezultatProgramare = { ok: true; rand: RandProgramare; linkIntalnire: string | null; zoom: boolean; emailTrimis: boolean } | { ok: false; eroare: string; campuri?: Record<string, string> };

export async function programeazaInscrisAction(intrare: { tipId: string; startUtc: string; origine: "organizatie" | "lead"; orgId: string | null; persoana: PersoanaProgramata; linkIntalnire?: string }): Promise<RezultatProgramare> {
  await cerePlatformAdmin();
  const p = intrare?.persoana;
  const persoana = {
    nume: String(p?.nume ?? "").trim(),
    email: String(p?.email ?? "").trim(),
    telefon: String(p?.telefon ?? "").trim(),
    organizatie: String(p?.organizatie ?? "").trim(),
    mesaj: String(p?.mesaj ?? "").trim(),
  };
  const r = await programeazaDeEchipa({ tipId: String(intrare?.tipId ?? ""), startUtc: String(intrare?.startUtc ?? ""), persoana, orgId: intrare?.orgId ?? null, origine: intrare?.origine === "organizatie" ? "organizatie" : "lead", locatie: String(intrare?.linkIntalnire ?? "").trim() || null });
  reimprospateaza();
  if (!r.ok) return { ok: false, eroare: r.eroare, campuri: r.campuri };
  const rand = await randDupaToken(r.token);
  if (!rand) return { ok: false, eroare: "Programarea s-a salvat, dar nu am putut-o reciti. Reîncarcă pagina." };
  const link = r.locatie && /^https?:\/\//i.test(r.locatie.trim()) ? r.locatie.trim() : null;
  return { ok: true, rand, linkIntalnire: link, zoom: Boolean(link && /zoom\.(us|com)\//i.test(link)), emailTrimis: r.emailTrimis === true };
}
